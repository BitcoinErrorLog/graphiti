# Styles

Global CSS styles and Tailwind configuration.

## File

- `globals.css` - Global styles imported by popup and sidepanel

## Tailwind CSS

The extension uses Tailwind CSS for styling.

### Configuration

See [`tailwind.config.js`](../../tailwind.config.js) for:
- Color customizations
- Font configurations
- Plugin settings

### Usage

Tailwind classes are used directly in React components:

```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
  Click me
</button>
```

### Dark Theme

The extension uses a dark theme throughout:

```css
/* Common colors */
background: #2B2B2B    /* Main background */
header: #1F1F1F        /* Header/footer */
border: #3F3F3F        /* Borders */
text: #FFFFFF          /* Primary text */
text-muted: #9CA3AF    /* Secondary text */
accent: #3B82F6        /* Blue accent */
```

## Global Styles

The `globals.css` file includes:
- Tailwind base, components, utilities
- Custom scrollbar styling
- Animation keyframes
- Focus states

## Import

Import in React entry points:

```typescript
// popup/main.tsx
import '../styles/globals.css';

// sidepanel/main.tsx
import '../styles/globals.css';
```

## See Also

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [tailwind.config.js](../../tailwind.config.js)

