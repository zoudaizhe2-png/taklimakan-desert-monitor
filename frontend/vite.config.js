import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Vite 8 / rolldown — manualChunks must be a function, not an object.
const CHUNK_GROUPS = {
  leaflet: ['leaflet', 'react-leaflet', 'leaflet-draw'],
  charts: ['recharts'],
  pdf: ['jspdf', 'html2canvas'],
}

function chunker(id) {
  if (!id.includes('node_modules')) return undefined
  for (const [name, pkgs] of Object.entries(CHUNK_GROUPS)) {
    for (const pkg of pkgs) {
      if (id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`)) {
        return name
      }
    }
  }
  return undefined
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: chunker,
      },
    },
  },
})
