/**
 * @fileoverview Tag color utilities for consistent tag styling.
 * 
 * Provides deterministic color assignment for tags, matching
 * the Pubky-app/franky color system.
 * 
 * @module utils/tag-colors
 * @see https://github.com/pubky/franky/blob/master/src/libs/utils/utils.ts
 */

/**
 * Color palette for tags.
 * 
 * Uses darker, more saturated colors for better readability
 * with white text.
 */
const TAG_COLORS = [
  '#DC2626', // Dark Red
  '#059669', // Dark Teal/Emerald
  '#2563EB', // Dark Blue
  '#EA580C', // Dark Orange
  '#0891B2', // Dark Cyan
  '#CA8A04', // Dark Yellow/Gold
  '#9333EA', // Dark Purple
  '#0284C7', // Dark Sky Blue
  '#C2410C', // Dark Rust
  '#7C3AED', // Dark Violet
];

/**
 * Gets a consistent color for a tag based on its label.
 * 
 * Uses a hash function to deterministically assign colors,
 * ensuring the same tag always gets the same color.
 * 
 * @param {string} tag - Tag label to get color for
 * @returns {string} Hex color code (e.g., "#DC2626")
 * 
 * @example
 * const color = getTagColor('javascript');
 * // Always returns the same color for 'javascript'
 */
export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

/**
 * Gets a complete style object for a tag.
 * 
 * Returns both background color and text color for
 * direct use in React style props.
 * 
 * @param {string} tag - Tag label to get style for
 * @returns {{ backgroundColor: string, color: string }} Style object
 * 
 * @example
 * const style = getTagStyle('react');
 * return <span style={style}>{tag}</span>;
 */
export function getTagStyle(tag: string): { backgroundColor: string; color: string } {
  const bgColor = getTagColor(tag);
  return {
    backgroundColor: bgColor,
    color: '#FFFFFF',
  };
}

