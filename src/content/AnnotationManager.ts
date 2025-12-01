import { contentLogger as logger } from './logger';
// @ts-ignore - No type definitions available
import * as textQuote from 'dom-anchor-text-quote';

/**
 * Annotation data structure
 * Note: This interface is duplicated here because content scripts are bundled separately
 * and cannot import from utils/. Keep in sync with src/utils/annotations.ts
 */
export interface Annotation {
  id: string;
  url: string;
  selectedText: string;
  comment: string;
  // Text-quote anchoring (new format)
  prefix?: string;
  exact?: string;
  suffix?: string;
  // Legacy path-based anchoring (deprecated, for migration)
  startPath?: string;
  endPath?: string;
  startOffset?: number;
  endOffset?: number;
  timestamp: number;
  author: string;
  postUri?: string;
  color: string;
}

export class AnnotationManager {
  private annotations: Annotation[] = [];
  private highlightClass = 'pubky-highlight';
  private activeHighlightClass = 'pubky-highlight-active';
  private currentSelection: { range: Range; text: string } | null = null;

  constructor() {
    this.init();
  }

  private init() {
    logger.info('ContentScript', 'Initializing annotation manager');
    this.injectStyles();
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Delay initial annotation load to allow dynamic content to load (SPAs)
    // This is especially important for sites like pubky.app that load content asynchronously
    setTimeout(() => {
      this.loadAnnotations();
    }, 500);
    
    this.observeUrlChanges();
    this.observeContentChanges();
    logger.info('ContentScript', 'Annotation manager initialized');
  }

