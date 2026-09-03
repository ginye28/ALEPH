/**
 * 등록 2단계 — 기기가 만든 공개키를 확인하고 저장한다 (카드 2, T08-C21·C22·C23).
 *
 * 여기서 받는 것은 **공개키**뿐이다. 개인키는 기기(authenticator) 안을 떠나지 않으며,
 * WebAuthn 규격상 요청 본문에 개인키를 담는 필드 자체가 존재하지 않는다.
 */

import { verifyRegistrationResponse } from "@simplewebauthn/server";
import {
    methodNotAllowed,
    readJson,
    sendError,
    sendJson,
    setSessionCookie,
} from "../../lib/http.js";
import { resolveRp } from "../../lib/rp.js";
import { SEED_NOTES } from "../../lib/seed.js";
import { currentUser } from "../../lib/session.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const rp = resolveRp(req);
    if (!rp.ok) return sendError(res, 400, rp.error);

    const body = await readJson(req);
    if (!body.challengeId || !body.response) {
        return sendError(res, 400, "challengeId와 response가 필요합니다.");
    }

    // 질문을 소진한다. 이미 썼거나 2분이 지났으면 여기서 끝난다 (T08-C31과 같은 방어).
    const taken = await store.takeChallenge({ id: body.challengeId, type: "registration" });
    if (!taken.ok) {
        const message = {
            already_used: "이미 사용된 확인 질문입니다.",
            expired: "확인 질문이 만료되었습니다. 다시 시도해 주세요.",
            not_found: "확인 질문을 찾을 수 없습니다.",
        }[taken.reason];
        return sendError(res, 400, message);
    }
    const pending = taken.row;

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: body.response,
            expectedChallenge: pending.challenge,
            expectedOrigin: rp.origin,
            expectedRPID: rp.rpID,
            requireUserVerification: false,
        });
    } catch (error) {
        return sendError(res, 400, `등록을 확인하지 못했습니다: ${error.message}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
        return sendError(res, 400, "등록을 확인하지 못했습니다.");
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    if (pending.is_new_account) {
        await store.createUser({ id: pending.user_id, displayName: pending.display_name });
        for (const note of SEED_NOTES) {
            await store.createNote({ userId: pending.user_id, ...note });
        }
    } else {
        // 패스키 추가는 반드시 지금 로그인한 사람이어야 한다.
        const signedIn = await currentUser(req);
        if (!signedIn || signedIn.user.id !== pending.user_id) {
            return sendError(res, 401, "로그인 상태가 아니어서 패스키를 추가할 수 없습니다.");
        }
    }

    await store.createCredential({
        id: credential.id,
        userId: pending.user_id,
        // 공개키를 base64url 문자열로 저장한다. 비밀번호가 아니라 공개키다.
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        deviceName: pending.device_name,
        transports: credential.transports || body.response?.response?.transports || null,
    });

    // 새로 만든 계정이면 바로 로그인 상태로 만들어 준다.
    if (pending.is_new_account) {
        const session = await store.createSession(pending.user_id);
        setSessionCookie(req, res, session.id);
    }

    sendJson(res, 200, {
        ok: true,
        credentialId: credential.id,
        deviceName: pending.device_name,
        newAccount: pending.is_new_account,
        // 기기가 이 패스키를 다른 기기와 동기화하는 종류인지(구글/애플 비밀번호 관리자 등) — T08-C26
        credentialDeviceType,
        backedUp: credentialBackedUp,
    });
}
