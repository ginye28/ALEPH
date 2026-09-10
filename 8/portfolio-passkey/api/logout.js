/**
 * 로그아웃 — 세션 행을 지운다 (T08-C33).
 *
 * 지우는 순간부터 같은 쿠키 값으로 무엇을 요청해도 통하지 않는다. 세션 id 자체에는
 * 아무 의미가 없고 테이블에 있느냐 없느냐가 전부이기 때문이다 — 서명된 토큰(JWT)이었다면
 * 만료 전까지 서명이 계속 유효해서 이렇게 단순하지 않았을 것이다.
 */

import {
    clearSessionCookie,
    methodNotAllowed,
    parseCookies,
    sendJson,
    SESSION_COOKIE,
} from "../lib/http.js";
import { store } from "../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const sessionId = parseCookies(req)[SESSION_COOKIE];
    if (sessionId) await store.deleteSession(sessionId);

    clearSessionCookie(req, res);
    sendJson(res, 200, { ok: true });
}
