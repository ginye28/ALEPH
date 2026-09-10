/**
 * 백엔드 선택.
 *
 * 환경변수(VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY)가 있으면 실제 Supabase를 씁니다.
 * 없으면 같은 모양의 인메모리 저장소로 자동 전환합니다 — 개발 중 자격증명 없이도
 * 화면을 그대로 켤 수 있고, "안 될 때 무엇이 보이나요"(설정이 안 됐을 때)도 빈 화면 대신
 * 눈에 보이는 안내가 되게 합니다. 두 구현은 같은 메서드 이름을 가진 `db` 객체라
 * 어느 쪽을 쓰는지는 이 파일 하나만 결정합니다.
 */
import { createClient } from "@supabase/supabase-js";
import { createMemoryBackend } from "./memoryBackend";
import { createSupabaseBackend } from "./supabaseBackend";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backendMode = SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "memory";

export const supabase =
    backendMode === "supabase" ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const db = backendMode === "supabase" ? createSupabaseBackend(supabase) : createMemoryBackend();

// CDP 검사 도구가 실제 저장 상태를 비동기로 들여다볼 수 있게 노출합니다.
// anon 키는 어차피 번들 안에 그대로 들어있어 공개해도 새로 새는 비밀은 없습니다.
if (typeof window !== "undefined") {
    window.__backendMode = backendMode;
    window.__db = db;
}
