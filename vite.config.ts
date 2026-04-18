import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/quran-oauth': {
        target: 'https://oauth2.quran.foundation',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/quran-oauth/, ''),
      },
    },
  },
})
