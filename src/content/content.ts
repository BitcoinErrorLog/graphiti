/**
 * @fileoverview Content script that runs on web pages to enable interactive features.
 * 
 * This file is the main content script that gets injected into web pages.
 * It contains several major components:
 * 
 * ## Architecture
 * 
 * The content script is organized into the following modules:
 * 
 * 1. **ContentLogger** (line ~6) - Inline logging utility for content script context
 * 2. **AnnotationManager** (line ~48) - Manages text highlighting and annotations
 *    - Selection handling
 *    - Highlight rendering
 *    - Comment dialogs
 *    - DOM path tracking for range reconstruction
 * 3. **DrawingManager** (line ~964) - Canvas-based graffiti/drawing overlay
 *    - Canvas creation and positioning
 *    - Drawing tools (pen, eraser)
 *    - Toolbar UI
 *    - Drawing persistence
 * 4. **PubkyURLHandler** (line ~1230) - Handles pubky:// URL conversion to clickable links
 *    - URL detection and linkification
 *    - MutationObserver for dynamic content
 * 
 * ## Why Not Split Into Separate Files?
 * 
 * Content scripts are bundled separately from the main extension.
 * While these could theoretically be split, keeping them together:
 * - Avoids complex bundler configuration for content scripts
 * - Ensures all dependencies are available at runtime
 * - Simplifies the build process
 * - Reduces risk of import/export issues in content script context
 * 
 * ## Communication
 * 
 * Uses chrome.runtime.sendMessage for background script communication.
 * Keyboard shortcuts: Alt+A (annotations), Alt+D (drawing), Alt+S (sidepanel)
 * 
 * @module content/content
 */

// =============================================================================
// SECTION 1: Logging Utility
// =============================================================================

// Inline logger to avoid import issues in content script
class ContentLogger {
  private logPrefix = '[Graphiti]';

  info(context: string, message: string, data?: any) {
    console.log(`${this.logPrefix} [INFO] ${context}: ${message}`, data || '');
  }

  warn(context: string, message: string, data?: any) {
    console.warn(`${this.logPrefix} [WARN] ${context}: ${message}`, data || '');
  }

  error(context: string, message: string, error?: Error | any) {
    console.error(`${this.logPrefix} [ERROR] ${context}: ${message}`, error || '');
  }

  debug(context: string, message: string, data?: any) {
    console.debug(`${this.logPrefix} [DEBUG] ${context}: ${message}`, data || '');
  }
}

const logger = new ContentLogger();

// =============================================================================
// SECTION 2: Annotation Manager
// =============================================================================

/**
 * Annotation data structure
 * Note: This interface is duplicated here because content scripts are bundled separately
 * and cannot import from utils/. Keep in sync with src/utils/annotations.ts
 */
interface Annotation {
  id: string;
  url: string;
  selectedText: string;
  comment: string;
  startPath: string;
  endPath: string;
  startOffset: number;
  endOffset: number;
  timestamp: number;
  author: string;
  postUri?: string;
  color: string;
}

class AnnotationManager {
  private annotations: Annotation[] = [];
  private highlightClass = 'pubky-highlight';
  private activeHighlightClass = 'pubky-highlight-active';
  private currentSelection: { range: Range; text: string } | null = null;

  constructor() {
    this.init();
  }

  private init() {
    logger.info('ContentScript', 'Initializing annotation manager');
    
    // Add styles for highlights
    this.injectStyles();
    
    // Listen for text selection
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    
    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Load existing annotations for this page
    this.loadAnnotations();
    
    // Listen for URL changes (for SPAs and navigation)
    this.observeUrlChanges();
    
    // Listen for DOM changes that might indicate page content loaded
    this.observeContentChanges();
    
    logger.info('ContentScript', 'Annotation manager initialized');
  }
  
