// 토큰과 기본 스타일이 컴포넌트 스타일보다 먼저 로드되어야 컴포넌트가 기본값을 덮어쓸 수 있다
import './styles/tokens.css';
import './styles/base.css';
import './components/ui.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { injectDesignTokens } from './styles/injectTokens';

injectDesignTokens();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
