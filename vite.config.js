import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { companyPanelWorker } from './scripts/pwa-build.js';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const vars = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build' && !vars.VITE_API_URL && !vars.VITE_API_BASE_URL) {
    throw new Error('Production build requires VITE_API_URL pointing to the Django /api/v1 backend.');
  }
  return {
  plugins: [react(), tailwindcss(), companyPanelWorker()],
  build: {
    sourcemap: false,
    minify: 'oxc',
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 850,
    rolldownOptions: {
      output: {
        // Rolldown (Vite 8) requires a function rather than Rollup's object map.
        manualChunks(id) {
          if (/node_modules[\\/](?:react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) return 'react';
          if (/node_modules[\\/](?:axios|lucide-react)[\\/]/.test(id)) return 'vendor';
          return undefined;
        }
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: true
  }
  };
});
