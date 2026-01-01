import { describe, it, expect } from 'vitest';
import {
  parseSelfClosingComponentTag,
  parseComponentTag,
  parseVariants,
  cleanUnusedPlaceholders,
  normalizePath,
} from '../src/engine/utils.js';

describe('parseSelfClosingComponentTag', () => {
  it('should parse a simple self-closing component tag', () => {
    const tag = '<Component src="Button" />';
    const result = parseSelfClosingComponentTag(tag);
    expect(result).toEqual({ src: 'Button' });
  });

  it('should parse component with multiple attributes', () => {
    const tag = '<Component src="Button" text="Click Me" variant="primary" />';
    const result = parseSelfClosingComponentTag(tag);
    expect(result).toEqual({
      src: 'Button',
      text: 'Click Me',
      variant: 'primary',
    });
  });

  it('should parse component with nested path', () => {
    const tag = '<Component src="main/Button" text="Submit" />';
    const result = parseSelfClosingComponentTag(tag);
    expect(result).toEqual({
      src: 'main/Button',
      text: 'Submit',
    });
  });

  it('should return null for invalid tag', () => {
    const tag = '<div class="test">content</div>';
    const result = parseSelfClosingComponentTag(tag);
    expect(result).toBeNull();
  });

  it('should return null for non-self-closing component tag', () => {
    const tag = '<Component name="Card">content</Component>';
    const result = parseSelfClosingComponentTag(tag);
    expect(result).toBeNull();
  });

  it('should handle empty attributes', () => {
    const tag = '<Component src="" />';
    const result = parseSelfClosingComponentTag(tag);
    expect(result).toEqual({ src: '' });
  });

  it('should handle attributes with special characters', () => {
    const tag = '<Component src="Button" class="btn btn-primary" data-test="hello-world" />';
    const result = parseSelfClosingComponentTag(tag);
    expect(result).toEqual({
      src: 'Button',
      class: 'btn btn-primary',
      'data-test': 'hello-world', // Hyphenated attributes are preserved
    });
  });
});

describe('parseComponentTag (alias)', () => {
  it('should work the same as parseSelfClosingComponentTag', () => {
    const tag = '<Component src="Header" title="My Title" />';
    expect(parseComponentTag(tag)).toEqual(parseSelfClosingComponentTag(tag));
  });
});

describe('parseVariants', () => {
  it('should parse single variant', () => {
    const html = '<!-- variants: primary=btn-primary --><button>Click</button>';
    const result = parseVariants(html);
    expect(result).toEqual({ primary: 'btn-primary' });
  });

  it('should parse multiple variants', () => {
    const html = '<!-- variants: primary=btn-primary, secondary=btn-secondary, danger=btn-danger -->\n<button>Click</button>';
    const result = parseVariants(html);
    expect(result).toEqual({
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger',
    });
  });

  it('should parse variants with multiple classes', () => {
    const html = '<!-- variants: primary=btn btn-primary btn-lg --><button>Click</button>';
    const result = parseVariants(html);
    expect(result).toEqual({ primary: 'btn btn-primary btn-lg' });
  });

  it('should return empty object for HTML without variants', () => {
    const html = '<button class="btn">Click</button>';
    const result = parseVariants(html);
    expect(result).toEqual({});
  });

  it('should handle extra whitespace', () => {
    const html = '<!--   variants:   primary=btn-primary  ,  secondary=btn-secondary   -->';
    const result = parseVariants(html);
    expect(result).toEqual({
      primary: 'btn-primary',
      secondary: 'btn-secondary',
    });
  });

  it('should handle variants in the middle of HTML', () => {
    const html = `
      <div>
        <!-- variants: outline=btn-outline, filled=btn-filled -->
        <button class="{{ variantClasses }}">{{ text }}</button>
      </div>
    `;
    const result = parseVariants(html);
    expect(result).toEqual({
      outline: 'btn-outline',
      filled: 'btn-filled',
    });
  });
});

describe('cleanUnusedPlaceholders', () => {
  it('should remove single placeholder', () => {
    const html = '<div>{{ unused }}</div>';
    const result = cleanUnusedPlaceholders(html);
    expect(result).toBe('<div></div>');
  });

  it('should remove multiple placeholders', () => {
    const html = '<div>{{ one }}{{ two }}{{ three }}</div>';
    const result = cleanUnusedPlaceholders(html);
    expect(result).toBe('<div></div>');
  });

  it('should handle placeholders with various whitespace', () => {
    const html = '<div>{{one}} {{ two  }} {{   three   }}</div>';
    const result = cleanUnusedPlaceholders(html);
    // Note: spaces between placeholders are preserved, only placeholders are removed
    // {{one}} + space + {{ two  }} + space + {{   three   }} = 2 spaces remain
    expect(result).toBe('<div>  </div>');
  });

  it('should not modify HTML without placeholders', () => {
    const html = '<div class="test">Hello World</div>';
    const result = cleanUnusedPlaceholders(html);
    expect(result).toBe('<div class="test">Hello World</div>');
  });

  it('should preserve non-placeholder content', () => {
    const html = '<div class="card">{{ unused }}<h1>Title</h1><p>Text</p>{{ another }}</div>';
    const result = cleanUnusedPlaceholders(html);
    expect(result).toBe('<div class="card"><h1>Title</h1><p>Text</p></div>');
  });

  it('should handle multiline HTML', () => {
    const html = `
      <div>
        {{ placeholder1 }}
        <p>Content</p>
        {{ placeholder2 }}
      </div>
    `;
    const result = cleanUnusedPlaceholders(html);
    expect(result).toContain('<p>Content</p>');
    expect(result).not.toContain('placeholder1');
    expect(result).not.toContain('placeholder2');
  });
});

describe('normalizePath', () => {
  it('should convert backslashes to forward slashes', () => {
    const path = 'C:\\Users\\test\\project\\file.js';
    const result = normalizePath(path);
    expect(result).toBe('C:/Users/test/project/file.js');
  });

  it('should not modify paths with forward slashes', () => {
    const path = '/home/user/project/file.js';
    const result = normalizePath(path);
    expect(result).toBe('/home/user/project/file.js');
  });

  it('should handle mixed slashes', () => {
    const path = 'C:\\Users/test\\project/file.js';
    const result = normalizePath(path);
    expect(result).toBe('C:/Users/test/project/file.js');
  });

  it('should handle empty string', () => {
    expect(normalizePath('')).toBe('');
  });

  it('should handle relative paths', () => {
    const path = '..\\parent\\file.js';
    const result = normalizePath(path);
    expect(result).toBe('../parent/file.js');
  });
});
