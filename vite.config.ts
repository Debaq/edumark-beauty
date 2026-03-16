import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tauri sets TAURI_ENV_PLATFORM at dev/build time
const isTauri = !!process.env.TAURI_ENV_PLATFORM
const port = parseInt(process.env.VITE_PORT || '5173', 10)

export default defineConfig({
  // Web deploy uses /edumark/ base; Tauri serves from root
  base: isTauri ? '/' : '/edumark/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': '/src' },
  },
  // Prevent Vite from obscuring Rust errors in Tauri dev
  clearScreen: false,
  server: {
    strictPort: true,
    port,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
})
