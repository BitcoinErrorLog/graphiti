/**
 * @fileoverview Theme utilities and color definitions.
 */

export type Theme = 'light' | 'dark';

/**
 * Theme color definitions
 */
export const THEME_COLORS = {
  dark: {
    bgPrimary: '#2B2B2B',
    bgSecondary: '#1F1F1F',
    bgTertiary: '#2A2A2A',
    borderPrimary: '#3F3F3F',
    borderSecondary: '#2F2F2F',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    textQuaternary: '#6B7280',
  },
  light: {
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F9FAFB',
    bgTertiary: '#F3F4F6',
    borderPrimary: '#E5E7EB',
    borderSecondary: '#D1D5DB',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textTertiary: '#6B7280',
    textQuaternary: '#9CA3AF',
  },
} as const;

/**
 * Get theme-aware color class names
 */
export function getThemeClasses(theme: Theme) {
  if (theme === 'light') {
    return {
      bgPrimary: 'bg-white',
      bgSecondary: 'bg-gray-50',
      bgTertiary: 'bg-gray-100',
      borderPrimary: 'border-gray-200',
      borderSecondary: 'border-gray-300',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      textTertiary: 'text-gray-500',
      textQuaternary: 'text-gray-400',
    };
  }
  
  // Dark theme (default)
  return {
    bgPrimary: 'bg-[#2B2B2B]',
    bgSecondary: 'bg-[#1F1F1F]',
    bgTertiary: 'bg-[#2A2A2A]',
    borderPrimary: 'border-[#3F3F3F]',
    borderSecondary: 'border-[#2F2F2F]',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-400',
    textTertiary: 'text-gray-500',
    textQuaternary: 'text-gray-600',
  };
}
