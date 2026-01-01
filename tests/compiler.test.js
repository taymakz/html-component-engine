import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileHtml, inlineCss, inlineJs } from '../src/engine/compiler.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

// Create test fixtures before tests
beforeEach(async () => {
  // Create fixtures directory structure
  await fs.mkdir(path.join(fixturesDir, 'components', 'main'), { recursive: true });
  await fs.mkdir(path.join(fixturesDir, 'assets', 'styles'), { recursive: true });
  await fs.mkdir(path.join(fixturesDir, 'assets', 'scripts'), { recursive: true });

  // Create test components
  await fs.writeFile(
    path.join(fixturesDir, 'components', 'Header.html'),
    '<header><h1>{{ title }}</h1><nav>{{ nav }}</nav></header>'
  );

  await fs.writeFile(
    path.join(fixturesDir, 'components', 'Footer.html'),
    '<footer><p>{{ copyright }}</p></footer>'
  );

  await fs.writeFile(
    path.join(fixturesDir, 'components', 'Card.html'),
    '<div class="card"><h3>{{ title }}</h3><div class="card-body">{{ children }}</div></div>'
  );

  await fs.writeFile(
    path.join(fixturesDir, 'components', 'main', 'Button.html'),
    '<!-- variants: primary=btn-primary, secondary=btn-secondary -->\n<button class="{{ variantClasses }}">{{ text }}</button>'
  );

  // Create test CSS
  await fs.writeFile(
    path.join(fixturesDir, 'assets', 'styles', 'main.css'),
    'body { margin: 0; } .card { border: 1px solid #ccc; }'
  );

  // Create test JS
  await fs.writeFile(
    path.join(fixturesDir, 'assets', 'scripts', 'app.js'),
    'console.log("Hello World");'
  );
});

// Clean up fixtures after tests
afterEach(async () => {
  try {
    await fs.rm(fixturesDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe('compileHtml', () => {
  describe('self-closing components', () => {
    it('should compile a simple self-closing component', async () => {
      const html = '<Component src="Header" title="My Site" nav="Home | About" />';
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<header>');
      expect(result).toContain('<h1>My Site</h1>');
      expect(result).toContain('Home | About');
      expect(result).toContain('</header>');
      expect(result).not.toContain('<Component');
    });

    it('should compile multiple self-closing components', async () => {
      const html = `
        <Component src="Header" title="Site" nav="Nav" />
        <main>Content</main>
        <Component src="Footer" copyright="2025" />
      `;
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<header>');
      expect(result).toContain('<footer>');
      expect(result).toContain('<main>Content</main>');
    });

    it('should compile nested path components', async () => {
      const html = '<Component src="main/Button" text="Click Me" variant="primary" />';
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<button');
      expect(result).toContain('Click Me');
      expect(result).toContain('btn-primary');
    });

    it('should handle missing components gracefully', async () => {
      const html = '<Component src="NonExistent" />';
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<!-- Component "NonExistent" not found -->');
    });
  });

  describe('components with children (slots)', () => {
    it('should compile component with children', async () => {
      const html = `
        <Component name="Card" title="My Card">
          <p>This is the card content.</p>
        </Component>
      `;
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<div class="card">');
      expect(result).toContain('<h3>My Card</h3>');
      expect(result).toContain('<p>This is the card content.</p>');
      expect(result).not.toContain('{{ children }}');
    });

    it('should handle multiple components with children', async () => {
      const html = `
        <Component name="Card" title="Card 1">
          <p>Content 1</p>
        </Component>
        <Component name="Card" title="Card 2">
          <p>Content 2</p>
        </Component>
      `;
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<h3>Card 1</h3>');
      expect(result).toContain('<h3>Card 2</h3>');
      expect(result).toContain('<p>Content 1</p>');
      expect(result).toContain('<p>Content 2</p>');
    });

    it('should handle nested components within children', async () => {
      const html = `
        <Component name="Card" title="Container">
          <Component src="main/Button" text="Nested Button" variant="secondary" />
        </Component>
      `;
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<div class="card">');
      expect(result).toContain('<button');
      expect(result).toContain('Nested Button');
      expect(result).toContain('btn-secondary');
    });
  });

  describe('variants', () => {
    it('should apply variant classes', async () => {
      const html = '<Component src="main/Button" text="Primary" variant="primary" />';
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('btn-primary');
    });

    it('should apply secondary variant', async () => {
      const html = '<Component src="main/Button" text="Secondary" variant="secondary" />';
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('btn-secondary');
    });

    it('should handle missing variant gracefully', async () => {
      const html = '<Component src="main/Button" text="No Variant" />';
      const result = await compileHtml(html, fixturesDir, fixturesDir);

      expect(result).toContain('<button');
      expect(result).not.toContain('{{ variantClasses }}');
    });
  });
});

describe('inlineCss', () => {
  it('should inline CSS from link tags', async () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="/styles/main.css">
        </head>
        <body></body>
      </html>
    `;
    const result = await inlineCss(html, fixturesDir, fixturesDir);

    expect(result).toContain('<style>');
    expect(result).toContain('body { margin: 0; }');
    expect(result).not.toContain('<link rel="stylesheet"');
  });

  it('should not inline external CSS', async () => {
    const html = '<link rel="stylesheet" href="https://example.com/style.css">';
    const result = await inlineCss(html, fixturesDir, fixturesDir);

    expect(result).toContain('https://example.com/style.css');
    expect(result).not.toContain('<style>');
  });

  it('should handle multiple link tags', async () => {
    // Create another CSS file
    await fs.writeFile(
      path.join(fixturesDir, 'assets', 'styles', 'extra.css'),
      '.extra { color: red; }'
    );

    const html = `
      <link rel="stylesheet" href="/styles/main.css">
      <link rel="stylesheet" href="/styles/extra.css">
    `;
    const result = await inlineCss(html, fixturesDir, fixturesDir);

    expect(result).toContain('body { margin: 0; }');
    expect(result).toContain('.extra { color: red; }');
  });
});

describe('inlineJs', () => {
  it('should inline JS from script tags', async () => {
    const html = '<script src="/scripts/app.js"></script>';
    const result = await inlineJs(html, fixturesDir, fixturesDir);

    expect(result).toContain('<script>');
    expect(result).toContain('console.log("Hello World");');
    expect(result).not.toContain('src="/scripts/app.js"');
  });

  it('should not inline external JS', async () => {
    const html = '<script src="https://example.com/script.js"></script>';
    const result = await inlineJs(html, fixturesDir, fixturesDir);

    expect(result).toContain('https://example.com/script.js');
  });

  it('should not inline Vite client script', async () => {
    const html = '<script type="module" src="/@vite/client"></script>';
    const result = await inlineJs(html, fixturesDir, fixturesDir);

    expect(result).toContain('/@vite/client');
  });
});
