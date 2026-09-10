/**
 * 로그인 1단계 — 서버가 매번 새 질문을 만들어 보낸다 (카드 3, T08-C27·C28).
 *
 * allowCredentials를 비워 둔다. 그래야 브라우저가 "이 사이트에 등록해 둔 패스키" 중에서
 * 사용자가 직접 고르게 된다(discoverable credential) — 아이디를 입력할 필요가 없다.
 */

import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { methodNotAllowed, sendError, sendJson } from "../../lib/http.js";
import { resolveRp } from "../../lib/rp.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const rp = resolveRp(req);
    if (!rp.ok) return sendError(res, 400, rp.error);

    const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        // 매번 지문·얼굴·PIN을 확인받는다 (등록 때와 같은 이유).
        userVerification: "required",
    });

    const challenge = await store.createChallenge({
        challenge: options.challenge,
        type: "authentication",
    });

    sendJson(res, 200, { challengeId: challenge.id, options });
}
