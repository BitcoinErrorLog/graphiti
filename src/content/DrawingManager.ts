import { contentLogger as logger } from './logger';
import { compressCanvas, getRecommendedQuality, formatBytes } from '../utils/image-compression';
import { DRAWING_CONSTANTS, DRAWING_UI_CONSTANTS, MESSAGE_TYPES, UI_CONSTANTS } from '../utils/constants';
import { isHTMLInputElement } from '../utils/type-guards';

export class DrawingManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private toolbar: HTMLElement | null = null;
  private isDrawing = false;
  private isActive = false;
  private currentColor = DRAWING_CONSTANTS.DEFAULT_BRUSH_COLOR;
  private currentThickness = DRAWING_CONSTANTS.DEFAULT_BRUSH_THICKNESS;
  private lastX = 0;
  private lastY = 0;
  private isEraserMode = false;
  
  // History stack for undo/redo (max 50 states)
  private historyStack: string[] = [];
  private historyIndex = -1;
  private readonly MAX_HISTORY = 50;

  // Bound event handlers to prevent memory leaks
  private boundStartDrawing: (e: MouseEvent) => void;
  private boundDraw: (e: MouseEvent) => void;
  private boundStopDrawing: () => void;
  private boundCleanup: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;


  private readonly COLORS = DRAWING_CONSTANTS.DRAWING_COLORS;

  constructor() {
    logger.info('DrawingManager', 'Initializing drawing manager');
    
    // Bind event handlers once in constructor
    this.boundStartDrawing = this.startDrawing.bind(this);
    this.boundDraw = this.draw.bind(this);
    this.boundStopDrawing = this.stopDrawing.bind(this);
    this.boundCleanup = this.cleanup.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    
    this.init();
  }

  private messageListener: ((message: any, sender: any, sendResponse: any) => boolean) | null = null;

  private init() {
    logger.info('DrawingManager', 'Setting up message listeners');

    this.messageListener = (message, _sender, sendResponse) => {
      logger.debug('DrawingManager', 'Message received', { type: message.type });

      if (message.type === MESSAGE_TYPES.TOGGLE_DRAWING_MODE) {
        logger.info('DrawingManager', 'Toggle drawing mode requested');
        this.toggleDrawing();
        sendResponse({ success: true, active: this.isActive });
        return true;
      } else if (message.type === MESSAGE_TYPES.GET_DRAWING_STATUS) {
        sendResponse({ active: this.isActive });
        return true;
      }
      return false;
    };

    chrome.runtime.onMessage.addListener(this.messageListener);

    // Cleanup on page unload
    window.addEventListener('beforeunload', this.boundCleanup);

    logger.info('DrawingManager', 'Message listeners registered');
  }

  /**
   * Cleanup event listeners and resources
   */
  private cleanup(): void {
    logger.info('DrawingManager', 'Cleaning up');

    // Remove beforeunload listener
    window.removeEventListener('beforeunload', this.boundCleanup);

    // Remove message listener
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }

    // Remove canvas event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundStartDrawing);
      this.canvas.removeEventListener('mousemove', this.boundDraw);
      this.canvas.removeEventListener('mouseup', this.boundStopDrawing);
    }

    // Remove canvas and toolbar
    this.removeCanvas();
    this.removeToolbar();
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

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pubky-drawing-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: ${UI_CONSTANTS.Z_INDEX.CANVAS};
      cursor: crosshair;
      pointer-events: auto;
    `;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      logger.error('DrawingManager', 'Failed to get canvas context');
      return;
    }

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentThickness;
    this.ctx.lineCap = 'round';
    this.ctx.globalCompositeOperation = 'source-over';

    this.canvas.addEventListener('mousedown', this.boundStartDrawing);
    this.canvas.addEventListener('mousemove', this.boundDraw);
    this.canvas.addEventListener('mouseup', this.boundStopDrawing);
    this.canvas.addEventListener('mouseleave', this.boundStopDrawing);
    
    // Add keyboard listener for undo/redo
    window.addEventListener('keydown', this.boundKeyDown);
    
    // Save initial state
    this.saveState();

    logger.info('DrawingManager', 'Canvas created');
  }

  private removeCanvas() {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.boundStartDrawing);
    this.canvas.removeEventListener('mousemove', this.boundDraw);
    this.canvas.removeEventListener('mouseup', this.boundStopDrawing);
    this.canvas.removeEventListener('mouseleave', this.boundStopDrawing);
    
    // Remove keyboard listener
    window.removeEventListener('keydown', this.boundKeyDown);

    this.canvas.remove();
    this.canvas = null;
    this.ctx = null;
    
    // Clear history when canvas is removed
    this.historyStack = [];
    this.historyIndex = -1;

    logger.info('DrawingManager', 'Canvas removed');
  }

  private createToolbar() {
    if (this.toolbar) return;

    this.toolbar = document.createElement('div');
    this.toolbar.id = DRAWING_UI_CONSTANTS.TOOLBAR_ID;
    this.toolbar.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(17, 24, 39, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px;
      z-index: ${UI_CONSTANTS.Z_INDEX.TOOLBAR};
      width: 280px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
    `;

    this.toolbar.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 2px;">Graphiti Drawing</div>
          <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6);">Alt + D to toggle</div>
        </div>
        <button id="close-drawing" style="
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
          transition: background 0.2s ease;
        ">✕</button>
      </div>
      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Colors</div>
        <div id="${DRAWING_UI_CONSTANTS.COLOR_PALETTE_ID}" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
      </div>
      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Thickness</div>
        <input type="range" id="${DRAWING_UI_CONSTANTS.THICKNESS_SLIDER_ID}" min="1" max="20" value="${this.currentThickness}" style="width: 100%;">
      </div>
      <div style="margin-bottom: 16px;">
        <button id="toggle-eraser" style="
          width: 100%;
          padding: 10px;
          background: ${this.isEraserMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
          border: 1px solid ${this.isEraserMode ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.2)'};
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: ${this.isEraserMode ? '600' : '400'};
        ">${this.isEraserMode ? '🖊️ Switch to Brush' : '🧹 Eraser'}</button>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button id="undo-drawing" style="
          flex: 1;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-size: 12px;
        ">Undo</button>
        <button id="redo-drawing" style="
          flex: 1;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-size: 12px;
        ">Redo</button>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="clear-drawing" style="
          flex: 1;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          cursor: pointer;
        ">Clear</button>
        <button id="save-drawing" style="
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border: none;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-weight: 600;
        ">Save</button>
      </div>
    `;

    document.body.appendChild(this.toolbar);

    const palette = this.toolbar.querySelector(`#${DRAWING_UI_CONSTANTS.COLOR_PALETTE_ID}`);
    if (palette) {
      this.COLORS.forEach((color) => {
        const swatch = document.createElement('button');
        swatch.style.background = color;
        swatch.style.width = '32px';
        swatch.style.height = '32px';
        swatch.style.border = color === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none';
        swatch.style.borderRadius = '50%';
        swatch.style.cursor = 'pointer';
        swatch.style.outline = color === this.currentColor ? '3px solid rgba(255, 255, 255, 0.7)' : 'none';
        swatch.onclick = () => this.setColor(color);
        palette.appendChild(swatch);
      });
    }

    const slider = this.toolbar.querySelector(`#${DRAWING_UI_CONSTANTS.THICKNESS_SLIDER_ID}`);
    if (slider && isHTMLInputElement(slider)) {
      slider.oninput = (e) => {
        const target = e.target;
        if (isHTMLInputElement(target)) {
          this.setThickness(Number(target.value));
        }
      };
    }

    const closeButton = this.toolbar.querySelector('#close-drawing');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.toggleDrawing());
    }

    const toggleEraserButton = this.toolbar.querySelector('#toggle-eraser');
    if (toggleEraserButton) {
      toggleEraserButton.addEventListener('click', () => {
        this.isEraserMode = !this.isEraserMode;
        // Update button text and style
        if (toggleEraserButton instanceof HTMLButtonElement) {
          toggleEraserButton.textContent = this.isEraserMode ? '🖊️ Switch to Brush' : '🧹 Eraser';
          toggleEraserButton.style.background = this.isEraserMode 
            ? 'rgba(239, 68, 68, 0.3)' 
            : 'rgba(255, 255, 255, 0.1)';
          toggleEraserButton.style.borderColor = this.isEraserMode 
            ? 'rgba(239, 68, 68, 0.5)' 
            : 'rgba(255, 255, 255, 0.2)';
          toggleEraserButton.style.fontWeight = this.isEraserMode ? '600' : '400';
        }
        logger.debug('DrawingManager', 'Eraser mode toggled', { isEraserMode: this.isEraserMode });
      });
    }

    const undoButton = this.toolbar.querySelector('#undo-drawing');
    if (undoButton) {
      undoButton.addEventListener('click', () => this.undo());
    }

    const redoButton = this.toolbar.querySelector('#redo-drawing');
    if (redoButton) {
      redoButton.addEventListener('click', () => this.redo());
    }

    const clearButton = this.toolbar.querySelector('#clear-drawing');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearCanvas());
    }

    const saveButton = this.toolbar.querySelector('#save-drawing');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveDrawing());
    }
    
    // Initialize undo/redo button states
    this.updateUndoRedoButtons();

    logger.info('DrawingManager', 'Toolbar created');
  }

  private removeToolbar() {
    if (!this.toolbar) return;
    this.toolbar.remove();
    this.toolbar = null;
    logger.info('DrawingManager', 'Toolbar removed');
  }

  private startDrawing(event: MouseEvent) {
    if (!this.canvas) return;
    this.isDrawing = true;
    [this.lastX, this.lastY] = [event.offsetX, event.offsetY];
  }

  private draw(event: MouseEvent) {
    if (!this.isDrawing || !this.ctx || !this.canvas) return;

    if (this.isEraserMode) {
      // Eraser mode: use destination-out to erase
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.currentThickness;
    } else {
      // Normal drawing mode
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentThickness;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(event.offsetX, event.offsetY);
    this.ctx.stroke();

    [this.lastX, this.lastY] = [event.offsetX, event.offsetY];
  }

  private stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      // Save state after each stroke
      this.saveState();
    }
  }
  
  private handleKeyDown(event: KeyboardEvent) {
    if (!this.isActive) return;
    
    // Check for Ctrl+Z (undo) or Cmd+Z on Mac
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
      return;
    }
    
    // Check for Ctrl+Y (redo) or Cmd+Shift+Z on Mac
    if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
      event.preventDefault();
      this.redo();
      return;
    }
  }
  
  private saveState() {
    if (!this.canvas || !this.ctx) return;
    
    // Convert canvas to base64
    const state = this.canvas.toDataURL('image/png');
    
    // Remove any states after current index (when undoing and then drawing)
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }
    
    // Add new state
    this.historyStack.push(state);
    this.historyIndex = this.historyStack.length - 1;
    
    // Limit history size
    if (this.historyStack.length > this.MAX_HISTORY) {
      this.historyStack.shift();
      this.historyIndex--;
    }
    
    this.updateUndoRedoButtons();
  }
  
  private undo() {
    if (this.historyIndex <= 0 || !this.canvas || !this.ctx) return;
    
    this.historyIndex--;
    this.restoreState(this.historyStack[this.historyIndex]);
    this.updateUndoRedoButtons();
    logger.debug('DrawingManager', 'Undo performed', { historyIndex: this.historyIndex });
  }
  
  private redo() {
    if (this.historyIndex >= this.historyStack.length - 1 || !this.canvas || !this.ctx) return;
    
    this.historyIndex++;
    this.restoreState(this.historyStack[this.historyIndex]);
    this.updateUndoRedoButtons();
    logger.debug('DrawingManager', 'Redo performed', { historyIndex: this.historyIndex });
  }
  
  private restoreState(stateData: string) {
    if (!this.canvas || !this.ctx) return;
    
    const img = new Image();
    img.onload = () => {
      this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      this.ctx!.drawImage(img, 0, 0);
    };
    img.src = stateData;
  }
  
  private updateUndoRedoButtons() {
    if (!this.toolbar) return;
    
    const undoButton = this.toolbar.querySelector('#undo-drawing') as HTMLButtonElement;
    const redoButton = this.toolbar.querySelector('#redo-drawing') as HTMLButtonElement;
    
    if (undoButton) {
      undoButton.disabled = this.historyIndex <= 0;
      undoButton.style.opacity = this.historyIndex <= 0 ? '0.5' : '1';
    }
    
    if (redoButton) {
      redoButton.disabled = this.historyIndex >= this.historyStack.length - 1;
      redoButton.style.opacity = this.historyIndex >= this.historyStack.length - 1 ? '0.5' : '1';
    }
  }

  private setColor(color: string) {
    this.currentColor = color as typeof this.currentColor;
    logger.debug('DrawingManager', 'Color changed', { color });
  }

  private setThickness(thickness: number) {
    this.currentThickness = thickness as typeof this.currentThickness;
    logger.debug('DrawingManager', 'Thickness changed', { thickness });
  }

  private clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Clear history and save empty state
    this.historyStack = [];
    this.historyIndex = -1;
    this.saveState();
    this.updateUndoRedoButtons();
    logger.info('DrawingManager', 'Canvas cleared');
  }

  private async saveDrawing() {
    if (!this.canvas) {
      logger.warn('DrawingManager', 'No canvas to save');
      return;
    }

    try {
      // Check storage quota to determine compression quality
      const quotaCheck = await chrome.runtime.sendMessage({ type: 'GET_STORAGE_QUOTA' });
      const recommendedQuality = quotaCheck?.percentUsed 
        ? getRecommendedQuality(quotaCheck.percentUsed)
        : 0.75;

      // Compress using the new compression utility
      const compressionResult = await compressCanvas(this.canvas, {
        quality: recommendedQuality,
        format: 'webp', // Prefer WebP for better compression
        maxDimension: 4096, // Max 4K resolution
      });

      logger.info('DrawingManager', 'Drawing compressed', {
        format: compressionResult.format,
        originalSize: formatBytes(compressionResult.originalSize),
        compressedSize: formatBytes(compressionResult.compressedSize),
        compressionRatio: `${(compressionResult.compressionRatio * 100).toFixed(1)}%`,
      });
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url || window.location.href;

      chrome.runtime.sendMessage(
        {
          type: 'SAVE_DRAWING',
          drawing: {
            url,
            canvasData: compressionResult.dataUrl,
            timestamp: Date.now(),
          },
        },
        (response) => {
          if (response?.success) {
            logger.info('DrawingManager', 'Drawing saved successfully');
            
            // Show warning if storage is getting full
            if (quotaCheck?.percentUsed >= 75) {
              const message = quotaCheck.percentUsed >= 90
                ? `⚠️ Storage nearly full (${quotaCheck.percentUsed.toFixed(1)}%)! Consider deleting old drawings.`
                : `⚠️ Storage getting full (${quotaCheck.percentUsed.toFixed(1)}%). Monitor your usage.`;
              
              // Show a non-blocking notification
              console.warn('[Graphiti]', message);
            }
          } else {
            logger.warn('DrawingManager', 'Failed to save drawing', response?.error);
            
            // Show error if storage quota exceeded
            if (response?.error?.includes('quota')) {
              const quotaMessage = `Storage quota exceeded! Please delete some drawings to free up space. Used: ${quotaCheck?.usedMB?.toFixed(2) || '?'}MB / ${quotaCheck?.quotaMB?.toFixed(2) || '?'}MB`;
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.SHOW_TOAST,
                toastType: 'error',
                message: quotaMessage,
              }).catch(() => {
                // Fallback to console if message fails
                console.error('[Graphiti]', quotaMessage);
              });
            }
          }
        }
      );
    } catch (error) {
      logger.error('DrawingManager', 'Failed to save drawing', error as Error);
    }
  }

  private async loadDrawing() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url || window.location.href;

      chrome.runtime.sendMessage(
        {
          type: 'GET_DRAWING',
          url,
        },
        (response) => {
          if (response?.drawing && this.ctx && this.canvas) {
            const img = new Image();
            img.onload = () => {
              this.ctx?.drawImage(img, 0, 0);
              logger.info('DrawingManager', 'Drawing loaded successfully');
            };
            img.onerror = () => {
              logger.error('DrawingManager', 'Failed to load drawing image');
            };
            img.src = response.drawing.canvasData;
          } else {
            logger.debug('DrawingManager', 'No drawing available for this URL');
          }
        }
      );
    } catch (error) {
      logger.error('DrawingManager', 'Failed to load drawing', error as Error);
    }
  }
}

