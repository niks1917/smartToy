import { defineConfig } from 'vite'
import react from "@vitejs/plugin-react"
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.', // Set root to current directory
  build: {
    rollupOptions: {
      input: {
        client: './entry-client.jsx',
        server: './entry-server.jsx'
      }
    }
  }
})

