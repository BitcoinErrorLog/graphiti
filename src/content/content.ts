import { contentLogger as logger } from './logger';
import { AnnotationManager } from './AnnotationManager';
import { DrawingManager } from './DrawingManager';
import { PubkyURLHandler } from './PubkyURLHandler';

// Initialize error capture for content script
// Use dynamic import to avoid bundling issues in content script
// Wrap in try-catch to prevent errors from breaking content script
// Note: This must be inside the function to avoid top-level await issues
try {
  // Use setTimeout to defer execution and avoid blocking initialization
  setTimeout(() => {
    import('../utils/error-capture').then(() => {
      logger.info('ContentScript', 'Error capture initialized');
    }).catch(() => {
      // Error capture not available, continue anyway
    });
  }, 0);
} catch (e) {
  // Ignore import errors
}

/**
 * @fileoverview Content script bootstrapper that wires together the interactive
 * experiences for annotations, drawings, and Pubky links.
 *
 * The heavy logic lives in dedicated modules:
 * - {@link AnnotationManager} handles selection tracking, modal UX, and highlight rendering.
 * - {@link DrawingManager} powers the graffiti canvas overlay and persistence.
 * - {@link PubkyURLHandler} linkifies `pubky://` URLs and routes clicks to the extension.
 */

const initializeContentScript = () => {
  logger.info('ContentScript', 'Bootstrapping managers');
  
  // Mark that content script has loaded (for testing)
  (window as any).__graphitiContentScriptLoaded = true;
  
  new AnnotationManager();
  new DrawingManager();
  new PubkyURLHandler();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

