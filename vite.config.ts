import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': 새 버전이 준비돼도 화면을 저절로 다시 불러오지 않는다. 쓰던 글이 사라지지 않도록 사용자가 새로고침을 고른다 (UpdateNotice).
      registerType: 'prompt',
      workbox: {
        // 글꼴(약 1MB짜리 12개)은 미리 전부 받아 두지 않고, 화면에서 실제로 쓰여 내려받은 것만 한 번 저장해 오프라인에서도 쓴다.
        // 서비스 워커가 화면을 맡기 전에 받은 글꼴은 다음 접속부터 저장된다 (처음엔 시스템 글꼴로 보일 수 있다).
        runtimeCaching: [
          {
            urlPattern: /\.woff2?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-fonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      pwaAssets: { config: true },
      manifest: {
        name: 'Todo List',
        short_name: 'Todo',
        description: '할 일을 관리하는 로컬 투두 앱',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0064FF',
        background_color: '#F2F4F6',
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
      },
    },
  },
})
