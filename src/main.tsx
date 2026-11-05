import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { migrateLegacyHash } from './hooks/useView.ts'

registerSW()
migrateLegacyHash() // 옛 북마크(/#/report)를 /report로 바꿔 둔다

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
