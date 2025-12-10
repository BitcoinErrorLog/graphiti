import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  validateSelectedText,
  validateComment,
  validatePostContent,
  validateTag,
  validateTags,
  parseAndValidateTags,
  validateProfile,
  validateAnnotation,
  validateCanvasData,
  validateId,
  sanitizeForDisplay,
  VALIDATION_LIMITS,
} from '../validation';

describe('validateUrl', () => {
  it('should accept valid HTTP URLs', () => {
    expect(validateUrl('https://example.com')).toEqual({ valid: true, sanitized: 'https://example.com' });
    expect(validateUrl('http://example.com/path?query=1')).toEqual({ valid: true, sanitized: 'http://example.com/path?query=1' });
  });

  it('should accept pubky:// URLs by default', () => {
    expect(validateUrl('pubky://abc123')).toEqual({ valid: true, sanitized: 'pubky://abc123' });
  });

  it('should reject pubky:// URLs when allowPubky is false', () => {
    const result = validateUrl('pubky://abc123', false);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid URL protocol');
  });

  it('should reject empty URLs', () => {
    expect(validateUrl('')).toEqual({ valid: false, error: 'URL is required' });
    expect(validateUrl('   ')).toEqual({ valid: false, error: 'URL cannot be empty' });
  });

  it('should reject invalid URLs', () => {
    expect(validateUrl('not-a-url').valid).toBe(false);
    expect(validateUrl('ftp://example.com').valid).toBe(false);
  });

  it('should reject URLs exceeding max length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(VALIDATION_LIMITS.URL_MAX_LENGTH);
    const result = validateUrl(longUrl);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });
});

describe('validateSelectedText', () => {
  it('should accept valid selected text', () => {
    expect(validateSelectedText('Hello world')).toEqual({ valid: true, sanitized: 'Hello world' });
  });

  it('should reject empty text', () => {
    expect(validateSelectedText('')).toEqual({ valid: false, error: 'Selected text is required' });
    expect(validateSelectedText('   ')).toEqual({ valid: false, error: 'Selected text cannot be empty' });
  });

  it('should reject text exceeding max length', () => {
    const longText = 'a'.repeat(VALIDATION_LIMITS.SELECTED_TEXT_MAX_LENGTH + 1);
    const result = validateSelectedText(longText);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });
});

describe('validateComment', () => {
  it('should accept valid comments', () => {
    expect(validateComment('This is a comment')).toEqual({ valid: true, sanitized: 'This is a comment' });
  });

  it('should reject empty comments when required', () => {
    expect(validateComment('', true).valid).toBe(false);
    expect(validateComment('   ', true).valid).toBe(false);
  });

  it('should accept empty comments when not required', () => {
    expect(validateComment('', false)).toEqual({ valid: true, sanitized: '' });
  });

  it('should reject comments exceeding max length', () => {
    const longComment = 'a'.repeat(VALIDATION_LIMITS.COMMENT_MAX_LENGTH + 1);
    const result = validateComment(longComment);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });
});

describe('validatePostContent', () => {
  it('should accept valid post content', () => {
    expect(validatePostContent('Hello world')).toEqual({ valid: true, sanitized: 'Hello world' });
  });

  it('should accept empty content when not required', () => {
    expect(validatePostContent('', false)).toEqual({ valid: true, sanitized: '' });
  });

  it('should reject empty content when required', () => {
    expect(validatePostContent('', true).valid).toBe(false);
  });
});

describe('validateTag', () => {
  it('should accept valid tags', () => {
    expect(validateTag('hello')).toEqual({ valid: true, sanitized: 'hello' });
    expect(validateTag('Hello')).toEqual({ valid: true, sanitized: 'hello' }); // normalized to lowercase
    expect(validateTag('#hello')).toEqual({ valid: true, sanitized: 'hello' }); // # prefix removed
    expect(validateTag('my-tag')).toEqual({ valid: true, sanitized: 'my-tag' });
    expect(validateTag('tag_123')).toEqual({ valid: true, sanitized: 'tag_123' });
  });

  it('should reject empty tags', () => {
    expect(validateTag('').valid).toBe(false);
  });

  it('should reject tags with invalid characters', () => {
    expect(validateTag('hello world').valid).toBe(false); // space
    expect(validateTag('hello@world').valid).toBe(false); // special char
    expect(validateTag('hello!').valid).toBe(false);
  });

  it('should reject tags exceeding max length', () => {
    const longTag = 'a'.repeat(VALIDATION_LIMITS.TAG_MAX_LENGTH + 1);
    const result = validateTag(longTag);
    expect(result.valid).toBe(false);
  });
});

