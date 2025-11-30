import { contentLogger as logger } from './logger';

export class DrawingManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private toolbar: HTMLElement | null = null;
  private isDrawing = false;
  private isActive = false;
  private currentColor = '#FF6B6B';
  private currentThickness = 5;
  private lastX = 0;
  private lastY = 0;

  // Bound event handlers to prevent memory leaks
  private boundStartDrawing: (e: MouseEvent) => void;
  private boundDraw: (e: MouseEvent) => void;
  private boundStopDrawing: () => void;

  private readonly COLORS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#FFFFFF',
  ];

  constructor() {
    logger.info('DrawingManager', 'Initializing drawing manager');
    
    // Bind event handlers once in constructor
    this.boundStartDrawing = this.startDrawing.bind(this);
    this.boundDraw = this.draw.bind(this);
    this.boundStopDrawing = this.stopDrawing.bind(this);
    
    this.init();
  }

  private init() {
    logger.info('DrawingManager', 'Setting up message listeners');

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

    this.canvas.addEventListener('mousedown', this.boundStartDrawing);
    this.canvas.addEventListener('mousemove', this.boundDraw);
    this.canvas.addEventListener('mouseup', this.boundStopDrawing);
    this.canvas.addEventListener('mouseleave', this.boundStopDrawing);

    logger.info('DrawingManager', 'Canvas created');
  }

  private removeCanvas() {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.boundStartDrawing);
    this.canvas.removeEventListener('mousemove', this.boundDraw);
    this.canvas.removeEventListener('mouseup', this.boundStopDrawing);
    this.canvas.removeEventListener('mouseleave', this.boundStopDrawing);

    this.canvas.remove();
    this.canvas = null;
    this.ctx = null;

    logger.info('DrawingManager', 'Canvas removed');
  }

  private createToolbar() {
    if (this.toolbar) return;

    this.toolbar = document.createElement('div');
    this.toolbar.id = 'pubky-drawing-toolbar';
    this.toolbar.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(17, 24, 39, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px;
      z-index: 1000000;
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
        <div id="color-palette" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
      </div>
      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Thickness</div>
        <input type="range" id="thickness-slider" min="1" max="20" value="${this.currentThickness}" style="width: 100%;">
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

    const palette = this.toolbar.querySelector('#color-palette');
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

    const slider = this.toolbar.querySelector('#thickness-slider') as HTMLInputElement;
    if (slider) {
      slider.oninput = (e) => {
        const target = e.target as HTMLInputElement;
        this.setThickness(Number(target.value));
      };
    }

    const closeButton = this.toolbar.querySelector('#close-drawing');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.toggleDrawing());
    }

    const clearButton = this.toolbar.querySelector('#clear-drawing');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearCanvas());
    }

    const saveButton = this.toolbar.querySelector('#save-drawing');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveDrawing());
    }

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

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentThickness;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(event.offsetX, event.offsetY);
    this.ctx.stroke();

    [this.lastX, this.lastY] = [event.offsetX, event.offsetY];
  }

  private stopDrawing() {
    this.isDrawing = false;
  }

  private setColor(color: string) {
    this.currentColor = color;
    logger.debug('DrawingManager', 'Color changed', { color });
  }

  private setThickness(thickness: number) {
    this.currentThickness = thickness;
    logger.debug('DrawingManager', 'Thickness changed', { thickness });
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
      // Use JPEG format with quality 0.7 for better compression
      let dataUrl = this.canvas.toDataURL('image/jpeg', 0.7);
      
      // If still too large (>500KB), reduce quality further or resize
      const sizeInKB = (dataUrl.length * 3) / 4 / 1024;
      if (sizeInKB > 500) {
        logger.warn('DrawingManager', 'Drawing too large, compressing further', { sizeKB: sizeInKB });
        
        // Try with lower quality
        dataUrl = this.canvas.toDataURL('image/jpeg', 0.5);
        
        const newSizeInKB = (dataUrl.length * 3) / 4 / 1024;
        if (newSizeInKB > 500) {
          // Still too large, resize canvas
          const resizedDataUrl = await this.resizeAndCompress(this.canvas);
          if (resizedDataUrl) {
            dataUrl = resizedDataUrl;
          }
        }
      }
      
      const finalSizeInKB = (dataUrl.length * 3) / 4 / 1024;
      logger.info('DrawingManager', 'Drawing compressed', { finalSizeInKB });
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url || window.location.href;

      chrome.runtime.sendMessage(
        {
          type: 'SAVE_DRAWING',
          drawing: {
            url,
            canvasData: dataUrl,
            timestamp: Date.now(),
          },
        },
        (response) => {
          if (response?.success) {
            logger.info('DrawingManager', 'Drawing saved successfully');
          } else {
            logger.warn('DrawingManager', 'Failed to save drawing', response?.error);
          }
        }
      );
    } catch (error) {
      logger.error('DrawingManager', 'Failed to save drawing', error as Error);
    }
  }

  private async resizeAndCompress(canvas: HTMLCanvasElement): Promise<string | null> {
    try {
      // Create a smaller canvas (50% of original)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width / 2;
      tempCanvas.height = canvas.height / 2;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      
      // Draw resized image
      tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Export with medium quality
      return tempCanvas.toDataURL('image/jpeg', 0.6);
    } catch (error) {
      logger.error('DrawingManager', 'Failed to resize canvas', error as Error);
      return null;
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

