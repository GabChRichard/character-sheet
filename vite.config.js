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
      },
      output: {
        // Isole le SDK Supabase (auth/postgrest/storage/realtime) dans un
        // chunk nommé explicitement : sans ça, Rollup le fusionne avec les
        // petits utilitaires partagés (idleLogout, scoreCalculator) et nomme
        // le tout d'après le premier module du groupe — trompeur pour lire
        // les tailles de build, et moins efficace pour le cache navigateur
        // (le SDK change bien moins souvent que le code de l'app).
        manualChunks(id) {
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
        }
      }
    }
  }
});
