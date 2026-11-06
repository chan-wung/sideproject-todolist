import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { migrateLegacyHash } from './hooks/useView.ts'
import { markUpdateReady } from './utils/pwaUpdate.ts'

// 새 버전은 저절로 적용하지 않고 UpdateNotice로 알린다 (vite.config.ts의 registerType: 'prompt')
const updateSW = registerSW({
  onNeedRefresh() {
    markUpdateReady(() => { void updateSW(true) })
  },
})
migrateLegacyHash() // 옛 북마크(/#/report)를 /report로 바꿔 둔다

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
