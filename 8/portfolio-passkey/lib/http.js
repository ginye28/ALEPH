/**
 * 요청/응답 잡일. Vercel의 Node 서버리스 런타임과 로컬 개발 서버(tools/dev-server.mjs)
 * 양쪽에서 똑같이 동작하도록, Vercel이 얹어주는 편의 메서드(res.status().json())에
 * 기대지 않고 Node의 기본 API만 쓴다.
 */

import { isSecureRequest } from "./rp.js";

export const SESSION_COOKIE = "pk_session";
export const SESSION_HOURS = 12;

export function sendJson(res, status, body) {
    const payload = JSON.stringify(body ?? {});
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    // 인증 응답은 절대 캐시되면 안 된다.
    res.setHeader("Cache-Control", "no-store");
    res.end(payload);
}

export function sendError(res, status, message) {
    sendJson(res, status, { error: message });
}

/** 405 응답 — 허용된 메서드를 함께 알려준다. */
export function methodNotAllowed(res, allowed) {
    res.setHeader("Allow", allowed.join(", "));
    sendError(res, 405, `이 주소는 ${allowed.join("/")} 만 받습니다.`);
}

/**
 * 본문을 JSON으로 읽는다. Vercel은 이미 req.body를 채워 두므로 그걸 먼저 쓰고,
 * 로컬 개발 서버처럼 스트림이 그대로면 직접 읽는다.
 */
export async function readJson(req) {
    if (req.body && typeof req.body === "object") return req.body;
    if (typeof req.body === "string") {
        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length === 0) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        return {};
    }
}

/**
 * 요청을 보낸 쪽의 주소 — 계정 무한 생성을 막는 속도 제한(register/options.js)에 쓴다.
 * Vercel은 실제 클라이언트 주소를 x-forwarded-for에 얹어 준다(맨 앞 값이 클라이언트,
 * 그 뒤는 거쳐 온 프록시들이다). 로컬 개발 서버는 이 헤더를 안 얹으므로 null을
 * 돌려주고, 그러면 호출한 쪽이 속도 제한 자체를 건너뛴다(로컬 개발에는 필요 없다).
 */
export function clientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) return String(forwarded).split(",")[0].trim() || null;
    return null;
}

export function parseCookies(req) {
    const header = req.headers.cookie;
    if (!header) return {};
    const out = {};
    for (const part of header.split(";")) {
        const eq = part.indexOf("=");
        if (eq < 0) continue;
        out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
    }
    return out;
}

/**
 * 세션 쿠키를 심는다.
 * HttpOnly — 페이지의 자바스크립트가 값을 읽을 수 없다(XSS로 세션을 훔쳐가는 길을 막는다).
 * Secure   — HTTPS에서만 전송. localhost 개발에서는 붙이지 않는다(붙이면 아예 저장이 안 된다).
 * SameSite=Lax — 다른 사이트가 몰래 이 쿠키를 붙여 요청을 보내는 것(CSRF)을 막는다.
 */
export function setSessionCookie(req, res, sessionId) {
    const bits = [
        `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${SESSION_HOURS * 60 * 60}`,
    ];
    if (isSecureRequest(req)) bits.push("Secure");
    res.setHeader("Set-Cookie", bits.join("; "));
}

export function clearSessionCookie(req, res) {
    const bits = [`${SESSION_COOKIE}=`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"];
    if (isSecureRequest(req)) bits.push("Secure");
    res.setHeader("Set-Cookie", bits.join("; "));
}
