import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 기록은 주소(포트 포함)마다 따로 저장된다. 포트가 바뀌면 은하가 비어 보이므로
    // 다른 포트로 조용히 넘어가지 않고 항상 같은 주소에서만 실행한다.
    port: 5183,
    strictPort: true,
  },
})
