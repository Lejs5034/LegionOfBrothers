import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',   // wichtig: sagt Vercel, wo die Files landen
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: './', // sorgt dafür, dass Assets im richtigen Pfad geladen werden
})
