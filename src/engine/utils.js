// Utility functions for the HTML Component Engine

/**
 * Parse a self-closing Component tag to extract attributes
 * @param {string} tag - The full component tag, e.g., <Component src="Button" text="Click" />
 * @returns {object|null} - Object with attribute key-value pairs, or null if invalid
 */
export function parseSelfClosingComponentTag(tag) {
  const regex = /<Component\s+([^>]+)\s*\/>/;
  const match = tag.match(regex);
  if (!match) return null;

  const attrs = {};
  // Support hyphenated attributes like data-test, aria-label
  const attrRegex = /([\w-]+)="([^"]*)"/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(match[1])) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }
  return attrs;
}

/**
 * Parse a Component tag to extract attributes (legacy alias)
 * @param {string} tag - The full component tag
 * @returns {object|null} - Object with attribute key-value pairs, or null if invalid
 */
export function parseComponentTag(tag) {
  return parseSelfClosingComponentTag(tag);
}

/**
 * Parse variants from component HTML
 * Looks for <!-- variants: primary=class1 class2, secondary=class3 -->
 * @param {string} html - The component HTML
 * @returns {object} - Map of variant name to classes
 */
export function parseVariants(html) {
  const variants = {};
  // Match HTML comment with variants - use non-greedy match
  const regex = /<!--\s*variants:\s*(.+?)\s*-->/;
  const match = html.match(regex);
  if (match) {
    const variantsStr = match[1];
    const variantPairs = variantsStr.split(',');
    for (const pair of variantPairs) {
      const [name, ...classParts] = pair.split('=');
      const classes = classParts.join('='); // Handle = in class names (unlikely but safe)
      if (name && classes) {
        variants[name.trim()] = classes.trim();
      }
    }
  }
  return variants;
}

/**
 * Clean unused placeholders from compiled HTML
 * @param {string} html - The compiled HTML
 * @returns {string} - Cleaned HTML
 */
export function cleanUnusedPlaceholders(html) {
  // Remove any remaining {{ ... }} placeholders
  return html.replace(/\{\{\s*\w+\s*\}\}/g, '');
}

/**
 * Normalize path separators to forward slashes
 * @param {string} p - Path to normalize
 * @returns {string} - Normalized path
 */
export function normalizePath(p) {
  return p.replace(/\\/g, '/');
}
