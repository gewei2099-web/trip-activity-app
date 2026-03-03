import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isPages = process.env.BUILD_PAGES === '1'
const base = isPages ? '/trip-activity-app/' : './'
const buildTime = new Date().toISOString().slice(0, 19).replace('T', ' ')

export default defineConfig({
  base,
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '行程活动记录',
        short_name: '行程',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0d7377',
        icons: [
          { src: `${base}icon.svg`, sizes: '192x192', type: 'image/svg+xml' },
          { src: `${base}icon.svg`, sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  server: { host: true, port: 5174 }
})
