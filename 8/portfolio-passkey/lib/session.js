/**
 * 세션 확인. 비공개 자료에 닿는 모든 경로가 여기를 지난다.
 *
 * 중요한 규칙 하나: **주인은 요청 본문이 아니라 세션이 정한다.**
 * 요청 본문에 user_id를 적어 보내도 아래 함수가 돌려주는 값만 쓰이므로 아무 소용이 없다
 * (T08-C40).
 */

import { parseCookies, SESSION_COOKIE, sendError } from "./http.js";
import { store } from "./store.js";

/** 쿠키의 세션이 살아 있으면 {session, user}, 아니면 null. */
export async function currentUser(req) {
    const sessionId = parseCookies(req)[SESSION_COOKIE];
    if (!sessionId) return null;

    // getSession + getUser 두 번의 왕복 대신 JOIN 한 번 — 인증이 필요한 요청은
    // 전부 여기를 지나므로 이 하나를 줄이는 게 가장 값이 크다.
    return store.getSessionWithUser(sessionId);
}

/**
 * 세션이 없으면 401로 끊고 null을 돌려준다.
 * 화면에서 숨기는 것이 아니라 서버가 거절하는 지점이 바로 여기다 (T08-C16·C17).
 */
export async function requireUser(req, res) {
    const found = await currentUser(req);
    if (!found) {
        sendError(res, 401, "로그인이 필요합니다.");
        return null;
    }
    return found;
}
