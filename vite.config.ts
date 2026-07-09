import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // ⚡ Required for Electron: assets must use relative paths (file:// protocol)
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist/renderer',   // Output separate from electron/ folder
      target: 'esnext',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-recharts';
            }
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
              return 'vendor-pdf';
            }
            if (id.includes('xlsx') || id.includes('exceljs')) {
              return 'vendor-xlsx';
            }
            if (id.includes('@google/genai')) {
              return 'vendor-ai';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'recharts'],
    },
  };
});
