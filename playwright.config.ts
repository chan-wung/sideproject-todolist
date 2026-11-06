import { defineConfig } from '@playwright/test'

// 브라우저 통합 테스트(e2e). 빌드한 앱을 vite preview로 띄워 실제 Chrome에서 확인한다.
// - 개발 서버 포트(5173)와 겹치지 않게 4173을 쓴다.
// - 설치된 Chrome을 그대로 쓴다(channel: 'chrome'). 브라우저를 따로 내려받지 않는다.
// - 서비스 워커·오프라인·두 탭 시나리오가 있어 개발 서버가 아니라 빌드 결과(preview)를 대상으로 한다.
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
