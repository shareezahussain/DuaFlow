import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env vars (including non-VITE_ ones) for use in proxy config
  const env = loadEnv(mode, process.cwd(), '')

  const clientId     = env.VITE_QURAN_CLIENT_ID     ?? ''
  const clientSecret = env.QF_CLIENT_SECRET ?? ''
  const authBase    = env.VITE_QURAN_AUTH_BASE ?? env.VITE_QURAN_OAUTH_URL?.replace('/oauth2/token', '')
  const contentBase = env.VITE_QURAN_CONTENT_BASE
  const basicAuth    = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    server: {
      proxy: {
        // Content API token (client_credentials)
        '/api/token': {
          target: authBase,
          changeOrigin: true,
          rewrite: () => '/oauth2/token',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Basic ${basicAuth}`)
            })
          },
        },
        '/api/user-token': {
          target: authBase,
          changeOrigin: true,
          rewrite: () => '/oauth2/token',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Basic ${basicAuth}`)
            })
          },
        },
        '/api/refresh-token': {
          target: authBase,
          changeOrigin: true,
          rewrite: () => '/oauth2/token',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Basic ${basicAuth}`)
            })
          },
        },
        // Content API — proxied to avoid CORS
        '/api/quran': {
          target: contentBase,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/quran/, '/content/api/v4'),
        },
        // Bookmarks API — prelive, avoid CORS in dev
        '/api/bookmarks': {
          target: contentBase,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bookmarks/, '/auth/v1/bookmarks'),
        },
        // OIDC userinfo — proxied to avoid CORS in dev
        '/api/userinfo': {
          target: authBase,
          changeOrigin: true,
          rewrite: () => '/oauth2/userinfo',
        },
      },
    },
  }
})
