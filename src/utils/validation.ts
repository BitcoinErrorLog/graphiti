/**
 * @fileoverview Centralized input validation utilities.
 * 
 * This module provides validation functions for all user inputs:
 * - URLs (format, length, protocol)
 * - Text content (comments, posts, bios)
 * - Tags (format, length, count)
 * - Profile data (name, bio, status, links)
 * - Annotations (selected text, comment)
 * 
 * All validators return a ValidationResult with success status and error message.
 * 
 * @module utils/validation
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Sanitized/normalized value (if applicable) */
  sanitized?: string;
}

/**
 * Validation limits for different input types
 */
export const VALIDATION_LIMITS = {
  // URL limits
  URL_MAX_LENGTH: 2048,
  
  // Text content limits
  SELECTED_TEXT_MAX_LENGTH: 1000,
  COMMENT_MAX_LENGTH: 2000,
  POST_CONTENT_MAX_LENGTH: 1000,
  
  // Tag limits
  TAG_MAX_LENGTH: 20,
  TAG_MIN_LENGTH: 1,
  TAGS_MAX_COUNT: 10,
  
  // Profile limits
  PROFILE_NAME_MIN_LENGTH: 1,
  PROFILE_NAME_MAX_LENGTH: 50,
  PROFILE_BIO_MAX_LENGTH: 500,
  PROFILE_STATUS_MAX_LENGTH: 100,
  PROFILE_LINKS_MAX_COUNT: 10,
  PROFILE_LINK_TITLE_MAX_LENGTH: 50,
  PROFILE_LINK_URL_MAX_LENGTH: 500,
  
  // Drawing limits
  DRAWING_DATA_MAX_SIZE_MB: 2, // 2MB max for base64 canvas data
  
  // General limits
  ID_MAX_LENGTH: 100,
} as const;

/**
 * Allowed URL protocols
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'pubky:'];

/**
 * Validates a URL string
 * @param url - URL to validate
 * @param allowPubky - Whether to allow pubky:// protocol (default: true)
 * @returns Validation result
 */
