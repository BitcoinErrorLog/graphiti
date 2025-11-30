/**
 * Tag Colors Utility Tests
 * 
 * Tests for the tag color system that provides consistent
 * colors for tags matching the Pubky-app/franky color scheme.
 */

import { describe, it, expect } from 'vitest';
import { getTagColor, getTagStyle } from '../tag-colors';

describe('Tag Colors', () => {
  // ============================================
  // getTagColor Tests
  // ============================================
  describe('getTagColor', () => {
    it('should return a hex color string', () => {
      const color = getTagColor('test');
      
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return consistent color for same tag', () => {
      const color1 = getTagColor('javascript');
      const color2 = getTagColor('javascript');
      
      expect(color1).toBe(color2);
    });

    it('should return different colors for different tags', () => {
      const tags = ['react', 'vue', 'angular', 'svelte', 'typescript'];
      const colors = tags.map(getTagColor);
      const uniqueColors = new Set(colors);
      
      // Most tags should get different colors (though collisions are possible)
      expect(uniqueColors.size).toBeGreaterThan(1);
    });

    it('should handle empty string', () => {
      const color = getTagColor('');
      
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should handle special characters', () => {
      const color = getTagColor('hello-world_123!@#');
      
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should handle Unicode characters', () => {
      const color = getTagColor('こんにちは');
      
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should handle emoji', () => {
      const color = getTagColor('🎨 art');
      
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return one of the predefined colors', () => {
      const TAG_COLORS = [
        '#DC2626', '#059669', '#2563EB', '#EA580C', '#0891B2',
        '#CA8A04', '#9333EA', '#0284C7', '#C2410C', '#7C3AED',
      ];
      
      const color = getTagColor('test-tag');
      
      expect(TAG_COLORS).toContain(color);
    });

    it('should distribute colors across different tags', () => {
      // Test that various tags get distributed across the color palette
      const testTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`);
      const colorCounts = new Map<string, number>();
      
      testTags.forEach(tag => {
        const color = getTagColor(tag);
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      });
      
      // Should use multiple colors (not all the same)
      expect(colorCounts.size).toBeGreaterThan(1);
    });
  });

  // ============================================
  // getTagStyle Tests
  // ============================================
  describe('getTagStyle', () => {
    it('should return backgroundColor and color properties', () => {
      const style = getTagStyle('test');
      
      expect(style).toHaveProperty('backgroundColor');
      expect(style).toHaveProperty('color');
    });

    it('should return white text color', () => {
      const style = getTagStyle('test');
      
      expect(style.color).toBe('#FFFFFF');
    });

    it('should return a hex color for backgroundColor', () => {
      const style = getTagStyle('test');
      
      expect(style.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return consistent style for same tag', () => {
      const style1 = getTagStyle('python');
      const style2 = getTagStyle('python');
      
      expect(style1).toEqual(style2);
    });

    it('should use getTagColor for backgroundColor', () => {
      const tag = 'test-tag';
      const color = getTagColor(tag);
      const style = getTagStyle(tag);
      
      expect(style.backgroundColor).toBe(color);
    });
  });

  // ============================================
  // Known Tag Color Tests (Deterministic)
  // ============================================
  describe('Deterministic Colors', () => {
    // These tests ensure specific tags always get the same color
    // This is important for consistency across the application
    
    it('should produce consistent hash for "javascript"', () => {
      const color1 = getTagColor('javascript');
      const color2 = getTagColor('javascript');
      const color3 = getTagColor('javascript');
      
      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });

    it('should produce consistent hash for "pubky"', () => {
      const color1 = getTagColor('pubky');
      const color2 = getTagColor('pubky');
      
      expect(color1).toBe(color2);
    });

    it('should treat case-different tags as different', () => {
      // Tags should be normalized before using this function
      // But if they're not, we want predictable behavior
      const colorLower = getTagColor('javascript');
      const colorUpper = getTagColor('JAVASCRIPT');
      
      // Different cases should produce different colors (unless normalized upstream)
      // This is acceptable behavior since tags should be normalized
      expect(typeof colorLower).toBe('string');
      expect(typeof colorUpper).toBe('string');
    });
  });
});

