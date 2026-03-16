import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tauri sets TAURI_ENV_PLATFORM at dev/build time
const isTauri = !!process.env.TAURI_ENV_PLATFORM

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
    // Tauri expects a fixed port
    strictPort: true,
    port: 5173,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
})
