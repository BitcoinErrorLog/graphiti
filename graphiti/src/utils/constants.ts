/**
 * @fileoverview Centralized constants for the extension.
 * 
 * Contains all magic numbers, strings, and configuration values
 * used throughout the codebase for easy maintenance and consistency.
 * 
 * @module utils/constants
 */

/**
 * Drawing defaults
 */
export const DRAWING_CONSTANTS = {
  /** Default brush thickness */
  DEFAULT_BRUSH_THICKNESS: 5,
  
  /** Default brush color */
  DEFAULT_BRUSH_COLOR: '#FF6B6B',
  
  /** Available drawing colors */
  DRAWING_COLORS: [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#FFFFFF',
  ] as const,
  
  /** Canvas z-index */
  CANVAS_Z_INDEX: 999999,
  
  /** Toolbar z-index */
  TOOLBAR_Z_INDEX: 999998,
} as const;

/**
 * Timing constants (in milliseconds)
 */
export const TIMING_CONSTANTS = {
  /** Delay before initial annotation load (for SPAs) */
  ANNOTATION_LOAD_DELAY: 500,
  
  /** Delay before re-rendering highlights after content change */
  HIGHLIGHT_RERENDER_DELAY: 1000,
  
  /** Delay before highlighting annotation after navigation */
  ANNOTATION_HIGHLIGHT_DELAY: 500,
  
  /** Sync alarm interval (15 minutes) */
  SYNC_ALARM_INTERVAL_MINUTES: 15,
  
  /** Offscreen document initialization delay */
  OFFSCREEN_INIT_DELAY: 500,
  
  /** Retry initial delay */
  RETRY_INITIAL_DELAY: 1000,
  
  /** Retry max delay */
  RETRY_MAX_DELAY: 10000,
  
  /** Default retry attempts */
  RETRY_MAX_ATTEMPTS: 3,
  
  /** Rate limiter timeout */
  RATE_LIMITER_TIMEOUT: 5000,
  
  /** Profile cache TTL (1 hour) */
  PROFILE_CACHE_TTL: 3600000,
} as const;

/**
 * Storage constants
 */
export const STORAGE_CONSTANTS = {
  /** Chrome storage quota bytes (5MB default) */
  STORAGE_QUOTA_BYTES: 5242880,
  
  /** Storage warning threshold (75%) */
  STORAGE_WARNING_THRESHOLD: 75,
  
  /** Storage critical threshold (90%) */
  STORAGE_CRITICAL_THRESHOLD: 90,
  
  /** Storage keys */
  KEYS: {
    SESSION: 'session',
    BOOKMARKS: 'bookmarks',
    TAGS: 'tags',
    PROFILE: 'profile',
    DRAWINGS: 'pubky_drawings',
    ANNOTATIONS: 'pubky_annotations',
    SETTINGS: 'settings',
    DEBUG_LOGS: 'debugLogs',
  } as const,
} as const;

/**
 * API rate limiting constants
 */
export const RATE_LIMIT_CONSTANTS = {
  /** Nexus API: 30 requests per second */
  NEXUS: {
    MAX_TOKENS: 30,
    REFILL_RATE: 30,
  },
  
  /** Pubky homeserver: 10 requests per second */
  PUBKY: {
    MAX_TOKENS: 10,
    REFILL_RATE: 10,
  },
} as const;

/**
 * Image compression constants
 */
export const IMAGE_COMPRESSION_CONSTANTS = {
  /** Default compression quality (0.0 to 1.0) */
  DEFAULT_QUALITY: 0.75,
  
  /** Maximum canvas dimension (4K) */
  MAX_DIMENSION: 4096,
  
  /** Preferred format */
  PREFERRED_FORMAT: 'webp' as const,
  
  /** Fallback format */
  FALLBACK_FORMAT: 'jpeg' as const,
  
  /** Quality levels based on storage usage */
  QUALITY_LEVELS: {
    LOW_USAGE: 0.75,      // < 50% used
    MEDIUM_USAGE: 0.7,    // 50-75% used
    HIGH_USAGE: 0.6,      // 75-90% used
    CRITICAL_USAGE: 0.5,  // >= 90% used
  } as const,
} as const;

/**
 * UI constants
 */
export const UI_CONSTANTS = {
  /** Popup dimensions */
  POPUP: {
    WIDTH: 400,
    MIN_HEIGHT: 500,
  },
  
  /** Sidepanel dimensions */
  SIDEPANEL: {
    DEFAULT_WIDTH: 400,
  },
  
  /** Icon sizes */
  ICON_SIZES: {
    SMALL: 16,
    MEDIUM: 24,
    LARGE: 48,
  },
  
  /** Spinner sizes */
  SPINNER_SIZES: {
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 12,
  },
  
  /** Animation durations (ms) */
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  
  /** Z-index values for UI elements */
  Z_INDEX: {
    /** Canvas overlay z-index */
    CANVAS: 999999,
    /** Toolbar z-index (above canvas) */
    TOOLBAR: 1000000,
    /** Annotation button z-index */
    ANNOTATION_BUTTON: 10000,
    /** Annotation modal z-index */
    ANNOTATION_MODAL: 10001,
    /** Annotation overlay z-index */
    ANNOTATION_OVERLAY: 10000,
    /** Toast notifications z-index */
    TOAST: 50,
  },
  
  /** UI delays and timeouts (ms) */
  DELAYS: {
    /** Side panel switch delay */
    SIDE_PANEL_SWITCH: 500,
    /** Content mutation debounce delay */
    CONTENT_MUTATION_DEBOUNCE: 1000,
    /** Profile copy button reset delay */
    PROFILE_COPY_RESET: 2000,
  },
} as const;

