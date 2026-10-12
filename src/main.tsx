// 토큰을 가장 먼저 불러온다. 뒤의 모듈이 시작하면서 화면 배율(root 글자 크기)을 읽는다.
import './styles/tokens.css'
import './styles/base.css'
import './motion/reveal.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app/App'
import { initMotion } from './store/motionStore'
import { injectTokens } from './styles/injectTokens'

injectTokens()
initMotion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
