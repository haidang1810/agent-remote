import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3927',
      '/mcp': 'http://localhost:3927',
      '/ws': { target: 'ws://localhost:3927', ws: true },
    },
  },
  build: {
    outDir: 'dist',
  },
})