  private observeUrlChanges() {
    let lastUrl = location.href;

    const checkUrlChange = () => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        logger.info('ContentScript', 'URL changed, reloading annotations', {
          from: lastUrl,
          to: currentUrl,
        });
        lastUrl = currentUrl;
        this.clearAllHighlights();
        setTimeout(() => {
          this.loadAnnotations();
        }, 500);
      }
    };

    window.addEventListener('popstate', checkUrlChange);
    window.addEventListener('pushstate', checkUrlChange);
    window.addEventListener('replacestate', checkUrlChange);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      window.dispatchEvent(new Event('pushstate'));
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      window.dispatchEvent(new Event('replacestate'));
    };
  }

  private observeContentChanges() {
    let contentChangeTimeout: number | null = null;

    const observer = new MutationObserver(() => {
      if (contentChangeTimeout) {
        clearTimeout(contentChangeTimeout);
      }

      contentChangeTimeout = window.setTimeout(() => {
        if (this.annotations.length > 0) {
          const visibleHighlights = document.querySelectorAll(`.${this.highlightClass}`).length;
          // Re-render if we have fewer highlights than annotations (some failed to render)
          if (visibleHighlights < this.annotations.length) {
            logger.info('ContentScript', 'Content changed, re-rendering missing highlights', {
              annotations: this.annotations.length,
              visible: visibleHighlights
            });
            this.annotations.forEach(annotation => {
              this.renderHighlight(annotation);
            });
          }
        }
      }, 1000) as unknown as number;
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private clearAllHighlights() {
    document.querySelectorAll(`.${this.highlightClass}`).forEach(el => {
      const parent = el.parentNode;
      if (parent) {
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
    this.showAnnotationButton(event.pageX, event.pageY);
  }

  private showAnnotationButton(x: number, y: number) {
    this.hideAnnotationButton();

    const button = document.createElement('button');
    button.className = 'pubky-annotation-button';
    button.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
      Add Annotation
    `;
    button.style.left = `${x - 80}px`;
    button.style.top = `${y + 10}px`;
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

    const overlay = document.createElement('div');
    overlay.className = 'pubky-annotation-overlay';
    overlay.onclick = () => this.hideAnnotationModal();

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
      const { prefix, exact, suffix } = this.getRangePosition(range);

      const annotation: Annotation = {
        id: this.generateId(),
        url: window.location.href,
        selectedText: this.currentSelection.text,
        comment: comment.trim(),
        prefix,
        exact,
        suffix,
        timestamp: Date.now(),
        author: '',
        color: 'rgba(163, 230, 53, 0.25)',
      };

      this.annotations.push(annotation);
      this.renderHighlight(annotation);
      this.hideAnnotationModal();

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
    prefix: string;
    exact: string;
    suffix: string;
  } {
    try {
      // Use text-quote anchoring library to create robust anchors
      // API: fromRange(root, range) returns { exact, prefix, suffix }
      const selector = textQuote.fromRange(document.body, range);
      return {
        prefix: selector.prefix || '',
        exact: selector.exact,
        suffix: selector.suffix || '',
      };
    } catch (error) {
      logger.error('ContentScript', 'Failed to create text quote anchor', error as Error);
      // Fallback: just use the selected text
      return {
        prefix: '',
        exact: range.toString(),
        suffix: '',
      };
    }
  }

  private renderHighlight(annotation: Annotation) {
    try {
      logger.debug('ContentScript', 'Attempting to render highlight', {
        id: annotation.id,
        text: annotation.selectedText.substring(0, 30),
      });

      const existing = document.querySelector(`[data-annotation-id="${annotation.id}"]`);
      if (existing) {
        logger.debug('ContentScript', 'Highlight already exists', { id: annotation.id });
        return;
      }

      // Try new text-quote format first
      if (annotation.prefix !== undefined && annotation.exact !== undefined && annotation.suffix !== undefined) {
        try {
          // First try with full context (prefix + exact + suffix)
          let range = textQuote.toRange(document.body, {
            prefix: annotation.prefix,
            exact: annotation.exact,
            suffix: annotation.suffix,
          });

          // If not found, try with just the exact text (no prefix/suffix)
          // This helps when surrounding context has changed
          if (!range && annotation.exact) {
            logger.debug('ContentScript', 'Retrying without prefix/suffix context', { id: annotation.id });
            range = textQuote.toRange(document.body, {
              prefix: '',
              exact: annotation.exact,
              suffix: '',
            });
          }

          // If still not found and selectedText differs from exact, try with selectedText
          if (!range && annotation.selectedText && annotation.selectedText !== annotation.exact) {
            logger.debug('ContentScript', 'Retrying with selectedText', { id: annotation.id });
            range = textQuote.toRange(document.body, {
              prefix: '',
              exact: annotation.selectedText,
              suffix: '',
            });
          }

          // textQuote.toRange() returns null if text not found
          if (!range) {
            // Log more details for debugging
            const pageText = document.body.textContent || '';
            const exactInPage = pageText.includes(annotation.exact || '');
            const selectedInPage = pageText.includes(annotation.selectedText || '');
            logger.warn('ContentScript', 'Text not found on page for annotation', { 
              id: annotation.id, 
              exact: annotation.exact?.substring(0, 50),
              selectedText: annotation.selectedText?.substring(0, 50),
              exactExistsInPageText: exactInPage,
              selectedExistsInPageText: selectedInPage,
              prefix: annotation.prefix?.substring(0, 20),
              suffix: annotation.suffix?.substring(0, 20),
            });
            return;
          }

          const span = document.createElement('span');
          span.className = this.highlightClass;
          span.dataset.annotationId = annotation.id;
          span.onclick = () => this.handleHighlightClick(annotation);

          try {
            range.surroundContents(span);
            logger.info('ContentScript', 'Highlight rendered successfully with text-quote ✓', { id: annotation.id });
            return;
          } catch (error) {
            // Try alternative method for complex DOM structures
            try {
              const contents = range.extractContents();
              span.appendChild(contents);
              range.insertNode(span);
              logger.info('ContentScript', 'Highlight rendered with alt method ✓', { id: annotation.id });
              return;
            } catch (altError) {
              logger.warn('ContentScript', 'Alt highlight method also failed', { id: annotation.id });
            }
          }
        } catch (error) {
          logger.warn('ContentScript', 'Text-quote anchoring failed, trying legacy format', error);
        }
      }

      // Fallback to legacy path-based format (for migration)
      if (annotation.startPath && annotation.endPath && 
          annotation.startOffset !== undefined && annotation.endOffset !== undefined) {
        logger.info('ContentScript', 'Attempting legacy path-based rendering', { id: annotation.id });
        const startNode = this.getNodeByPathLegacy(annotation.startPath);
        const endNode = this.getNodeByPathLegacy(annotation.endPath);

        if (!startNode || !endNode || !document.body.contains(startNode) || !document.body.contains(endNode)) {
          logger.warn('ContentScript', 'Legacy format failed - nodes not found', { id: annotation.id });
          return;
        }

        const range = document.createRange();
        try {
          range.setStart(startNode, annotation.startOffset);
          range.setEnd(endNode, annotation.endOffset);

          const span = document.createElement('span');
          span.className = this.highlightClass;
          span.dataset.annotationId = annotation.id;
          span.onclick = () => this.handleHighlightClick(annotation);

          try {
            range.surroundContents(span);
            logger.info('ContentScript', 'Legacy highlight rendered ✓', { id: annotation.id });
            
            // Migrate to new format
            this.migrateAnnotationToTextQuote(annotation, range);
          } catch (error) {
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            logger.info('ContentScript', 'Legacy highlight rendered with alt method ✓', { id: annotation.id });
            
            // Migrate to new format
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            this.migrateAnnotationToTextQuote(annotation, newRange);
          }
        } catch (rangeError) {
          logger.error('ContentScript', 'Invalid range offsets', rangeError);
        }
      } else {
        logger.warn('ContentScript', 'Annotation has neither new nor legacy format', { id: annotation.id });
      }
    } catch (error) {
      logger.error('ContentScript', 'Failed to render highlight', error as Error);
    }
  }

  /**
   * Migrate legacy path-based annotation to text-quote format
   */
  private migrateAnnotationToTextQuote(annotation: Annotation, range: Range) {
    try {
      const { prefix, exact, suffix } = this.getRangePosition(range);
      annotation.prefix = prefix;
      annotation.exact = exact;
      annotation.suffix = suffix;
      
      // Save updated annotation
      chrome.runtime.sendMessage({
        type: 'CREATE_ANNOTATION',
        annotation,
      });
      
      logger.info('ContentScript', 'Annotation migrated to text-quote format', { id: annotation.id });
    } catch (error) {
      logger.error('ContentScript', 'Failed to migrate annotation', error as Error);
    }
  }

  /**
   * Legacy method for path-based node lookup (for migration only)
   */
  private getNodeByPathLegacy(path: string): Node | null {
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

  private handleHighlightClick(annotation: Annotation) {
    logger.info('ContentScript', 'Highlight clicked', { id: annotation.id });

    document.querySelectorAll(`.${this.activeHighlightClass}`).forEach((el) => {
      el.classList.remove(this.activeHighlightClass);
    });

    const highlight = document.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (highlight) {
      highlight.classList.add(this.activeHighlightClass);
    }

    chrome.runtime.sendMessage({
      type: 'SHOW_ANNOTATION',
      annotationId: annotation.id,
    });
  }

  private async loadAnnotations() {
    try {
      chrome.runtime.sendMessage(
        {
          type: 'GET_ANNOTATIONS',
          url: window.location.href,
        },
        (response) => {
          if (response?.annotations) {
            this.annotations = response.annotations;
            logger.info('ContentScript', 'Annotations loaded', { count: this.annotations.length });
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

