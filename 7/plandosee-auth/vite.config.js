import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 포트를 고정합니다 — 검사기와 촬영기가 이 주소를 그대로 씁니다.
export default defineConfig({
    plugins: [react({ jsxImportSource: "@emotion/react" })],
    server: { port: 5178, strictPort: true },
});