describe('validateTags', () => {
  it('should accept valid tags array', () => {
    const result = validateTags(['hello', 'world']);
    expect(result.valid).toBe(true);
    expect(result.sanitizedTags).toEqual(['hello', 'world']);
  });

  it('should remove duplicates', () => {
    const result = validateTags(['hello', 'Hello', 'HELLO']);
    expect(result.valid).toBe(true);
    expect(result.sanitizedTags).toEqual(['hello']);
  });

  it('should reject too many tags', () => {
    const tooManyTags = Array.from({ length: VALIDATION_LIMITS.TAGS_MAX_COUNT + 1 }, (_, i) => `tag${i}`);
    const result = validateTags(tooManyTags);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Cannot have more than');
  });
});

describe('parseAndValidateTags', () => {
  it('should parse comma-separated tags', () => {
    const result = parseAndValidateTags('hello, world, test');
    expect(result.valid).toBe(true);
    expect(result.sanitizedTags).toEqual(['hello', 'world', 'test']);
  });

  it('should parse space-separated tags', () => {
    const result = parseAndValidateTags('hello world test');
    expect(result.valid).toBe(true);
    expect(result.sanitizedTags).toEqual(['hello', 'world', 'test']);
  });

  it('should handle empty input', () => {
    const result = parseAndValidateTags('');
    expect(result.valid).toBe(true);
    expect(result.sanitizedTags).toEqual([]);
  });
});

describe('validateProfile', () => {
  it('should accept valid profile', () => {
    const result = validateProfile({
      name: 'John Doe',
      bio: 'Hello world',
      status: '👋 Hi',
    });
    expect(result.valid).toBe(true);
  });

  it('should require name', () => {
    const result = validateProfile({ name: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('name');
  });

  it('should validate name length', () => {
    const longName = 'a'.repeat(VALIDATION_LIMITS.PROFILE_NAME_MAX_LENGTH + 1);
    const result = validateProfile({ name: longName });
    expect(result.valid).toBe(false);
  });

  it('should validate bio length', () => {
    const longBio = 'a'.repeat(VALIDATION_LIMITS.PROFILE_BIO_MAX_LENGTH + 1);
    const result = validateProfile({ name: 'John', bio: longBio });
    expect(result.valid).toBe(false);
  });

  it('should validate links', () => {
    const result = validateProfile({
      name: 'John',
      links: [{ title: 'Twitter', url: 'https://twitter.com/john' }],
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid link URLs', () => {
    const result = validateProfile({
      name: 'John',
      links: [{ title: 'Bad Link', url: 'not-a-url' }],
    });
    expect(result.valid).toBe(false);
  });

  it('should reject too many links', () => {
    const tooManyLinks = Array.from({ length: VALIDATION_LIMITS.PROFILE_LINKS_MAX_COUNT + 1 }, (_, i) => ({
      title: `Link ${i}`,
      url: `https://example.com/${i}`,
    }));
    const result = validateProfile({ name: 'John', links: tooManyLinks });
    expect(result.valid).toBe(false);
  });
});

describe('validateAnnotation', () => {
  it('should accept valid annotation', () => {
    const result = validateAnnotation({
      url: 'https://example.com',
      selectedText: 'Some text',
      comment: 'My comment',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject missing fields', () => {
    expect(validateAnnotation({ url: '', selectedText: 'text', comment: 'comment' }).valid).toBe(false);
    expect(validateAnnotation({ url: 'https://example.com', selectedText: '', comment: 'comment' }).valid).toBe(false);
    expect(validateAnnotation({ url: 'https://example.com', selectedText: 'text', comment: '' }).valid).toBe(false);
  });
});

describe('validateCanvasData', () => {
  it('should accept valid base64 data URL', () => {
    const smallData = 'data:image/png;base64,' + 'A'.repeat(100);
    const result = validateCanvasData(smallData);
    expect(result.valid).toBe(true);
  });

  it('should reject empty data', () => {
    expect(validateCanvasData('').valid).toBe(false);
  });

  it('should reject data exceeding max size', () => {
    // Create data that exceeds 2MB
    const largeData = 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024);
    const result = validateCanvasData(largeData);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum size');
  });
});

describe('validateId', () => {
  it('should accept valid IDs', () => {
    expect(validateId('abc123')).toEqual({ valid: true, sanitized: 'abc123' });
    expect(validateId('my-id_123')).toEqual({ valid: true, sanitized: 'my-id_123' });
  });

  it('should reject empty IDs', () => {
    expect(validateId('').valid).toBe(false);
  });

  it('should reject IDs with invalid characters', () => {
    expect(validateId('my id').valid).toBe(false);
    expect(validateId('my@id').valid).toBe(false);
  });
});

describe('sanitizeForDisplay', () => {
  it('should remove null bytes', () => {
    expect(sanitizeForDisplay('hello\0world')).toBe('helloworld');
  });

  it('should remove control characters', () => {
    expect(sanitizeForDisplay('hello\x00\x01\x02world')).toBe('helloworld');
  });

  it('should preserve newlines and tabs', () => {
    expect(sanitizeForDisplay('hello\n\tworld')).toBe('hello\n\tworld');
  });

  it('should handle empty input', () => {
    expect(sanitizeForDisplay('')).toBe('');
    expect(sanitizeForDisplay(null as unknown as string)).toBe('');
  });
});

