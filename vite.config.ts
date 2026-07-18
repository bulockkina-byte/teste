import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    cssMinify: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/autentique-proxy': {
        target: 'https://api.autentique.com.br/v2/graphql',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/autentique-proxy/, ''),
      },
    },
  },
})
