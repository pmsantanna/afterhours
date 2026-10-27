import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  // relativo para o build carregar via file:// dentro do Electron
  base: './',
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { port: 5173, strictPort: true },
})
