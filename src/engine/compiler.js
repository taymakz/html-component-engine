import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { parseComponentTag, parseVariants, parseSelfClosingComponentTag } from './utils.js';

/**
 * Compile HTML by resolving all components
 * @param {string} html - The HTML content to compile
 * @param {string} root - The root directory (pages directory)
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<string>} - Compiled HTML
 */
export async function compileHtml(html, root, projectRoot = null) {
  const effectiveProjectRoot = projectRoot || path.dirname(root);
  let result = html;

  // First, process components with children: <Component name="...">children</Component>
  result = await processComponentsWithChildren(result, root, effectiveProjectRoot);

  // Then, process self-closing components: <Component src="..." />
  result = await processSelfClosingComponents(result, root, effectiveProjectRoot);

  return result;
}

/**
 * Process components with children (slot-based)
 * Matches: <Component name="ComponentName">...children...</Component>
 */
async function processComponentsWithChildren(html, root, projectRoot) {
  // Regex to match <Component name="...">...</Component>
  const componentRegex = /<Component\s+name="([^"]+)"([^>]*)>([\s\S]*?)<\/Component>/g;

  let result = html;
  let matches = [...html.matchAll(componentRegex)];

  for (const match of matches) {
    const fullTag = match[0];
    const componentName = match[1];
    const attrsStr = match[2];
    const children = match[3].trim();

    // Parse additional attributes
    const attrs = parseAttributes(attrsStr);

    // Load component
    let componentContent = await loadComponent(componentName, root, projectRoot, attrs);

    if (componentContent === null) {
      console.error(`Component "${componentName}" not found`);
      result = result.replace(fullTag, `<!-- Component "${componentName}" not found -->`);
      continue;
    }

    // Replace {{ children }} placeholder with actual children content
    componentContent = componentContent.replace(/\{\{\s*children\s*\}\}/g, children);

    // Replace props with {{key}} placeholders
    for (const [key, value] of Object.entries(attrs)) {
      componentContent = componentContent.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
    }

    // Recursively compile nested components
    const compiledComponent = await compileHtml(componentContent, root, projectRoot);
    result = result.replace(fullTag, compiledComponent);
  }

  return result;
}

/**
 * Process self-closing components
 * Matches: <Component src="..." />
 */
async function processSelfClosingComponents(html, root, projectRoot) {
  const componentRegex = /<Component[^>]+\/>/g;

  let result = html;
  const matches = [...html.matchAll(componentRegex)];

  for (const match of matches) {
    const tag = match[0];
    const attrs = parseSelfClosingComponentTag(tag);
    if (!attrs || !attrs.src) continue;

    const name = attrs.src;
    let componentContent = await loadComponent(name, root, projectRoot, attrs);

    if (componentContent === null) {
      console.error(`Component "${name}" not found`);
      result = result.replace(tag, `<!-- Component "${name}" not found -->`);
      continue;
    }

    // Parse variants (only for HTML content)
    const variants = parseVariants(componentContent);

    // Replace props with {{key}} placeholders
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'variant' && variants[value]) {
        componentContent = componentContent.replace(/\{\{\s*variantClasses\s*\}\}/g, variants[value]);
      } else if (key !== 'src' && key !== 'variant') {
        componentContent = componentContent.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
      }
    }

    // If no variant specified, replace {{variantClasses}} with empty
    componentContent = componentContent.replace(/\{\{\s*variantClasses\s*\}\}/g, '');

    // Recursively compile nested components
    const compiledComponent = await compileHtml(componentContent, root, projectRoot);
    result = result.replace(tag, compiledComponent);
  }

  return result;
}

/**
 * Load a component by name
 * @param {string} name - Component name (e.g., "Card" or "main/Button")
 * @param {string} root - The pages root directory
 * @param {string} projectRoot - The project root directory
 * @param {object} attrs - Component attributes/props
 * @returns {Promise<string|null>} - Component content or null if not found
 */
