import { compileHtml, inlineCss, inlineJs } from './engine/compiler.js';
import { cleanUnusedPlaceholders, normalizePath } from './engine/utils.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * HTML Component Engine - Vite Plugin
 * A lightweight static site compiler with component support
 * 
 * @param {object} options - Plugin options
 * @param {string} options.srcDir - Source directory relative to project root (default: 'src')
 * @param {string} options.componentsDir - Components directory name inside srcDir (default: 'components')
 * @param {string} options.assetsDir - Assets directory name inside srcDir (default: 'assets')
 * @param {boolean} options.inlineStyles - Whether to inline CSS (default: true for build)
 * @param {boolean} options.inlineScripts - Whether to inline JS (default: true for build)
 */
export default function htmlComponentEngine(options = {}) {
  // Handle null/undefined options
  const opts = options || {};
  const {
    srcDir = 'src',
    componentsDir = 'components',
    assetsDir = 'assets',
    inlineStyles = false,
    inlineScripts = false,
  } = opts;

  let projectRoot;
  let srcRoot;
  let componentsRoot;
  let assetsRoot;
  let resolvedConfig;

  return {
    name: 'html-component-engine',

    async config(config, { command }) {
      // Calculate paths early for config setup
      const root = process.cwd();
      const src = path.resolve(root, srcDir);
      const components = componentsDir;

      if (command === 'build') {
        // Disable Vite's default HTML handling - we do it ourselves
        return {
          // Disable publicDir - we copy assets ourselves
          publicDir: false,
          build: {
            // Use a virtual entry - we'll handle HTML ourselves in generateBundle
            rollupOptions: {
              input: { __virtual_entry__: '\0virtual:html-component-engine-entry' },
            },
          },
        };
      }
    },

    // Resolve virtual module
    resolveId(id) {
      if (id === '\0virtual:html-component-engine-entry') {
        return id;
      }
    },

    // Provide empty content for virtual module
    load(id) {
      if (id === '\0virtual:html-component-engine-entry') {
        return 'export default {}';
      }
    },

    configResolved(config) {
      resolvedConfig = config;
      // Use process.cwd() as the project root - this is where the vite command is run from
      // config.root can be unreliable with linked packages
      projectRoot = process.cwd();
      srcRoot = path.resolve(projectRoot, srcDir);
      componentsRoot = path.join(srcRoot, componentsDir);
      assetsRoot = path.join(srcRoot, assetsDir);
    },

    configureServer(server) {
      // Add middleware BEFORE internal middlewares to intercept HTML requests
      server.middlewares.use(async (req, res, next) => {
        // Skip non-HTML requests and special Vite paths
        if (req.url.startsWith('/@') || req.url.startsWith('/__')) {
          return next();
        }

        // Skip asset requests (let Vite handle them via publicDir)
        if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/i)) {
          return next();
        }

        let url;
        if (req.url === '/' || req.url === '/index' || req.url === '/index.html') {
          url = 'index.html';
        } else if (req.url.endsWith('.html')) {
          url = req.url.slice(1);
        } else {
          // Check if req.url + '.html' exists
          const potential = req.url.slice(1) + '.html';
          const filePathCheck = path.join(srcRoot, potential);
          try {
            await fs.access(filePathCheck);
            url = potential;
          } catch {
            return next();
          }
        }

        const filePath = path.join(srcRoot, url);

        try {
          let html = await fs.readFile(filePath, 'utf8');

          // Compile components
          html = await compileHtml(html, srcRoot, projectRoot);

          // Clean unused placeholders
          html = cleanUnusedPlaceholders(html);

          // Inject Vite HMR client script
          if (html.includes('</body>')) {
            html = html.replace('</body>', '<script type="module" src="/@vite/client"></script></body>');
          } else {
            html += '<script type="module" src="/@vite/client"></script>';
          }

          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          return;
        } catch (error) {
          console.error(`[html-component-engine] Error processing ${filePath}:`, error.message);
          next();
        }
      });
    },

    handleHotUpdate(ctx) {
      const normalizedFile = normalizePath(ctx.file);
      const normalizedSrcRoot = normalizePath(srcRoot);

      // Reload on changes to src directory
      if (normalizedFile.startsWith(normalizedSrcRoot)) {
        console.log('Hot update for:', ctx.file, '- sending full-reload');
        ctx.server.ws.send({ type: 'full-reload' });
        return [];
      }
    },

    /**
     * Build hook - process all HTML files for production
     */
    async buildStart() {
      if (resolvedConfig.command !== 'build') return;

      console.log('\n🔨 HTML Component Engine - Build Started');
      console.log(`   Source: ${srcRoot}`);
      console.log(`   Components: ${componentsRoot}`);
      console.log(`   Assets: ${assetsRoot}`);
    },

    /**
     * Generate bundle - compile HTML files and copy assets
     */
    async generateBundle(outputOptions, bundle) {
      // Remove virtual entry from bundle
      for (const fileName in bundle) {
        if (fileName.includes('__virtual_entry__') || fileName.includes('virtual_html-component-engine')) {
          delete bundle[fileName];
        }
      }

      // Get all HTML files from src directory (excluding components)
      const htmlFiles = await getHtmlFiles(srcRoot, '', componentsDir);

      console.log(`   Found ${htmlFiles.length} HTML file(s)`);

      for (const htmlFile of htmlFiles) {
        const filePath = path.join(srcRoot, htmlFile);
        let html = await fs.readFile(filePath, 'utf8');

        // Only compile components - replace <Component> tags
        html = await compileHtml(html, srcRoot, projectRoot);

        // Clean unused placeholders
        html = cleanUnusedPlaceholders(html);

        // Output HTML to dist root with just filename (no subdirectories)
        const outputFileName = path.basename(htmlFile);
        this.emitFile({
          type: 'asset',
          fileName: outputFileName,
          source: html,
        });

        console.log(`   ✓ Compiled: ${htmlFile} → ${outputFileName}`);
      }

      // Copy ALL non-HTML files from src/ to dist/ (excluding components/)
      await copyAllNonComponentFiles(srcRoot, componentsDir, this);
    },

    /**
     * Close bundle - cleanup and final processing
     */
    async closeBundle() {
      if (resolvedConfig.command !== 'build') return;

      console.log('\n✅ HTML Component Engine - Build Complete\n');
    },
  };
}

