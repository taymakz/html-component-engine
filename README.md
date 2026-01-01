# HTML Component Engine

A lightweight Vite plugin that enables reusable HTML components for static site generation. Compiles to pure HTML with inlined CSS/JS - no runtime JavaScript required.

## Features

- ✅ Reusable HTML components with props
- ✅ **Slot/children support** - Pass content into components
- ✅ CSS/JS inlining - No external files in production
- ✅ Variant system for component styles
- ✅ Nested components
- ✅ Hot reload during development
- ✅ Zero runtime JavaScript

## Installation

```bash
npm install html-component-engine
```

Requires Vite ^7.0.0

## Folder Structure

Your project must follow this structure:

```
src/
  pages/           # HTML pages (compiled to dist/*.html)
    index.html
    about.html
  components/      # Reusable components
    Header.html
    Footer.html
    Card.html
    main/
      Button.html
  assets/          # Static assets
    styles/
      styles.css
    images/
    fonts/
```

- `src/pages/`: HTML pages - each becomes an output file
- `src/components/`: Reusable HTML components (supports nested folders and .js files)
- `src/assets/`: Static assets - images/fonts copied to `dist/assets/`, CSS/JS inlined

## Configuration

```javascript
// vite.config.js
import htmlComponentEngine from 'html-component-engine';

export default {
  plugins: [
    htmlComponentEngine({
      pagesDir: 'src/pages',       // Pages directory (default)
      componentsDir: 'src/components', // Components directory (default)
      assetsDir: 'src/assets',     // Assets directory (default)
      inlineStyles: true,          // Inline CSS into HTML (default: true)
      inlineScripts: true,         // Inline JS into HTML (default: true)
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
};
```

## Component Syntax

### Self-Closing Components (Props Only)

Use `<Component src="...">` for simple components:

```html
<!-- src/pages/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <link rel="stylesheet" href="/styles/styles.css">
</head>
<body>
  <Component src="Header" />
  <h1>Welcome</h1>
  <Component src="main/Button" text="Click Me" variant="primary" />
  <Component src="Footer" />
</body>
</html>
```

### Components with Children (Slots)

Use `<Component name="...">` for components that accept children:

```html
<Component name="Card" title="My Card">
  <h2>Hello</h2>
  <p>This content is passed to the component's slot</p>
</Component>
```

Component template with `{{ children }}` slot:

```html
<!-- src/components/Card.html -->
<div class="card">
  <div class="card-header">
    <h4>{{ title }}</h4>
  </div>
  <div class="card-body">
    {{ children }}
  </div>
</div>
```

**Output:**

```html
<div class="card">
  <div class="card-header">
    <h4>My Card</h4>
  </div>
  <div class="card-body">
    <h2>Hello</h2>
    <p>This content is passed to the component's slot</p>
  </div>
</div>
```

### Props and Variants

In component files, use `{{propName}}` placeholders:

```html
<!-- src/components/main/Button.html -->
<!-- variants: primary=primary-btn, secondary=secondary-btn -->
<button class="{{variantClasses}}">{{text}}</button>
```

Usage:

```html
<Component src="main/Button" text="Click Me" variant="primary" />
```

### JavaScript Components

Components can also be JavaScript files:

```javascript
// src/components/Counter.js
export default function Counter({ initial = 0 }) {
  return `
    <div class="counter">
      <button onclick="this.nextElementSibling.textContent--">-</button>
      <span>${initial}</span>
      <button onclick="this.previousElementSibling.textContent++">+</button>
    </div>
  `;
}
```

Usage: `<Component src="Counter" initial="5" />`

## Development

Run the development server:

```bash
npm run dev
```

Live reload is enabled - changes to pages, components, or assets automatically refresh the browser.

## Build

Build for production:

```bash
npm run build
```

### Build Output

The build generates:

```
dist/
  index.html      # Compiled HTML with inlined CSS
  about.html      # All components resolved
  assets/
    images/       # Copied from src/assets
    fonts/        # Only non-CSS/JS assets
```

**Key features:**
- ✅ All `<Component>` tags replaced with actual HTML
- ✅ CSS inlined as `<style>` tags
- ✅ JS inlined as `<script>` tags
- ✅ No standalone `.css` or `.js` files
- ✅ Assets (images, fonts) copied to `dist/assets/`
- ✅ Valid, production-ready HTML

## API

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pagesDir` | string | `'src/pages'` | Directory containing HTML pages |
| `componentsDir` | string | `'src/components'` | Directory containing components |
| `assetsDir` | string | `'src/assets'` | Directory containing assets |
| `inlineStyles` | boolean | `true` | Inline CSS into HTML |
| `inlineScripts` | boolean | `true` | Inline JS into HTML |

### Component Attributes

**Self-closing components (`<Component src="..." />`):**
- `src` (required): Component path relative to `componentsDir`
- `variant`: Apply variant classes
- Any other attribute: Passed as props

**Components with children (`<Component name="...">`):**
- `name` (required): Component name/path
- Any other attribute: Passed as props

### Placeholders

- `{{ propName }}`: Replaced with prop value
- `{{ children }}`: Replaced with component's inner content
- `{{ variantClasses }}`: Replaced with variant classes

## Example

See the `example/` directory for a complete working example:

```bash
cd example
npm install
npm run dev    # Development
npm run build  # Production build
```