/**
 * Path constants for Pubky storage
 */
export const PUBKY_PATHS = {
  /** Base path for app data */
  APP_BASE: '/pub/graphiti.dev',
  
  /** Drawings path */
  DRAWINGS: '/pub/graphiti.dev/drawings',
  
  /** Annotations path (via posts) */
  ANNOTATIONS: '/pub/pubky.app/posts',
  
  /** Profile path */
  PROFILE: '/pub/pubky.app/profile.json',
  
  /** Index HTML path */
  INDEX_HTML: '/pub/pubky.app/index.html',
} as const;

/**
 * URL constants
 */
export const URL_CONSTANTS = {
  /** Allowed URL protocols */
  ALLOWED_PROTOCOLS: ['http:', 'https:', 'pubky:'] as const,
  
  /** Pubky relay URL */
  PUBKY_RELAY: 'https://httprelay.pubky.app/link/',
  
  /** Nexus API base URL */
  NEXUS_API: 'https://nexus.pubky.app',
} as const;

/**
 * Annotation constants
 */
export const ANNOTATION_CONSTANTS = {
  /** Highlight CSS class */
  HIGHLIGHT_CLASS: 'pubky-highlight',
  
  /** Active highlight CSS class */
  ACTIVE_HIGHLIGHT_CLASS: 'pubky-highlight-active',
  
  /** Default highlight color */
  DEFAULT_HIGHLIGHT_COLOR: 'rgba(163, 230, 53, 0.25)',
  
  /** Annotation button class */
  BUTTON_CLASS: 'pubky-annotation-button',
  
  /** Annotation modal class */
  MODAL_CLASS: 'pubky-annotation-modal',
  
  /** Annotation overlay class */
  OVERLAY_CLASS: 'pubky-annotation-overlay',
} as const;

/**
 * Drawing constants
 */
export const DRAWING_UI_CONSTANTS = {
  /** Canvas ID */
  CANVAS_ID: 'pubky-drawing-canvas',
  
  /** Toolbar ID */
  TOOLBAR_ID: 'pubky-drawing-toolbar',
  
  /** Color palette ID */
  COLOR_PALETTE_ID: 'color-palette',
  
  /** Thickness slider ID */
  THICKNESS_SLIDER_ID: 'thickness-slider',
} as const;

/**
 * Message types for Chrome runtime messaging
 */
export const MESSAGE_TYPES = {
  // Annotation messages
  CREATE_ANNOTATION: 'CREATE_ANNOTATION',
  GET_ANNOTATIONS: 'GET_ANNOTATIONS',
  SHOW_ANNOTATION: 'SHOW_ANNOTATION',
  HIGHLIGHT_ANNOTATION: 'HIGHLIGHT_ANNOTATION',
  
  // Drawing messages
  SAVE_DRAWING: 'SAVE_DRAWING',
  GET_DRAWING: 'GET_DRAWING',
  TOGGLE_DRAWING_MODE: 'TOGGLE_DRAWING_MODE',
  GET_DRAWING_STATUS: 'GET_DRAWING_STATUS',
  
  // Sync messages
  GET_SYNC_STATUS: 'GET_SYNC_STATUS',
  SYNC_ALL_PENDING: 'SYNC_ALL_PENDING',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  SYNC_FAILED: 'SYNC_FAILED',
  
  // UI messages
  OPEN_SIDE_PANEL: 'OPEN_SIDE_PANEL',
  SCROLL_TO_ANNOTATION: 'SCROLL_TO_ANNOTATION',
  SWITCH_TO_ANNOTATIONS: 'SWITCH_TO_ANNOTATIONS',
  
  // Storage messages
  GET_STORAGE_QUOTA: 'GET_STORAGE_QUOTA',
  
  // Profile messages
  OPEN_PUBKY_PROFILE: 'OPEN_PUBKY_PROFILE',
  
  // Offscreen messages
  OFFSCREEN_CREATE_ANNOTATION_POST: 'OFFSCREEN_CREATE_ANNOTATION_POST',
  OFFSCREEN_SYNC_DRAWING: 'OFFSCREEN_SYNC_DRAWING',
  OFFSCREEN_SYNC_ALL_PENDING: 'OFFSCREEN_SYNC_ALL_PENDING',
  
  // Toast messages
  SHOW_TOAST: 'SHOW_TOAST',
} as const;

/**
 * Alarm names
 */
export const ALARM_NAMES = {
  SYNC_PENDING_CONTENT: 'sync-pending-content',
} as const;

/**
 * Keyboard command names
 */
export const COMMAND_NAMES = {
  TOGGLE_SIDEPANEL: 'toggle-sidepanel',
  OPEN_ANNOTATIONS: 'open-annotations',
  TOGGLE_DRAWING: 'toggle-drawing',
} as const;

/**
 * Log buffer constants
 */
export const LOG_CONSTANTS = {
  /** Maximum log buffer size */
  MAX_BUFFER_SIZE: 1000,
  
  /** Log levels */
  LEVELS: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  } as const,
} as const;

