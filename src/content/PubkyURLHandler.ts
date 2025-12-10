import { contentLogger as logger } from './logger';

export class PubkyURLHandler {
  constructor() {
    this.init();
  }

  private init() {
    logger.info('ContentScript', 'Initializing Pubky URL handler');
    this.injectStyles();
    this.linkifyPubkyURLs();
    this.observeDOMForPubkyURLs();
    document.addEventListener('click', this.handleClick, true);
    logger.info('ContentScript', 'Pubky URL handler initialized');
  }

  private handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (target.classList.contains('pubky-link-button') || target.closest('.pubky-link-button')) {
      const button = target.classList.contains('pubky-link-button') ? target : target.closest('.pubky-link-button');
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

    let link: HTMLAnchorElement | null = null;
    if (target.tagName === 'A') {
      link = target as HTMLAnchorElement;
    } else if (target.closest('a')) {
      link = target.closest('a');
    }

    if (!link || !link.href) {
      return;
    }

    const url = link.href;
    if (url.startsWith('pubky://') || url.startsWith('pubky:')) {
      logger.info('ContentScript', 'Pubky URL clicked', { url });
      const normalizedUrl = url.replace(/^pubky:(?!\/\/)/, 'pubky://');
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({
        type: 'OPEN_PUBKY_PROFILE',
        url: normalizedUrl,
      });
    }
  };

  private injectStyles() {
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

  private linkifyPubkyURLs() {
    const pubkyRegex = /\b(pubky:(?:\/\/)?[a-z0-9]+(?:\/[^\s]*)?)/gi;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const tagName = parent.tagName;
          if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.classList.contains('pubky-link-button') || parent.closest('.pubky-link-button')) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.tagName === 'A' || parent.closest('a')) {
            return NodeFilter.FILTER_REJECT;
          }

          if (tagName === 'BUTTON' || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.hasAttribute('data-pubky-linkified') || parent.closest('[data-pubky-linkified]')) {
            return NodeFilter.FILTER_REJECT;
          }

          if (pubkyRegex.test(node.textContent || '')) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        },
      }
    );

    const textNodes: Node[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

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

        if (matchIndex > lastIndex) {
          fragments.push(text.substring(lastIndex, matchIndex));
        }

        const button = document.createElement('span');
        button.className = 'pubky-link-button';
        button.setAttribute('data-pubky-linkified', 'true');

        const normalizedUrl = url.replace(/^pubky:(?!\/\/)/, 'pubky://');
        button.setAttribute('data-pubky-url', normalizedUrl);
        button.innerHTML = `
        <span class="pubky-link-icon">🔗</span>
        <span>${url.length > 30 ? url.substring(0, 30) + '...' : url}</span>
      `;
        fragments.push(button);

        lastIndex = matchIndex + url.length;
      }

      if (!hasMatches) return;

      if (lastIndex < text.length) {
        fragments.push(text.substring(lastIndex));
      }

      const wrapper = document.createElement('span');
      wrapper.setAttribute('data-pubky-linkified', 'true');
      wrapper.style.display = 'contents';

      fragments.forEach((fragment) => {
        if (typeof fragment === 'string') {
          wrapper.appendChild(document.createTextNode(fragment));
        } else {
          wrapper.appendChild(fragment);
        }
      });

      parent.replaceChild(wrapper, textNode);
    });
  }

  private observeDOMForPubkyURLs() {
    let isProcessing = false;

    const observer = new MutationObserver((mutations) => {
      const isOurMutation = mutations.some(mutation => {
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
        return;
      }

      if (!isProcessing) {
        clearTimeout((window as any).pubkyLinkifyTimeout);
        (window as any).pubkyLinkifyTimeout = setTimeout(() => {
          isProcessing = true;
          try {
            this.linkifyPubkyURLs();
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
}

