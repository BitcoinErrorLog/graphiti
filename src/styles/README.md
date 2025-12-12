# Styles

Global CSS styles and Tailwind CSS configuration for the Graphiti extension.

## Overview

The extension uses Tailwind CSS for utility-first styling with a consistent dark theme across all UI components (popup, sidepanel, profile renderer).

## Files

| File | Purpose |
|------|---------|
| `globals.css` | Global styles imported by popup and sidepanel |
| `tailwind.config.js` | Tailwind CSS configuration (in root) |

## Tailwind CSS

The extension uses Tailwind CSS v3 for styling.

### Configuration

See [`tailwind.config.js`](../../tailwind.config.js) for:
- Color customizations
- Font configurations
- Plugin settings
- Content paths

### Usage

Tailwind classes are used directly in React components:

```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
  Click me
</button>
```

### Dark Theme Colors

The extension uses a consistent dark theme:

```css
/* Common colors used throughout */
background: #2B2B2B    /* Main background */
header: #1F1F1F        /* Header/footer */
border: #3F3F3F        /* Borders */
text: #FFFFFF          /* Primary text */
text-muted: #9CA3AF    /* Secondary text */
accent: #3B82F6        /* Blue accent */
accent-gradient: linear-gradient(135deg, #8b5cf6, #7c3aed) /* Purple gradient */
```

### Tailwind Classes

Common patterns:
- `bg-[#2B2B2B]` - Custom background color
- `text-white` - White text
- `text-gray-400` - Muted text
- `border-[#3F3F3F]` - Border color
- `rounded-lg` - Rounded corners
- `hover:bg-gray-600` - Hover states
- `focus:ring-2 focus:ring-purple-500` - Focus states

## Global Styles

The `globals.css` file includes:

### Tailwind Directives
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Custom Styles

**Scrollbar Styling:**
```css
/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1F1F1F;
}

::-webkit-scrollbar-thumb {
  background: #3F3F3F;
  border-radius: 4px;
}
```

**Animations:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

**Focus States:**
```css
/* Consistent focus rings */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-purple-500;
}
```

## Import

Import in React entry points:

```typescript
// popup/main.tsx
import '../styles/globals.css';

// sidepanel/main.tsx
import '../styles/globals.css';
```

## Content Script Styles

Content scripts use inline styles to avoid CSS conflicts with page styles:

```typescript
// In content scripts
button.style.cssText = `
  position: fixed;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  z-index: 999999;
`;
```

## Theme Consistency

All UI components share:
- Same color palette
- Same typography
- Same spacing scale
- Same border radius
- Same shadows

## Responsive Design

The extension uses fixed sizes:
- Popup: 400px × 500px
- Sidepanel: Variable width (Chrome controlled)
- Profile renderer: Full page

## Accessibility

Styles include:
- High contrast ratios (WCAG AA compliant)
- Focus indicators
- Hover states
- Clear visual hierarchy

## Customization

To customize the theme:
1. Edit `tailwind.config.js` for Tailwind settings
2. Edit `globals.css` for global styles
3. Update component classes for specific changes

## Build Process

Tailwind CSS is processed during build:
1. Vite processes `globals.css`
2. Tailwind scans component files for classes
3. Only used classes are included in final CSS
4. CSS is minified in production

## See Also

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [tailwind.config.js](../../tailwind.config.js) - Configuration file
- [PostCSS Config](../../postcss.config.js) - PostCSS configuration