export function validateUrl(url: string, allowPubky: boolean = true): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  if (trimmed.length > VALIDATION_LIMITS.URL_MAX_LENGTH) {
    return { valid: false, error: `URL exceeds maximum length of ${VALIDATION_LIMITS.URL_MAX_LENGTH} characters` };
  }

  try {
    const parsed = new URL(trimmed);
    
    const allowedProtocols = allowPubky ? ALLOWED_PROTOCOLS : ['http:', 'https:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, error: `Invalid URL protocol. Allowed: ${allowedProtocols.join(', ')}` };
    }

    return { valid: true, sanitized: trimmed };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates selected text for annotations
 * @param text - Selected text to validate
 * @returns Validation result
 */
export function validateSelectedText(text: string): ValidationResult {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Selected text is required' };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Selected text cannot be empty' };
  }

  if (trimmed.length > VALIDATION_LIMITS.SELECTED_TEXT_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Selected text exceeds maximum length of ${VALIDATION_LIMITS.SELECTED_TEXT_MAX_LENGTH} characters` 
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validates a comment for annotations
 * @param comment - Comment text to validate
 * @param required - Whether comment is required (default: true)
 * @returns Validation result
 */
export function validateComment(comment: string, required: boolean = true): ValidationResult {
  if (!comment || typeof comment !== 'string') {
    if (required) {
      return { valid: false, error: 'Comment is required' };
    }
    return { valid: true, sanitized: '' };
  }

  const trimmed = comment.trim();

  if (required && trimmed.length === 0) {
    return { valid: false, error: 'Comment cannot be empty' };
  }

  if (trimmed.length > VALIDATION_LIMITS.COMMENT_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Comment exceeds maximum length of ${VALIDATION_LIMITS.COMMENT_MAX_LENGTH} characters` 
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validates post content
 * @param content - Post content to validate
 * @param required - Whether content is required (default: false for tag-only posts)
 * @returns Validation result
 */
export function validatePostContent(content: string, required: boolean = false): ValidationResult {
  if (!content || typeof content !== 'string') {
    if (required) {
      return { valid: false, error: 'Post content is required' };
    }
    return { valid: true, sanitized: '' };
  }

  const trimmed = content.trim();

  if (required && trimmed.length === 0) {
    return { valid: false, error: 'Post content cannot be empty' };
  }

  if (trimmed.length > VALIDATION_LIMITS.POST_CONTENT_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Post content exceeds maximum length of ${VALIDATION_LIMITS.POST_CONTENT_MAX_LENGTH} characters` 
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validates a single tag
 * @param tag - Tag to validate
 * @returns Validation result
 */
export function validateTag(tag: string): ValidationResult {
  if (!tag || typeof tag !== 'string') {
    return { valid: false, error: 'Tag is required' };
  }

  // Normalize: lowercase, trim, remove # prefix if present
  let normalized = tag.trim().toLowerCase();
  if (normalized.startsWith('#')) {
    normalized = normalized.slice(1);
  }

  if (normalized.length < VALIDATION_LIMITS.TAG_MIN_LENGTH) {
    return { valid: false, error: 'Tag is too short' };
  }

  if (normalized.length > VALIDATION_LIMITS.TAG_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Tag exceeds maximum length of ${VALIDATION_LIMITS.TAG_MAX_LENGTH} characters` 
    };
  }

  // Only allow alphanumeric and hyphens/underscores
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return { valid: false, error: 'Tags can only contain letters, numbers, hyphens, and underscores' };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * Validates an array of tags
 * @param tags - Array of tags to validate
 * @returns Validation result with sanitized tags array
 */
export function validateTags(tags: string[]): ValidationResult & { sanitizedTags?: string[] } {
  if (!Array.isArray(tags)) {
    return { valid: false, error: 'Tags must be an array' };
  }

  if (tags.length > VALIDATION_LIMITS.TAGS_MAX_COUNT) {
    return { 
      valid: false, 
      error: `Cannot have more than ${VALIDATION_LIMITS.TAGS_MAX_COUNT} tags` 
    };
  }

  const sanitizedTags: string[] = [];
  const errors: string[] = [];

  for (const tag of tags) {
    const result = validateTag(tag);
    if (result.valid && result.sanitized) {
      // Avoid duplicates
      if (!sanitizedTags.includes(result.sanitized)) {
        sanitizedTags.push(result.sanitized);
      }
    } else if (result.error) {
      errors.push(`"${tag}": ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: `Invalid tags: ${errors.join('; ')}` };
  }

  return { valid: true, sanitizedTags };
}

/**
 * Parses a tag input string (comma or space separated) into validated tags
 * @param input - Raw tag input string
 * @returns Validation result with sanitized tags array
 */
export function parseAndValidateTags(input: string): ValidationResult & { sanitizedTags?: string[] } {
  if (!input || typeof input !== 'string') {
    return { valid: true, sanitizedTags: [] };
  }

  const rawTags = input
    .split(/[,\s]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  return validateTags(rawTags);
}

/**
 * Profile data for validation
 */
export interface ProfileInput {
  name: string;
  bio?: string;
  status?: string;
  image?: string;
  links?: Array<{ title: string; url: string }>;
}

/**
 * Validates profile data
 * @param profile - Profile data to validate
 * @returns Validation result
 */
export function validateProfile(profile: ProfileInput): ValidationResult {
  if (!profile || typeof profile !== 'object') {
    return { valid: false, error: 'Profile data is required' };
  }

  // Validate name (required)
  if (!profile.name || typeof profile.name !== 'string') {
    return { valid: false, error: 'Profile name is required' };
  }

  const nameTrimmed = profile.name.trim();
  if (nameTrimmed.length < VALIDATION_LIMITS.PROFILE_NAME_MIN_LENGTH) {
    return { valid: false, error: 'Profile name is too short' };
  }

  if (nameTrimmed.length > VALIDATION_LIMITS.PROFILE_NAME_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Profile name exceeds maximum length of ${VALIDATION_LIMITS.PROFILE_NAME_MAX_LENGTH} characters` 
    };
  }

  // Validate bio (optional)
  if (profile.bio && profile.bio.length > VALIDATION_LIMITS.PROFILE_BIO_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Bio exceeds maximum length of ${VALIDATION_LIMITS.PROFILE_BIO_MAX_LENGTH} characters` 
    };
  }

  // Validate status (optional)
  if (profile.status && profile.status.length > VALIDATION_LIMITS.PROFILE_STATUS_MAX_LENGTH) {
    return { 
      valid: false, 
      error: `Status exceeds maximum length of ${VALIDATION_LIMITS.PROFILE_STATUS_MAX_LENGTH} characters` 
    };
  }

  // Validate image URL (optional)
  if (profile.image && profile.image.trim().length > 0) {
    const imageUrl = profile.image.trim();
    // Allow relative paths (e.g., /pub/pubky.app/files/avatar.jpg) or full URLs
    if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return { valid: false, error: 'Image must be a valid URL or relative path' };
    }
    if (imageUrl.length > VALIDATION_LIMITS.URL_MAX_LENGTH) {
      return { valid: false, error: 'Image URL is too long' };
    }
  }

  // Validate links (optional)
  if (profile.links) {
    if (!Array.isArray(profile.links)) {
      return { valid: false, error: 'Links must be an array' };
    }

    if (profile.links.length > VALIDATION_LIMITS.PROFILE_LINKS_MAX_COUNT) {
      return { 
        valid: false, 
        error: `Cannot have more than ${VALIDATION_LIMITS.PROFILE_LINKS_MAX_COUNT} links` 
      };
    }

    for (let i = 0; i < profile.links.length; i++) {
      const link = profile.links[i];
      
      if (!link.title || link.title.trim().length === 0) {
        return { valid: false, error: `Link ${i + 1}: title is required` };
      }

      if (link.title.length > VALIDATION_LIMITS.PROFILE_LINK_TITLE_MAX_LENGTH) {
        return { 
          valid: false, 
          error: `Link ${i + 1}: title exceeds maximum length of ${VALIDATION_LIMITS.PROFILE_LINK_TITLE_MAX_LENGTH} characters` 
        };
      }

      if (!link.url || link.url.trim().length === 0) {
        return { valid: false, error: `Link ${i + 1}: URL is required` };
      }

      const urlResult = validateUrl(link.url, false); // Don't allow pubky:// for social links
      if (!urlResult.valid) {
        return { valid: false, error: `Link ${i + 1}: ${urlResult.error}` };
      }

      if (link.url.length > VALIDATION_LIMITS.PROFILE_LINK_URL_MAX_LENGTH) {
        return { 
          valid: false, 
          error: `Link ${i + 1}: URL exceeds maximum length` 
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Annotation data for validation
 */
export interface AnnotationInput {
  url: string;
  selectedText: string;
  comment: string;
}

/**
 * Validates annotation data
 * @param annotation - Annotation data to validate
 * @returns Validation result
 */
export function validateAnnotation(annotation: AnnotationInput): ValidationResult {
  if (!annotation || typeof annotation !== 'object') {
    return { valid: false, error: 'Annotation data is required' };
  }

  // Validate URL
  const urlResult = validateUrl(annotation.url);
  if (!urlResult.valid) {
    return { valid: false, error: `URL: ${urlResult.error}` };
  }

  // Validate selected text
  const selectedTextResult = validateSelectedText(annotation.selectedText);
  if (!selectedTextResult.valid) {
    return { valid: false, error: `Selected text: ${selectedTextResult.error}` };
  }

  // Validate comment
  const commentResult = validateComment(annotation.comment);
  if (!commentResult.valid) {
    return { valid: false, error: `Comment: ${commentResult.error}` };
  }

  return { valid: true };
}

/**
 * Validates base64 canvas data size
 * @param canvasData - Base64 encoded canvas data
 * @returns Validation result
 */
export function validateCanvasData(canvasData: string): ValidationResult {
  if (!canvasData || typeof canvasData !== 'string') {
    return { valid: false, error: 'Canvas data is required' };
  }

  // Check if it's a valid data URL or base64 string
  if (!canvasData.startsWith('data:image/') && !/^[A-Za-z0-9+/=]+$/.test(canvasData)) {
    return { valid: false, error: 'Invalid canvas data format' };
  }

  // Calculate approximate size in bytes (base64 is ~4/3 the size of binary)
  const base64Data = canvasData.includes(',') ? canvasData.split(',')[1] : canvasData;
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > VALIDATION_LIMITS.DRAWING_DATA_MAX_SIZE_MB) {
    return { 
      valid: false, 
      error: `Drawing data exceeds maximum size of ${VALIDATION_LIMITS.DRAWING_DATA_MAX_SIZE_MB}MB` 
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * Useful for display purposes
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeForDisplay(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters (except newlines and tabs)
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates an ID string (used for annotation IDs, etc.)
 * @param id - ID to validate
 * @returns Validation result
 */
export function validateId(id: string): ValidationResult {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID is required' };
  }

  const trimmed = id.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'ID cannot be empty' };
  }

  if (trimmed.length > VALIDATION_LIMITS.ID_MAX_LENGTH) {
    return { valid: false, error: `ID exceeds maximum length of ${VALIDATION_LIMITS.ID_MAX_LENGTH} characters` };
  }

  // IDs should only contain safe characters
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'ID contains invalid characters' };
  }

  return { valid: true, sanitized: trimmed };
}

