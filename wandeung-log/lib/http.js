/**
 * 요청/응답 잡일. Vercel의 Node 서버리스 런타임에서 돌아가되, 런타임이 얹어주는
 * 편의 메서드(res.status().json())에 기대지 않고 Node 기본 API만 쓴다 —
 * 그래야 로컬에서 그냥 node로 돌려봐도 같은 코드가 동작한다.
 */

export function sendJson(res, status, body) {
    const payload = JSON.stringify(body ?? {});
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
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
 * 스트림이 그대로 오면 직접 읽는다.
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
 * 글자 수를 자르고 앞뒤 공백을 턴다. 게시판은 로그인이 없어 아무나 쓸 수 있으므로,
 * 들어오는 값은 전부 길이부터 제한한다.
 */
export function clip(value, max) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, max);
}
