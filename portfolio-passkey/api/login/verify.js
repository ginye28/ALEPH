/**
 * 로그인 2단계 — 저장해 둔 공개키로 서명을 확인한다 (카드 3, T08-C29~C33).
 *
 * 통과하면 세션 행을 하나 만들고 그 id를 HttpOnly 쿠키로 내려준다.
 * 이 쿠키 값 안에는 아무 정보도 들어 있지 않다(JWT가 아니다) — 서버가 테이블에 들고 있다.
 */

import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
    methodNotAllowed,
    readJson,
    sendError,
    sendJson,
    setSessionCookie,
} from "../../lib/http.js";
import { resolveRp } from "../../lib/rp.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const rp = resolveRp(req);
    if (!rp.ok) return sendError(res, 400, rp.error);

    const body = await readJson(req);
    if (!body.challengeId || !body.response) {
        return sendError(res, 400, "challengeId와 response가 필요합니다.");
    }

    // 어떤 패스키로 답했는지는 응답에 실린 credential id로 찾는다 — challenge를 소진한
    // 결과와는 무관해서, 같은 왕복 안에 나란히 물어봐도 순서를 걱정할 필요가 없다.
    const credentialId = String(body.response.id || "");

    // 이미 쓴 질문으로 다시 들어오려는 시도는 여기서 끊긴다 (T08-C31).
    const { taken, credential: stored } = await store.takeChallengeWithCredential({
        id: body.challengeId,
        type: "authentication",
        credentialId,
    });
    if (!taken.ok) {
        const message = {
            already_used: "이미 사용된 확인 질문입니다.",
            expired: "확인 질문이 만료되었습니다. 다시 시도해 주세요.",
            not_found: "확인 질문을 찾을 수 없습니다.",
        }[taken.reason];
        return sendError(res, 400, message);
    }
    if (!stored) {
        // 지워진 패스키로 들어오려 해도 여기서 끊긴다 (T08-C45).
        return sendError(res, 401, "등록되지 않은 패스키입니다.");
    }

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response: body.response,
            expectedChallenge: taken.row.challenge,
            expectedOrigin: rp.origin,
            expectedRPID: rp.rpID,
            // 기기가 실제로 지문·얼굴·PIN을 확인했는지까지 서버가 검사한다.
            requireUserVerification: true,
            credential: {
                id: stored.id,
                publicKey: new Uint8Array(Buffer.from(stored.public_key, "base64url")),
                counter: Number(stored.counter),
                transports: stored.transports || undefined,
            },
        });
    } catch (error) {
        return sendError(res, 401, `서명을 확인하지 못했습니다: ${error.message}`);
    }

    if (!verification.verified) {
        return sendError(res, 401, "서명을 확인하지 못했습니다.");
    }

    // 서명 횟수를 올리는 것(복제된 기기를 나중에 알아채기 위한 값)과, 어느 패스키로
    // 들어왔는지 세션에 남기는 것(화면의 "지금 이 기기" 표시용)을 한 왕복으로 함께 한다.
    const session = await store.bumpCounterAndCreateSession({
        credentialId: stored.id,
        counter: verification.authenticationInfo.newCounter,
        userId: stored.user_id,
    });
    setSessionCookie(req, res, session.id);

    sendJson(res, 200, { ok: true, deviceName: stored.device_name });
}
