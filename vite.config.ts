import os from 'os'
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function hostnameHintPlugin(): Plugin {
  return {
    name: 'hostname-hint',
    configureServer(server) {
      const _printUrls = server.printUrls.bind(server)
      server.printUrls = () => {
        _printUrls()
        const hostname = os.hostname()
        const port = server.config.server.port ?? 5173
        console.log(`  \x1b[36m➜\x1b[0m  \x1b[1mHostname:\x1b[0m   http://${hostname}:${port}/`)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    hostnameHintPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
