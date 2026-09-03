/**
 * 재확인 2단계 — 서명이 맞으면 세션의 reauth_at을 지금으로 찍는다.
 *
 * 로그인과 다른 점: **새 세션을 만들지 않는다.** 이미 있는 세션에 "방금 확인받았다"는
 * 표시만 남긴다. 그 표시가 5분 안쪽일 때만 패스키 삭제가 허용된다.
 */

import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { methodNotAllowed, readJson, sendError, sendJson } from "../../lib/http.js";
import { resolveRp } from "../../lib/rp.js";
import { requireUser } from "../../lib/session.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const rp = resolveRp(req);
    if (!rp.ok) return sendError(res, 400, rp.error);

    const found = await requireUser(req, res);
    if (!found) return;

    const body = await readJson(req);
    if (!body.challengeId || !body.response) {
        return sendError(res, 400, "challengeId와 response가 필요합니다.");
    }

    const taken = await store.takeChallenge({ id: body.challengeId, type: "reauth" });
    if (!taken.ok) {
        const message = {
            already_used: "이미 사용된 확인 질문입니다.",
            expired: "확인 질문이 만료되었습니다. 다시 시도해 주세요.",
            not_found: "확인 질문을 찾을 수 없습니다.",
        }[taken.reason];
        return sendError(res, 400, message);
    }

    // 이 질문이 정말 이 계정에게 발급된 것인지 확인한다.
    if (taken.row.user_id !== found.user.id) {
        return sendError(res, 401, "다른 계정에 발급된 확인 질문입니다.");
    }

    const stored = await store.getCredential(String(body.response.id || ""));
    // 남의 패스키로는 내 계정을 재확인할 수 없다.
    if (!stored || stored.user_id !== found.user.id) {
        return sendError(res, 401, "이 계정의 패스키가 아닙니다.");
    }

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response: body.response,
            expectedChallenge: taken.row.challenge,
            expectedOrigin: rp.origin,
            expectedRPID: rp.rpID,
            requireUserVerification: true,
            credential: {
                id: stored.id,
                publicKey: new Uint8Array(Buffer.from(stored.public_key, "base64url")),
                counter: Number(stored.counter),
                transports: stored.transports || undefined,
            },
        });
    } catch (error) {
        return sendError(res, 401, `확인하지 못했습니다: ${error.message}`);
    }

    if (!verification.verified) return sendError(res, 401, "확인하지 못했습니다.");

    await store.updateCounter(stored.id, verification.authenticationInfo.newCounter);
    await store.touchReauth(found.session.id);

    sendJson(res, 200, { ok: true, deviceName: stored.device_name });
}
