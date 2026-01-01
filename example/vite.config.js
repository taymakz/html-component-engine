import htmlComponentEngine from 'html-component-engine';

export default {
  plugins: [
    htmlComponentEngine({
      srcDir: 'src',           // HTML files directly in src/
      componentsDir: 'components',  // src/components/
      assetsDir: 'assets',     // src/assets/
    })
  ],
  publicDir: 'src',            // Serve src/assets as /assets during dev
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Ensure linked package changes are picked up immediately
  optimizeDeps: {
    exclude: ['html-component-engine'],
  },
  server: {
    watch: {
      // Watch the parent engine directory for changes
      ignored: ['!**/node_modules/html-component-engine/**'],
    },
  },
};
