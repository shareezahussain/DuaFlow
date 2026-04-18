import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/token': {
        target: 'https://oauth2.quran.foundation',
        changeOrigin: true,
        rewrite: () => '/oauth2/token',
      },
    },
  },
})