  private observeUrlChanges() {
    // Watch for pushState/replaceState (used by SPAs)
    let lastUrl = location.href;
    
    const checkUrlChange = () => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        logger.info('ContentScript', 'URL changed, reloading annotations', { 
          from: lastUrl, 
          to: currentUrl 
        });
        lastUrl = currentUrl;
        
        // Clear existing highlights
        this.clearAllHighlights();
        
        // Reload annotations for new URL
        setTimeout(() => {
          this.loadAnnotations();
        }, 500); // Small delay to let content load
      }
    };
    
    // Check on various navigation events
    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('pushstate', checkUrlChange);
    window.addEventListener('replacestate', checkUrlChange);
    
    // Override history methods to detect SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      window.dispatchEvent(new Event('pushstate'));
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      window.dispatchEvent(new Event('replacestate'));
    };
  }
  
  private observeContentChanges() {
    // Watch for significant DOM changes that might indicate new content
    let contentChangeTimeout: number | null = null;
    
    const observer = new MutationObserver(() => {
      // Debounce: only reload annotations after content settles
      if (contentChangeTimeout) {
        clearTimeout(contentChangeTimeout);
      }
      
      contentChangeTimeout = window.setTimeout(() => {
        // Only reload if we have annotations but no highlights visible
        if (this.annotations.length > 0) {
          const visibleHighlights = document.querySelectorAll(`.${this.highlightClass}`).length;
          if (visibleHighlights === 0) {
            logger.info('ContentScript', 'Content changed, re-rendering highlights');
            this.annotations.forEach(annotation => {
              this.renderHighlight(annotation);
            });
          }
        }
      }, 1000) as unknown as number;
    });
    
    // Observe the body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  
  private clearAllHighlights() {
    // Remove all existing highlight elements
    document.querySelectorAll(`.${this.highlightClass}`).forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        // Unwrap the highlight, keeping the text
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .${this.highlightClass} {
        background-color: rgba(163, 230, 53, 0.25);
        cursor: pointer;
        position: relative;
        border-bottom: 2px solid rgba(132, 204, 22, 0.6);
        transition: background-color 0.2s ease;
        box-shadow: 0 0 0 1px rgba(163, 230, 53, 0.15);
      }
      
      .${this.highlightClass}:hover {
        background-color: rgba(163, 230, 53, 0.35);
        box-shadow: 0 0 0 1px rgba(163, 230, 53, 0.25);
      }
      
      .${this.activeHighlightClass} {
        background-color: rgba(163, 230, 53, 0.5);
        box-shadow: 0 0 0 2px rgba(132, 204, 22, 0.8);
      }
      
      .pubky-annotation-button {
        position: absolute;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: box-shadow 0.2s ease, opacity 0.2s ease;
        pointer-events: auto;
      }
      
      .pubky-annotation-button:hover {
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
        opacity: 0.95;
      }
      
      .pubky-annotation-button svg {
        width: 16px;
        height: 16px;
      }
      
      .pubky-annotation-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2B2B2B;
        border: 1px solid #3F3F3F;
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 500px;
        z-index: 10001;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      
      .pubky-annotation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        backdrop-filter: blur(4px);
      }
      
      .pubky-annotation-modal h3 {
        color: white;
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 8px 0;
      }
      
      .pubky-annotation-modal .selected-text {
        background: #1F1F1F;
        border-left: 3px solid #667eea;
        padding: 12px;
        margin: 12px 0;
        color: #E0E0E0;
        font-style: italic;
        border-radius: 4px;
        max-height: 100px;
        overflow-y: auto;
      }
      
      .pubky-annotation-modal textarea {
        width: 100%;
        min-height: 100px;
        background: #1F1F1F;
        border: 1px solid #3F3F3F;
        border-radius: 8px;
        padding: 12px;
        color: white;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        margin-bottom: 16px;
      }
      
      .pubky-annotation-modal textarea:focus {
        outline: none;
        border-color: #667eea;
      }
      
      .pubky-annotation-modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .pubky-annotation-modal button {
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pubky-annotation-modal .cancel-btn {
        background: #3F3F3F;
        color: white;
      }
      
      .pubky-annotation-modal .cancel-btn:hover {
        background: #4F4F4F;
      }
      
      .pubky-annotation-modal .submit-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .pubky-annotation-modal .submit-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      .pubky-annotation-modal .submit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  private handleTextSelection(event: MouseEvent) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      this.hideAnnotationButton();
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0 || selectedText.length > 1000) {
      return;
    }

    const range = selection.getRangeAt(0);
    this.currentSelection = { range, text: selectedText };

    // Show annotation button near selection
    this.showAnnotationButton(event.pageX, event.pageY);
  }

  private showAnnotationButton(x: number, y: number) {
    // Remove existing button
    this.hideAnnotationButton();

    const button = document.createElement('button');
    button.className = 'pubky-annotation-button';
    button.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
      Add Annotation
    `;
    // Position the button with some offset and account for button size
    button.style.left = `${x - 80}px`; // Center the button on cursor
    button.style.top = `${y + 10}px`; // Small offset below cursor
    
    // Prevent button from moving when user moves mouse
    button.onmousedown = (e) => {
      e.stopPropagation();
      this.showAnnotationModal();
    };
    
    document.body.appendChild(button);
  }

  private hideAnnotationButton() {
    const existing = document.querySelector('.pubky-annotation-button');
    if (existing) {
      existing.remove();
    }
  }

  private showAnnotationModal() {
    if (!this.currentSelection) return;

    this.hideAnnotationButton();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'pubky-annotation-overlay';
    overlay.onclick = () => this.hideAnnotationModal();

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'pubky-annotation-modal';
    modal.onclick = (e) => e.stopPropagation();

    modal.innerHTML = `
      <h3>Add Annotation</h3>
      <div class="selected-text">"${this.escapeHtml(this.currentSelection.text)}"</div>
      <textarea placeholder="Add your comment..." autofocus></textarea>
      <div class="pubky-annotation-modal-buttons">
        <button class="cancel-btn">Cancel</button>
        <button class="submit-btn">Post Annotation</button>
      </div>
    `;

    const textarea = modal.querySelector('textarea')!;
    const cancelBtn = modal.querySelector('.cancel-btn')!;
    const submitBtn = modal.querySelector('.submit-btn')!;

    cancelBtn.addEventListener('click', () => this.hideAnnotationModal());
    submitBtn.addEventListener('click', () => this.createAnnotation(textarea.value));

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Focus textarea
    setTimeout(() => textarea.focus(), 100);
  }

  private hideAnnotationModal() {
    const overlay = document.querySelector('.pubky-annotation-overlay');
    const modal = document.querySelector('.pubky-annotation-modal');
    if (overlay) overlay.remove();
    if (modal) modal.remove();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private async createAnnotation(comment: string) {
    if (!this.currentSelection || !comment.trim()) {
      this.hideAnnotationModal();
      return;
    }

    const submitBtn = document.querySelector('.submit-btn') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
    }

    try {
      const range = this.currentSelection.range;
      const { startPath, endPath, startOffset, endOffset } = this.getRangePosition(range);

      const annotation: Annotation = {
        id: this.generateId(),
        url: window.location.href,
        selectedText: this.currentSelection.text,
        comment: comment.trim(),
        startPath,
        endPath,
        startOffset,
        endOffset,
        timestamp: Date.now(),
        author: '', // Will be set by background script
        color: 'rgba(163, 230, 53, 0.25)',
      };

      // First save locally, then try to create Pubky post in background
      this.annotations.push(annotation);
      this.renderHighlight(annotation);
      this.hideAnnotationModal();
      
      // Send to background script to create Pubky post (async, don't block UI)
      chrome.runtime.sendMessage(
        {
          type: 'CREATE_ANNOTATION',
          annotation,
        },
        (response) => {
          if (response?.success) {
            annotation.postUri = response.postUri;
            annotation.author = response.author;
            logger.info('ContentScript', 'Annotation synced to Pubky', { id: annotation.id });
          } else {
            logger.warn('ContentScript', 'Failed to sync annotation to Pubky', response?.error);
            // Keep the local annotation but warn user
            console.warn('Annotation created locally but not synced to Pubky network. Make sure you are signed in.');
          }
        }
      );
    } catch (error) {
      logger.error('ContentScript', 'Failed to create annotation', error as Error);
      alert('Failed to create annotation');
      this.hideAnnotationModal();
    }

    this.currentSelection = null;
  }

  private getRangePosition(range: Range): {
    startPath: string;
    endPath: string;
    startOffset: number;
    endOffset: number;
  } {
    return {
      startPath: this.getNodePath(range.startContainer),
      endPath: this.getNodePath(range.endContainer),
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    };
  }

  private getNodePath(node: Node): string {
    const path: number[] = [];
    let current: Node | null = node;

    while (current && current !== document.body) {
      const parent: Node | null = current.parentNode;
      if (parent) {
        const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
        path.unshift(index);
      }
      current = parent;
    }

    return path.join('/');
  }

  private getNodeByPath(path: string): Node | null {
    const indices = path.split('/').map(Number);
    let current: Node = document.body;

    for (const index of indices) {
      if (index >= current.childNodes.length) {
        return null;
      }
      current = current.childNodes[index];
    }

    return current;
  }

  private renderHighlight(annotation: Annotation) {
    try {
      logger.debug('ContentScript', 'Attempting to render highlight', { 
        id: annotation.id,
        text: annotation.selectedText.substring(0, 30)
      });

      // Check if already highlighted
      const existing = document.querySelector(`[data-annotation-id="${annotation.id}"]`);
      if (existing) {
        logger.debug('ContentScript', 'Highlight already exists', { id: annotation.id });
        return;
      }

      const startNode = this.getNodeByPath(annotation.startPath);
      const endNode = this.getNodeByPath(annotation.endPath);

      if (!startNode || !endNode) {
        logger.warn('ContentScript', 'Could not find nodes for annotation', { 
          id: annotation.id,
          hasStartNode: !!startNode,
          hasEndNode: !!endNode
        });
        return;
      }

      // Validate that nodes are still in the document
      if (!document.body.contains(startNode) || !document.body.contains(endNode)) {
        logger.warn('ContentScript', 'Nodes not in document', { id: annotation.id });
        return;
      }

      const range = document.createRange();
      
      try {
        range.setStart(startNode, annotation.startOffset);
        range.setEnd(endNode, annotation.endOffset);
      } catch (rangeError) {
        logger.error('ContentScript', `Invalid range offsets: ${annotation.startPath} (${annotation.startOffset}) to ${annotation.endPath} (${annotation.endOffset})`, rangeError);
        return;
      }

      const span = document.createElement('span');
      span.className = this.highlightClass;
      span.dataset.annotationId = annotation.id;
      span.onclick = () => this.handleHighlightClick(annotation);

      try {
        range.surroundContents(span);
        logger.info('ContentScript', 'Highlight rendered successfully ✓', { id: annotation.id });
      } catch (error) {
        // If surroundContents fails (complex range), try alternative
        logger.warn('ContentScript', 'Primary method failed, trying alternative', {
          error: (error as Error).message,
          errorName: (error as Error).name
        });
        
        try {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
          logger.info('ContentScript', 'Highlight rendered with alt method ✓', { id: annotation.id });
        } catch (altError) {
          logger.error('ContentScript', `All render methods failed for annotation ${annotation.id}: ${annotation.selectedText.substring(0, 50)}`, altError);
        }
      }
    } catch (error) {
      logger.error('ContentScript', 'Failed to render highlight', error as Error);
    }
  }

  private handleHighlightClick(annotation: Annotation) {
    logger.info('ContentScript', 'Highlight clicked', { id: annotation.id });
    
    // Remove active class from all highlights
    document.querySelectorAll(`.${this.activeHighlightClass}`).forEach((el) => {
      el.classList.remove(this.activeHighlightClass);
    });

    // Add active class to clicked highlight
    const highlight = document.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (highlight) {
      highlight.classList.add(this.activeHighlightClass);
    }

    // Send message to open sidebar and show annotation
    chrome.runtime.sendMessage({
      type: 'SHOW_ANNOTATION',
      annotationId: annotation.id,
    });
  }

  private async loadAnnotations() {
    try {
      // Request annotations for this URL from background script
      chrome.runtime.sendMessage(
        {
          type: 'GET_ANNOTATIONS',
          url: window.location.href,
        },
        (response) => {
          if (response?.annotations) {
            this.annotations = response.annotations;
            logger.info('ContentScript', 'Annotations loaded', { count: this.annotations.length });
            
            // Render all highlights
            this.annotations.forEach((annotation) => {
              this.renderHighlight(annotation);
            });
          }
        }
      );
    } catch (error) {
      logger.error('ContentScript', 'Failed to load annotations', error as Error);
    }
  }

  private handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    if (message.type === 'HIGHLIGHT_ANNOTATION') {
      const annotation = this.annotations.find((a) => a.id === message.annotationId);
      if (annotation) {
        this.handleHighlightClick(annotation);
        
        // Scroll to highlight
        const highlight = document.querySelector(`[data-annotation-id="${annotation.id}"]`);
        if (highlight) {
          highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      sendResponse({ success: true });
    }
    return true;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// SECTION 4: Pubky URL Handler
// =============================================================================

/**
 * Pubky URL Click Handler
 * 
 * Intercepts clicks on pubky:// and pk:// URLs and opens them in the profile
 * renderer. Also linkifies pubky URLs found in page text content.
 * 
 * Features:
 * - Detects pubky:// and pk:// URLs in text content
 * - Converts them to clickable buttons
 * - Observes DOM for dynamically added content
 * - Opens URLs in the extension's profile renderer
 */
function initPubkyURLHandler() {
  logger.info('ContentScript', 'Initializing Pubky URL handler');

  // Inject styles for pubky links
  injectPubkyLinkStyles();

  // Find and linkify pubky URLs in text content
  linkifyPubkyURLs();

  // Observe DOM changes to linkify dynamically added content
  observeDOMForPubkyURLs();

  // Handle clicks on links
  document.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Check if clicked element is a pubky link button
    if (target.classList.contains('pubky-link-button') || target.closest('.pubky-link-button')) {
      const button = target.classList.contains('pubky-link-button') 
        ? target 
        : target.closest('.pubky-link-button');
      
      const url = button?.getAttribute('data-pubky-url');
      if (url) {
        logger.info('ContentScript', 'Pubky URL clicked', { url });
        event.preventDefault();
        event.stopPropagation();
        
        chrome.runtime.sendMessage({
          type: 'OPEN_PUBKY_PROFILE',
          url,
        });
        return;
      }
    }
    
    // Check if clicked element or its parent is a link
    let link: HTMLAnchorElement | null = null;
    if (target.tagName === 'A') {
      link = target as HTMLAnchorElement;
    } else if (target.closest('a')) {
      link = target.closest('a');
    }

    if (!link || !link.href) {
      return;
    }

    // Check if it's a pubky:// URL (with or without //)
    const url = link.href;
    if (url.startsWith('pubky://') || url.startsWith('pubky:')) {
      logger.info('ContentScript', 'Pubky URL clicked', { url });
      
      // Normalize URL to always have ://
      const normalizedUrl = url.replace(/^pubky:(?!\/\/)/, 'pubky://');
      
      // Prevent default navigation
      event.preventDefault();
      event.stopPropagation();

      // Send message to background script to open profile renderer
      chrome.runtime.sendMessage({
        type: 'OPEN_PUBKY_PROFILE',
        url: normalizedUrl,
      });
    }
  }, true); // Use capture phase to intercept before other handlers

  logger.info('ContentScript', 'Pubky URL handler initialized');
}

/**
 * Inject styles for pubky link buttons
 */
function injectPubkyLinkStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .pubky-link-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none !important;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: none;
      vertical-align: middle;
    }
    
    .pubky-link-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
    }
    
    .pubky-link-button:active {
      transform: translateY(0);
    }
    
    .pubky-link-icon {
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Find and linkify pubky URLs in the page
 */
function linkifyPubkyURLs() {
  // Regex to match pubky:// URLs (with or without the //)
  // Note: Only pubky, not pk
  const pubkyRegex = /\b(pubky:(?:\/\/)?[a-z0-9]+(?:\/[^\s]*)?)/gi;
  
  // Walk through text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script, style, and already processed nodes
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        // Skip certain element types
        const tagName = parent.tagName;
        if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip if already inside our custom button
        if (parent.classList.contains('pubky-link-button') || 
            parent.closest('.pubky-link-button')) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip if inside an anchor tag (already linked)
        if (parent.tagName === 'A' || parent.closest('a')) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip if inside button or other interactive elements
        if (tagName === 'BUTTON' || tagName === 'INPUT' || 
            tagName === 'TEXTAREA' || tagName === 'SELECT') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip if parent has data attribute marking it as processed
        if (parent.hasAttribute('data-pubky-linkified') || 
            parent.closest('[data-pubky-linkified]')) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Only process if contains pubky URL
        if (pubkyRegex.test(node.textContent || '')) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    }
  );

  const textNodes: Node[] = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  // Process each text node
  textNodes.forEach((textNode) => {
    const text = textNode.textContent || '';
    const parent = textNode.parentNode;
    if (!parent) return;
    
    const matches = text.matchAll(pubkyRegex);
    const fragments: Array<string | HTMLElement> = [];
    let lastIndex = 0;
    let hasMatches = false;

    for (const match of matches) {
      const url = match[0];
      const matchIndex = match.index || 0;
      hasMatches = true;

      // Add text before match
      if (matchIndex > lastIndex) {
        fragments.push(text.substring(lastIndex, matchIndex));
      }

      // Create clickable button
      const button = document.createElement('span');
      button.className = 'pubky-link-button';
      button.setAttribute('data-pubky-linkified', 'true');
      
      // Normalize URL to always have :// 
      const normalizedUrl = url.replace(/^pubky:(?!\/\/)/, 'pubky://');
      button.setAttribute('data-pubky-url', normalizedUrl);
      button.innerHTML = `
        <span class="pubky-link-icon">🔗</span>
        <span>${url.length > 30 ? url.substring(0, 30) + '...' : url}</span>
      `;
      fragments.push(button);

      lastIndex = matchIndex + url.length;
    }

    // Only process if we found matches
    if (!hasMatches) return;

    // Add remaining text
    if (lastIndex < text.length) {
      fragments.push(text.substring(lastIndex));
    }

    // Create a wrapper to mark as processed
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-pubky-linkified', 'true');
    wrapper.style.display = 'contents'; // Don't affect layout
    
    fragments.forEach((fragment) => {
      if (typeof fragment === 'string') {
        wrapper.appendChild(document.createTextNode(fragment));
      } else {
        wrapper.appendChild(fragment);
      }
    });
    
    // Replace text node with wrapper
    parent.replaceChild(wrapper, textNode);
  });
}

/**
 * Observe DOM changes to linkify dynamically added content
 */
function observeDOMForPubkyURLs() {
  let isProcessing = false;
  
  const observer = new MutationObserver((mutations) => {
    // Ignore mutations caused by our own linkification
    const isOurMutation = mutations.some(mutation => {
      // Check if any added nodes are our buttons or wrappers
      return Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          return element.classList.contains('pubky-link-button') ||
                 element.hasAttribute('data-pubky-linkified') ||
                 element.querySelector('.pubky-link-button') !== null;
        }
        return false;
      });
    });
    
    if (isOurMutation) {
      return; // Skip processing our own changes
    }
    
    // Debounce linkification
    if (!isProcessing) {
      clearTimeout((window as any).pubkyLinkifyTimeout);
      (window as any).pubkyLinkifyTimeout = setTimeout(() => {
        isProcessing = true;
        try {
          linkifyPubkyURLs();
        } finally {
          isProcessing = false;
        }
      }, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// =============================================================================
// SECTION 3: Drawing Manager
// =============================================================================

/**
 * Drawing Manager
 * Manages canvas-based graffiti drawing overlay on web pages.
 * 
 * Features:
 * - Full-page canvas overlay
 * - Drawing tools (pen, eraser)
 * - Color picker and stroke width
 * - Save/load drawings to Chrome storage
 * - Sync drawings to Pubky homeserver
 */
class DrawingManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private toolbar: HTMLElement | null = null;
  private isDrawing = false;
  private isActive = false;
  private currentColor = '#FF6B6B';
  private currentThickness = 5;
  private lastX = 0;
  private lastY = 0;

  private readonly COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Cyan
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#FFFFFF', // White
  ];

  constructor() {
    logger.info('DrawingManager', 'Initializing drawing manager');
    this.init();
  }

  private init() {
    logger.info('DrawingManager', 'Setting up message listeners');
    
    // Listen for toggle message from background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      logger.debug('DrawingManager', 'Message received', { type: message.type });
      
      if (message.type === 'TOGGLE_DRAWING_MODE') {
        logger.info('DrawingManager', 'Toggle drawing mode requested');
        this.toggleDrawing();
        sendResponse({ success: true, active: this.isActive });
        return true;
      } else if (message.type === 'GET_DRAWING_STATUS') {
        sendResponse({ active: this.isActive });
        return true;
      }
      return false;
    });

    logger.info('DrawingManager', 'Message listeners registered');
  }

  private async toggleDrawing() {
    this.isActive = !this.isActive;
    
    if (this.isActive) {
      logger.info('DrawingManager', 'Activating drawing mode');
      this.createCanvas();
      this.createToolbar();
      await this.loadDrawing();
    } else {
      logger.info('DrawingManager', 'Deactivating drawing mode');
      await this.saveDrawing();
      this.removeCanvas();
      this.removeToolbar();
    }
  }

  private createCanvas() {
    if (this.canvas) return;

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pubky-drawing-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      cursor: crosshair;
      pointer-events: auto;
    `;

    // Set canvas size to match viewport
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Get 2D context
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      logger.error('DrawingManager', 'Failed to get canvas context');
      return;
    }

    // Set up context properties
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Add event listeners
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Prevent scrolling while drawing is active
    document.body.style.overflow = 'hidden';

    document.body.appendChild(this.canvas);
    logger.info('DrawingManager', 'Canvas created');
  }

  private removeCanvas() {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
      document.body.style.overflow = '';
      logger.info('DrawingManager', 'Canvas removed');
    }
  }

  private createToolbar() {
    if (this.toolbar) return;

    this.toolbar = document.createElement('div');
    this.toolbar.id = 'pubky-drawing-toolbar';
    this.toolbar.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2B2B2B;
      border: 1px solid #3F3F3F;
      border-radius: 12px;
      padding: 16px;
      z-index: 1000000;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Color palette
    const colorSection = document.createElement('div');
    colorSection.style.cssText = 'margin-bottom: 12px;';
    
    const colorLabel = document.createElement('div');
    colorLabel.textContent = 'Color';
    colorLabel.style.cssText = 'color: white; font-size: 12px; font-weight: 600; margin-bottom: 8px;';
    colorSection.appendChild(colorLabel);

    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;';
    
    this.COLORS.forEach(color => {
      const colorBtn = document.createElement('button');
      colorBtn.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 2px solid ${color === this.currentColor ? '#667eea' : '#3F3F3F'};
        background: ${color};
        cursor: pointer;
        transition: border-color 0.2s ease;
      `;
      colorBtn.onclick = () => {
        this.currentColor = color;
        // Update all color buttons
        Array.from(colorGrid.children).forEach((btn, idx) => {
          (btn as HTMLElement).style.borderColor = 
            this.COLORS[idx] === color ? '#667eea' : '#3F3F3F';
        });
      };
      colorGrid.appendChild(colorBtn);
    });
    
    colorSection.appendChild(colorGrid);
    this.toolbar.appendChild(colorSection);

    // Thickness slider
    const thicknessSection = document.createElement('div');
    thicknessSection.style.cssText = 'margin-bottom: 12px;';
    
    const thicknessLabel = document.createElement('div');
    thicknessLabel.textContent = `Thickness: ${this.currentThickness}px`;
    thicknessLabel.style.cssText = 'color: white; font-size: 12px; font-weight: 600; margin-bottom: 8px;';
    thicknessSection.appendChild(thicknessLabel);

    const thicknessSlider = document.createElement('input');
    thicknessSlider.type = 'range';
    thicknessSlider.min = '2';
    thicknessSlider.max = '20';
    thicknessSlider.value = this.currentThickness.toString();
    thicknessSlider.style.cssText = 'width: 100%;';
    thicknessSlider.oninput = (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.currentThickness = parseInt(value);
      thicknessLabel.textContent = `Thickness: ${value}px`;
    };
    thicknessSection.appendChild(thicknessSlider);
    this.toolbar.appendChild(thicknessSection);

    // Buttons
    const buttonsSection = document.createElement('div');
    buttonsSection.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear All';
    clearBtn.style.cssText = `
      padding: 8px 12px;
      background: #3F3F3F;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    `;
    clearBtn.onmouseover = () => clearBtn.style.background = '#4F4F4F';
    clearBtn.onmouseout = () => clearBtn.style.background = '#3F3F3F';
    clearBtn.onclick = () => this.clearCanvas();
    buttonsSection.appendChild(clearBtn);

    // Save & Exit button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save & Exit';
    saveBtn.style.cssText = `
      padding: 8px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    saveBtn.onmouseover = () => saveBtn.style.transform = 'translateY(-1px)';
    saveBtn.onmouseout = () => saveBtn.style.transform = 'translateY(0)';
    saveBtn.onclick = async () => {
      await this.saveDrawing();
      this.toggleDrawing();
    };
    buttonsSection.appendChild(saveBtn);

    this.toolbar.appendChild(buttonsSection);
    document.body.appendChild(this.toolbar);
    logger.info('DrawingManager', 'Toolbar created');
  }

  private removeToolbar() {
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
      logger.info('DrawingManager', 'Toolbar removed');
    }
  }

  private handleMouseDown(e: MouseEvent) {
    this.isDrawing = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDrawing || !this.ctx) return;

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentThickness;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(e.clientX, e.clientY);
    this.ctx.stroke();

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  private handleMouseUp() {
    this.isDrawing = false;
  }

  private clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    logger.info('DrawingManager', 'Canvas cleared');
  }

  private async saveDrawing() {
    if (!this.canvas) {
      logger.warn('DrawingManager', 'No canvas to save');
      return;
    }

    try {
      // Convert canvas to base64 PNG
      const canvasData = this.canvas.toDataURL('image/png');

      // Send to background script to save
      chrome.runtime.sendMessage({
        type: 'SAVE_DRAWING',
        url: window.location.href,
        canvasData,
      }, (response) => {
        if (response?.success) {
          logger.info('DrawingManager', 'Drawing saved successfully');
        } else {
          logger.warn('DrawingManager', 'Failed to save drawing', response?.error);
        }
      });
    } catch (error) {
      logger.error('DrawingManager', 'Failed to save drawing', error as Error);
    }
  }

  private async loadDrawing() {
    if (!this.canvas || !this.ctx) {
      logger.debug('DrawingManager', 'No canvas available for loading');
      return;
    }

    try {
      // Request drawing from background script
      chrome.runtime.sendMessage({
        type: 'GET_DRAWING',
        url: window.location.href,
      }, (response) => {
        if (response?.drawing && this.ctx && this.canvas) {
          // Load image from base64 data
          const img = new Image();
          img.onload = () => {
            if (this.ctx && this.canvas) {
              this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
              this.ctx.drawImage(img, 0, 0);
              logger.info('DrawingManager', 'Drawing loaded successfully');
            }
          };
          img.onerror = () => {
            logger.error('DrawingManager', 'Failed to load drawing image');
          };
          img.src = response.drawing.canvasData;
        }
      });
    } catch (error) {
      logger.error('DrawingManager', 'Failed to load drawing', error as Error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AnnotationManager();
    new DrawingManager();
    initPubkyURLHandler();
  });
} else {
  new AnnotationManager();
  new DrawingManager();
  initPubkyURLHandler();
}
