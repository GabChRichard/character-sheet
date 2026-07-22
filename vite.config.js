import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // IMPORTANT: Si votre repo est 'character-sheet', décommentez la ligne ci-dessous :
  base: '/character-sheet/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
