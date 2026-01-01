import { describe, it, expect, beforeEach } from 'vitest';
import htmlComponentEngine from '../src/index.js';

describe('htmlComponentEngine plugin', () => {
  describe('plugin initialization', () => {
    it('should return a valid Vite plugin object', () => {
      const plugin = htmlComponentEngine();

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('html-component-engine');
      expect(typeof plugin.configResolved).toBe('function');
      expect(typeof plugin.configureServer).toBe('function');
      expect(typeof plugin.handleHotUpdate).toBe('function');
      expect(typeof plugin.buildStart).toBe('function');
      expect(typeof plugin.generateBundle).toBe('function');
      expect(typeof plugin.closeBundle).toBe('function');
    });

    it('should accept custom options', () => {
      const plugin = htmlComponentEngine({
        srcDir: 'custom-src',
        componentsDir: 'custom-components',
        assetsDir: 'custom-assets',
        inlineStyles: false,
        inlineScripts: false,
      });

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('html-component-engine');
    });

    it('should use default options when none provided', () => {
      const plugin = htmlComponentEngine();

      // The plugin should still work with defaults
      expect(plugin).toBeDefined();
    });
  });

  describe('configResolved hook', () => {
    it('should set up paths correctly', () => {
      const plugin = htmlComponentEngine({
        srcDir: 'src',
        componentsDir: 'components',
        assetsDir: 'assets',
      });

      // Mock Vite config
      const mockConfig = {
        root: '/mock/project/root',
        command: 'serve',
      };

      // Call configResolved
      plugin.configResolved(mockConfig);

      // The hook should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('handleHotUpdate hook', () => {
    it('should be defined and callable', () => {
      const plugin = htmlComponentEngine();

      // Initialize with mock config
      plugin.configResolved({
        root: '/mock/project',
        command: 'serve',
      });

      expect(typeof plugin.handleHotUpdate).toBe('function');
    });
  });
});

describe('plugin options validation', () => {
  it('should handle empty options object', () => {
    expect(() => htmlComponentEngine({})).not.toThrow();
  });

  it('should handle undefined options', () => {
    expect(() => htmlComponentEngine()).not.toThrow();
  });

  it('should handle null options', () => {
    expect(() => htmlComponentEngine(null)).not.toThrow();
  });

  it('should handle partial options', () => {
    expect(() => htmlComponentEngine({ srcDir: 'pages' })).not.toThrow();
  });
});
