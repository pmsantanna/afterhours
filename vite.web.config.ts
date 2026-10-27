// Renderer sozinho no navegador, sem Electron: iteração rápida na UI e no áudio.
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
});
