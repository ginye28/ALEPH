/**
 * 재확인 1단계 — 되돌릴 수 없는 동작 직전에 "지금 이 사람이 맞는지" 다시 묻는다.
 *
 * 로그인 세션은 12시간 살아 있다. 그동안 자리를 비운 사이에 남이 와서 패스키를 지워
 * 버리면 계정을 영영 못 여는데, 그건 로그인 한 번으로 열어 줄 만한 동작이 아니다.
 * 그래서 삭제 같은 동작 앞에는 패스키를 한 번 더 요구한다.
 */

import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { methodNotAllowed, sendError, sendJson } from "../../lib/http.js";
import { resolveRp } from "../../lib/rp.js";
import { requireUser } from "../../lib/session.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const rp = resolveRp(req);
    if (!rp.ok) return sendError(res, 400, rp.error);

    const found = await requireUser(req, res);
    if (!found) return;

    // 로그인과 달리 여기서는 **이 계정의 패스키만** 답할 수 있게 좁힌다.
    // 다른 계정의 패스키를 대 봐야 재확인이 되지 않는다.
    const mine = await store.listCredentials(found.user.id);
    const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        userVerification: "required",
        allowCredentials: mine.map((c) => ({ id: c.id, transports: c.transports || undefined })),
    });

    const challenge = await store.createChallenge({
        challenge: options.challenge,
        type: "reauth",
        userId: found.user.id,
    });

    sendJson(res, 200, { challengeId: challenge.id, options });
}
