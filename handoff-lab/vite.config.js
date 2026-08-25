import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({jsxImportSource: "@emotion/react"})],
  // tools/capture.mjs · tools/check.mjs 가 기본으로 여는 주소와 맞춥니다.
  server: { port: 5175 },
})
