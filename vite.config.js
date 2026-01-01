import htmlComponentEngine from './src/index.js';

export default {
  plugins: [
    htmlComponentEngine({
      srcDir: 'src',           // HTML files directly in src/
      componentsDir: 'components',  // src/components/
      assetsDir: 'assets',     // src/assets/
    })
  ],
  publicDir: 'src/assets',     // Serve assets during dev
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
};