/**
 * Get all HTML files recursively from a directory
 * @param {string} dir - Directory to search
 * @param {string} base - Base directory for relative paths
 * @param {string} componentsDir - Components directory name to skip
 * @returns {Promise<string[]>} - Array of relative file paths
 */
async function getHtmlFiles(dir, base = '', componentsDir = 'components') {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = base ? path.join(base, entry.name) : entry.name;

      if (entry.isDirectory()) {
        // Skip only the components directory
        if (entry.name !== componentsDir) {
          const subFiles = await getHtmlFiles(path.join(dir, entry.name), relativePath, componentsDir);
          files.push(...subFiles);
        }
      } else if (entry.name.endsWith('.html')) {
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}: ${error.message}`);
  }

  return files;
}

/**
 * Copy ALL non-HTML files under src/ to dist/ preserving paths
 * Excludes any directory named componentsDir (defaults to "components").
 * @param {string} srcPath - src directory path
 * @param {string} componentsDir - directory name to exclude
 * @param {object} context - Rollup plugin context
 */
async function copyAllNonComponentFiles(srcPath, componentsDir = 'components', context) {
  const allFiles = await getAllFilesExcludingDir(srcPath, componentsDir);

  let copiedCount = 0;
  for (const file of allFiles) {
    const relativePath = path.relative(srcPath, file).replace(/\\/g, '/');

    // HTML is handled separately (compiled + emitted)
    if (relativePath.toLowerCase().endsWith('.html')) continue;

    const content = await fs.readFile(file);
    context.emitFile({
      type: 'asset',
      fileName: relativePath,
      source: content,
    });
    copiedCount++;
  }

  console.log(`   Copied ${copiedCount} non-HTML file(s)`);
}

/**
 * Get all files recursively from a directory, excluding a directory name.
 * @param {string} dir - Directory to search
 * @param {string} excludedDirName - Directory name to exclude (e.g., "components")
 * @returns {Promise<string[]>} - Array of absolute file paths
 */
async function getAllFilesExcludingDir(dir, excludedDirName) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === excludedDirName) continue;
        const subFiles = await getAllFilesExcludingDir(fullPath, excludedDirName);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}: ${error.message}`);
  }

  return files;
}

/**
 * Get all files recursively from a directory
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} - Array of absolute file paths
 */
async function getAllFiles(dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}: ${error.message}`);
  }

  return files;
}
