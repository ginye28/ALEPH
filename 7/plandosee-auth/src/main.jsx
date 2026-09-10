import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./api/migrateFromT06"; // window.__migrateFromT06 노출 — 과제 6 내보내기 JSON을 로그인 계정으로 가져올 때 씁니다.

createRoot(document.getElementById("root")).render(<App />);
