import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// NASA's image server sends no CORS headers, so a browser cannot load its
// photos into WebGL directly. In development the photos for the 3D globe are
// fetched through this same-origin proxy. On the deployed site the Cloudflare
// Worker in worker/index.js does the same job.
const epicProxy = {
  '/epic-archive': {
    target: 'https://epic.gsfc.nasa.gov',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/epic-archive/, '/archive'),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: epicProxy },
  preview: { proxy: epicProxy },
})
