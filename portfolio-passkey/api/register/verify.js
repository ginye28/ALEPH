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
            // 기기가 실제로 지문·얼굴·PIN을 확인했는지까지 서버가 검사한다.
            // 옵션에 required라고 적어 보내는 것만으로는 부족하다 — 응답의 UV 플래그를 봐야 한다.
            requireUserVerification: true,
        });
    } catch (error) {
        return sendError(res, 400, `등록을 확인하지 못했습니다: ${error.message}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
        return sendError(res, 400, "등록을 확인하지 못했습니다.");
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const credentialRow = {
        id: credential.id,
        // 공개키를 base64url 문자열로 저장한다. 비밀번호가 아니라 공개키다.
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        deviceName: pending.device_name,
        transports: credential.transports || body.response?.response?.transports || null,
    };

    if (pending.is_new_account) {
        // pk_credentials·pk_private_notes가 pk_users를 참조하므로 계정 생성만은
        // 앞선 왕복으로 먼저 끝내 둔다(그래야 뒤 문장에서 항상 보인다). 그 뒤
        // 패스키 저장 + 첫 계정에 까는 비공개 메모 세 줄 + 곧장 로그인 상태로
        // 만드는 세션 발급을 한 왕복으로 합친다 — 원래 5번의 왕복(계정·메모 3개·
        // 패스키·세션)이었던 것을 2번으로 줄인다.
        await store.createUser({ id: pending.user_id, displayName: pending.display_name });
        const { session } = await store.finishNewAccountCredential({
            userId: pending.user_id,
            credential: credentialRow,
            seedNotes: SEED_NOTES,
        });
        setSessionCookie(req, res, session.id);
    } else {
        // 패스키 추가는 반드시 지금 로그인한 사람이어야 한다.
        const signedIn = await currentUser(req);
        if (!signedIn || signedIn.user.id !== pending.user_id) {
            return sendError(res, 401, "로그인 상태가 아니어서 패스키를 추가할 수 없습니다.");
        }
        await store.createCredential({ ...credentialRow, userId: pending.user_id });
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
