#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Template files
const templates = {
  'package.json': (projectName) => `{
  "name": "${projectName}",
  "version": "0.1.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "html-component-engine": "^0.1.1"
  }
}
`,

  'vite.config.js': () => `import htmlComponentEngine from 'html-component-engine';

export default {
  plugins: [
    htmlComponentEngine({
      srcDir: 'src',
      componentsDir: 'components',
      assetsDir: 'assets',
    })
  ],
  publicDir: 'src',            // Serve src/assets as /assets during dev
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
};
`,

  'src/index.html': () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home | My Website</title>
  <link rel="stylesheet" href="/assets/styles/main.css">
</head>
<body>
  <Component src="Header" title="My Website" />
  
  <main class="container">
    <h2>Welcome to My Website</h2>
    <p>This is a sample page using HTML Component Engine.</p>
    
    <section class="cards">
      <Component name="Card" title="Getting Started">
        <p>Edit <code>src/index.html</code> to modify this page.</p>
        <p>Components are in <code>src/components/</code>.</p>
      </Component>
      
      <Component name="Card" title="Features">
        <ul>
          <li>Reusable HTML components</li>
          <li>Props and variants support</li>
          <li>Slot-based children</li>
          <li>CSS/JS inlining for production</li>
        </ul>
      </Component>
    </section>
    
    <Component src="Button" text="Learn More" variant="primary" />
  </main>
  
  <Component src="Footer" year="2025" />
</body>
</html>
`,

  'src/about.html': () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About | My Website</title>
  <link rel="stylesheet" href="/assets/styles/main.css">
</head>
<body>
  <Component src="Header" title="My Website" />
  
  <main class="container">
    <h2>About Us</h2>
    <p>This is the about page.</p>
    
    <Component name="Card" title="Our Mission">
      <p>Building great websites with simple, reusable HTML components.</p>
    </Component>
    
    <Component src="Button" text="Go Home" variant="secondary" href="/" />
  </main>
  
  <Component src="Footer" year="2025" />
</body>
</html>
`,

  'src/components/Header.html': () => `<header class="header">
  <div class="header-content">
    <h1 class="logo">{{ title }}</h1>
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </div>
</header>
`,

  'src/components/Footer.html': () => `<footer class="footer">
  <div class="footer-content">
    <p>&copy; {{ year }} My Website. All rights reserved.</p>
  </div>
</footer>
`,

  'src/components/Card.html': () => `<div class="card">
  <div class="card-header">
    <h3>{{ title }}</h3>
  </div>
  <div class="card-body">
    {{ children }}
  </div>
</div>
`,

  'src/components/Button.html': () => `<!-- variants: primary=btn-primary, secondary=btn-secondary, outline=btn-outline -->
<a class="btn {{ variantClasses }}" href="{{ href }}">{{ text }}</a>
`,

  'src/assets/styles/main.css': () => `/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Base */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --text-color: #1e293b;
  --bg-color: #f8fafc;
  --card-bg: #ffffff;
  --border-color: #e2e8f0;
  --radius: 8px;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--bg-color);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  flex: 1;
}

/* Header */
.header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 2rem;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.nav {
  display: flex;
  gap: 1.5rem;
}

.nav a {
  color: var(--text-color);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav a:hover {
  color: var(--primary-color);
}

/* Footer */
.footer {
  background: var(--text-color);
  color: var(--bg-color);
  padding: 1.5rem 2rem;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
}

.card-header h3 {
  font-size: 1.125rem;
}

.card-body {
  padding: 1.5rem;
}

.card-body ul {
  padding-left: 1.5rem;
}

.card-body li {
  margin-bottom: 0.5rem;
}

.card-body code {
  background: var(--bg-color);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border: 2px solid transparent;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: var(--secondary-color);
  color: white;
}

.btn-secondary:hover {
  background: #475569;
}

.btn-outline {
  background: transparent;
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-outline:hover {
  background: var(--primary-color);
  color: white;
}

/* Typography */
h2 {
  margin-bottom: 1rem;
}

p {
  margin-bottom: 1rem;
}

section {
  margin-bottom: 2rem;
}
`,

  '.gitignore': () => `node_modules
dist
.vite
*.log
.DS_Store
`,

  'README.md': (projectName) => `# ${projectName}

A website built with [HTML Component Engine](https://github.com/taymakz/html-component-engine).

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── index.html          # Home page
│   ├── about.html          # About page
│   ├── components/         # Reusable components
│   │   ├── Header.html
│   │   ├── Footer.html
│   │   ├── Card.html
│   │   └── Button.html
│   └── assets/
│       └── styles/
│           └── main.css
├── vite.config.js
└── package.json
\`\`\`

## Component Syntax

### Self-closing components (no children)
\`\`\`html
<Component src="Button" text="Click Me" variant="primary" />
\`\`\`

### Components with children (slots)
\`\`\`html
<Component name="Card" title="My Card">
  <p>This content goes into {{ children }}</p>
</Component>
\`\`\`

### Defining variants
\`\`\`html
<!-- variants: primary=btn-primary, secondary=btn-secondary -->
<button class="{{ variantClasses }}">{{ text }}</button>
\`\`\`
`,
};

async function init() {
  console.log();
  log('🚀 HTML Component Engine - Project Initializer', 'cyan');
  log('━'.repeat(50), 'dim');
  console.log();

  const rl = createReadlineInterface();

  try {
    // Ask for project name
    const projectName = await question(
      rl,
      `${colors.cyan}? ${colors.reset}Project name ${colors.dim}(. for current directory)${colors.reset}: `
    );

    if (!projectName) {
      log('✖ Project name is required', 'red');
      process.exit(1);
    }

    const targetDir = projectName === '.' ? process.cwd() : path.resolve(process.cwd(), projectName);
    const displayName = projectName === '.' ? path.basename(process.cwd()) : projectName;

    // Check if directory exists and is not empty
    if (projectName !== '.' && fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      if (files.length > 0) {
        const overwrite = await question(
          rl,
          `${colors.yellow}⚠ Directory "${projectName}" is not empty. Continue? (y/N): ${colors.reset}`
        );
        if (overwrite.toLowerCase() !== 'y') {
          log('✖ Cancelled', 'red');
          process.exit(1);
        }
      }
    }

    rl.close();

    console.log();
    log(`Creating project in ${targetDir}...`, 'dim');
    console.log();

    // Create directories
    const dirs = [
      '',
      'src',
      'src/components',
      'src/assets',
      'src/assets/styles',
    ];

    for (const dir of dirs) {
      const dirPath = path.join(targetDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create files
    for (const [filePath, getContent] of Object.entries(templates)) {
      const fullPath = path.join(targetDir, filePath);
      const content = typeof getContent === 'function' ? getContent(displayName) : getContent;
      fs.writeFileSync(fullPath, content);
      log(`  ✓ ${filePath}`, 'green');
    }

    console.log();
    log('━'.repeat(50), 'dim');
    log('✅ Project created successfully!', 'green');
    console.log();
    log('Next steps:', 'bright');
    console.log();

    if (projectName !== '.') {
      log(`  cd ${projectName}`, 'cyan');
    }
    log('  npm install', 'cyan');
    log('  npm run dev', 'cyan');
    console.log();
    log('Happy coding! 🎉', 'yellow');
    console.log();

  } catch (error) {
    rl.close();
    log(`✖ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'init' || !command) {
  init();
} else {
  log(`Unknown command: ${command}`, 'red');
  console.log();
  log('Available commands:', 'bright');
  log('  init    Create a new HTML Component Engine project', 'dim');
  console.log();
  process.exit(1);
}