async function loadComponent(name, root, projectRoot, attrs = {}) {
  // Normalize name for path construction (handle both / and \)
  const normalizedName = name.replace(/\\/g, '/');

  // root = srcRoot (e.g., example/src)
  // projectRoot = project root (e.g., example)
  // Components are in srcRoot/components
  const possiblePaths = [
    path.join(root, 'components', `${normalizedName}.html`),           // srcRoot/components/
    path.join(projectRoot, 'src', 'components', `${normalizedName}.html`), // projectRoot/src/components/
    path.join(projectRoot, 'components', `${normalizedName}.html`),    // projectRoot/components/
  ];

  for (const componentPath of possiblePaths) {
    try {
      await fs.access(componentPath); // Check if file exists first
      const content = await fs.readFile(componentPath, 'utf8');
      return content;
    } catch {
      // Try .js file at the same location
      const jsPath = componentPath.replace('.html', '.js');
      try {
        const componentModule = await import(pathToFileURL(jsPath));
        const componentExport = componentModule.default || componentModule;

        if (typeof componentExport === 'function') {
          const props = { ...attrs };
          delete props.src;
          delete props.name;
          return componentExport(props);
        } else {
          return String(componentExport);
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Parse attributes from an attribute string
 * @param {string} attrsStr - Attribute string like ' class="foo" id="bar"'
 * @returns {object} - Object with attribute key-value pairs
 */
function parseAttributes(attrsStr) {
  const attrs = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }
  return attrs;
}

/**
 * Inline CSS from <link> tags into <style> tags
 * @param {string} html - The HTML content
 * @param {string} root - The src root directory
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<string>} - HTML with inlined CSS
 */
export async function inlineCss(html, root, projectRoot) {
  const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
  const matches = [...html.matchAll(linkRegex)];

  let result = html;

  for (const match of matches) {
    const linkTag = match[0];
    const hrefMatch = linkTag.match(/href=["']([^"']+)["']/);

    if (!hrefMatch) continue;

    let href = hrefMatch[1];

    // Skip external URLs
    if (href.startsWith('http://') || href.startsWith('https://')) {
      continue;
    }

    // Resolve the CSS file path - try multiple locations
    let cssPath = null;
    let cssContent = null;

    // Possible paths to check
    const pathsToTry = [];

    if (href.startsWith('/')) {
      const cleanHref = href.slice(1);
      // /styles/styles.css -> src/assets/styles/styles.css (publicDir pattern)
      pathsToTry.push(path.join(root, 'assets', cleanHref));
      // /assets/styles/styles.css -> src/assets/styles/styles.css
      pathsToTry.push(path.join(root, cleanHref));
      // Try project root
      pathsToTry.push(path.join(projectRoot, 'src', 'assets', cleanHref));
    } else {
      // Relative path
      pathsToTry.push(path.join(root, href));
    }

    for (const tryPath of pathsToTry) {
      if (await fileExists(tryPath)) {
        cssPath = tryPath;
        break;
      }
    }

    if (cssPath) {
      try {
        cssContent = await fs.readFile(cssPath, 'utf8');
        const styleTag = `<style>\n${cssContent}\n</style>`;
        result = result.replace(linkTag, styleTag);
      } catch (error) {
        console.warn(`Could not inline CSS from ${href}: ${error.message}`);
      }
    } else {
      console.warn(`Could not find CSS file for ${href}`);
    }
  }

  return result;
}

/**
 * Inline JS from <script src="..."> tags into inline <script> tags
 * @param {string} html - The HTML content
 * @param {string} root - The pages root directory
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<string>} - HTML with inlined JS
 */
export async function inlineJs(html, root, projectRoot) {
  const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi;
  const matches = [...html.matchAll(scriptRegex)];

  let result = html;

  for (const match of matches) {
    const scriptTag = match[0];
    let src = match[1];

    // Skip external URLs and Vite client
    if (src.startsWith('http://') || src.startsWith('https://') || src.includes('@vite')) {
      continue;
    }

    // Resolve the JS file path
    let jsPath;
    if (src.startsWith('/')) {
      jsPath = path.join(projectRoot, 'src', 'assets', src.slice(1));
      if (!await fileExists(jsPath)) {
        jsPath = path.join(root, 'assets', src.slice(1));
      }
      if (!await fileExists(jsPath)) {
        jsPath = path.join(root, src.slice(1));
      }
    } else {
      jsPath = path.join(root, src);
    }

    try {
      const jsContent = await fs.readFile(jsPath, 'utf8');
      const inlineScriptTag = `<script>\n${jsContent}\n</script>`;
      result = result.replace(scriptTag, inlineScriptTag);
    } catch (error) {
      console.warn(`Could not inline JS from ${src}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
