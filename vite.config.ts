import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-is": resolve(__dirname, "node_modules/react-is"),
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
})
