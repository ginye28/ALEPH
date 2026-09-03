/**
 * 등록 1단계 — 서버가 일회용 질문(challenge)을 만들어 보낸다 (카드 2, T08-C19·C20).
 *
 * 이 질문은 요청마다 새로 만들어지고(라이브러리가 crypto 난수로 생성), DB에 보관됐다가
 * 확인 단계에서 딱 한 번만 쓰인다.
 */

import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomUUID } from "node:crypto";
import { methodNotAllowed, readJson, sendError, sendJson } from "../../lib/http.js";
import { resolveRp } from "../../lib/rp.js";
import { currentUser } from "../../lib/session.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    const rp = resolveRp(req);
    if (!rp.ok) return sendError(res, 400, rp.error);

    const body = await readJson(req);
    const deviceName = String(body.deviceName || "").trim().slice(0, 40) || "이름 없는 패스키";

    // 로그인한 채로 부르면 "이 계정에 패스키 하나 더"(카드 4),
    // 로그인 없이 부르면 "새 계정 만들기"다.
    const signedIn = await currentUser(req);

    let userId;
    let displayName;
    let excludeCredentials = [];

    if (signedIn) {
        userId = signedIn.user.id;
        displayName = signedIn.user.display_name;
        // 이미 등록된 자격증명을 알려주면, 같은 기기로 또 등록하려 할 때 브라우저가 막아준다.
        const existing = await store.listCredentials(userId);
        excludeCredentials = existing.map((c) => ({
            id: c.id,
            transports: c.transports || undefined,
        }));
    } else {
        // 아직 계정을 만들지 않는다. 확인 단계를 통과해야 그때 만든다 (T08-C25).
        userId = randomUUID();
        displayName = deviceName;
    }

    const options = await generateRegistrationOptions({
        rpName: rp.rpName,
        rpID: rp.rpID,
        userID: new TextEncoder().encode(userId),
        userName: displayName,
        userDisplayName: displayName,
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
            // 아이디 없이 로그인하려면(discoverable credential) 기기가 자격증명을 직접 들고 있어야 한다.
            residentKey: "required",
            requireResidentKey: true,
            // 지문·얼굴·PIN 확인을 반드시 거치게 한다. 이걸 'preferred'로 두면 기기가 이미
            // 잠금 해제돼 있을 때 아무 확인 없이 패스키가 응답할 수 있어서, 남이 내 열린
            // 노트북 앞에 앉기만 해도 열린다. 그 대가로 PIN을 설정하지 않은 보안 키는
            // 쓸 수 없다 — 잠금의 세기를 그쪽에 맞추지 않기로 했다.
            userVerification: "required",
        },
    });

    const challenge = await store.createChallenge({
        challenge: options.challenge,
        type: "registration",
        userId,
        isNewAccount: !signedIn,
        displayName,
        deviceName,
    });

    sendJson(res, 200, { challengeId: challenge.id, options });
}
