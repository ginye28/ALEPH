/**
 * 인증 (7.md).
 *
 * 가입·로그인·로그아웃·세션조회를 전부 Supabase Auth(GoTrue)에 위임합니다 — 비밀번호는
 * 이 파일도, 이 앱의 어떤 코드도 손으로 저장·비교하지 않습니다(설계도 원칙 2).
 * Supabase 자격증명이 없는 개발 환경(memoryBackend)에서는 같은 모양의 인메모리 목업으로
 * 대체합니다 — client.js의 백엔드 자동 전환 원칙을 인증에도 그대로 적용합니다.
 */
import { newId } from "../core/ids";
import { backendMode, supabase } from "./client";

// GoTrue의 실제 기본 오류 문구. 계정이 없는 경우와 비밀번호만 틀린 경우를 구분하지 않아
// 계정 존재 여부를 흘리지 않습니다 — 메모리 목업도 같은 문구를 씁니다(검사 20).
const GENERIC_LOGIN_ERROR = "Invalid login credentials";
const ALREADY_REGISTERED_ERROR = "User already registered";

const memoryAuth = (() => {
    const users = []; // { id, email, password }
    let session = null;
    const listeners = new Set();

    const notify = (event) => listeners.forEach((fn) => fn(event, session));

    const makeSession = (user) => ({
        access_token: `memory.${user.id}.${Date.now()}`,
        refresh_token: `memory-refresh.${user.id}.${Date.now()}`,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: user.id, email: user.email },
    });

    return {
        async signUp({ email, password }) {
            if (users.some((u) => u.email === email)) {
                return { data: { user: null, session: null }, error: { message: ALREADY_REGISTERED_ERROR } };
            }
            const user = { id: newId(), email, password };
            users.push(user);
            session = makeSession(user);
            notify("SIGNED_IN");
            return { data: { user: session.user, session }, error: null };
        },
        async signInWithPassword({ email, password }) {
            const user = users.find((u) => u.email === email && u.password === password);
            if (!user) {
                return { data: { user: null, session: null }, error: { message: GENERIC_LOGIN_ERROR } };
            }
            session = makeSession(user);
            notify("SIGNED_IN");
            return { data: { user: session.user, session }, error: null };
        },
        async signOut() {
            session = null;
            notify("SIGNED_OUT");
            return { error: null };
        },
        async getSession() {
            return { data: { session }, error: null };
        },
        onAuthStateChange(callback) {
            listeners.add(callback);
            return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
        },
    };
})();

const client = backendMode === "supabase" ? supabase.auth : memoryAuth;

export const signUp = (email, password) => client.signUp({ email, password });
export const signIn = (email, password) => client.signInWithPassword({ email, password });
export const signOut = () => client.signOut();
export const getSession = () => client.getSession();
export const onAuthStateChange = (callback) => client.onAuthStateChange(callback);

/**
 * 로그인한 본인 소유의 계획·이력·할일·실행기록·고칠점을 전부 하드 삭제합니다
 * (schema.sql의 delete_my_data() — RLS 범위 안에서만 동작해 남의 행은 건드릴 수 없습니다).
 * auth.users의 가입 정보 자체는 service_role 관리자 API가 필요해 이 앱에서는 지우지
 * 못합니다 — AccountSection이 그 사실을 화면에 안내합니다.
 */
export const deleteMyData = async () => {
    if (backendMode !== "supabase") {
        return { error: { message: "메모리 저장소에서는 계정 삭제를 시험해 볼 수 없습니다 (Supabase 미설정)" } };
    }
    const { error } = await supabase.rpc("delete_my_data");
    return { error };
};

// Error의 message는 기본적으로 열거 불가능(non-enumerable) 속성이라, CDP의
// Runtime.evaluate({returnByValue:true})로 직렬화하면 조용히 사라집니다(결과가 {}로 옴).
// check.mjs 쪽에서 error.message가 "undefined"로 보이는 걸 막으려고 여기서 평범한
// (열거 가능한) 객체로 한 번 더 감쌉니다 — 화면 코드(AuthForm 등)는 원래 auth 객체를 그대로
// 쓰므로 이 정규화의 영향을 받지 않습니다.
const serializable = (error) => (error ? { message: error.message, status: error.status, name: error.name } : null);

if (typeof window !== "undefined") {
    // check.mjs가 가입·로그인·로그아웃을 사람 손 없이 재현하는 데 씁니다.
    window.__auth = {
        signUp: async (email, password) => {
            const { data, error } = await signUp(email, password);
            return { data, error: serializable(error) };
        },
        signIn: async (email, password) => {
            const { data, error } = await signIn(email, password);
            return { data, error: serializable(error) };
        },
        signOut,
        getSession,
        deleteMyData: async () => {
            const { error } = await deleteMyData();
            return { error: serializable(error) };
        },
    };
}
