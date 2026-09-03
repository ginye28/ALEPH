/**
 * 지금 누구인지 + 이 계정에 등록된 패스키 목록 (카드 4, T08-C43).
 *
 * 세션이 없으면 401. 화면은 이 응답을 보고 비공개 영역을 그릴지 말지 정하지만,
 * 그건 편의일 뿐이고 실제 차단은 자료를 내려주는 쪽(private-notes)이 한다.
 */

import { methodNotAllowed, sendJson } from "../lib/http.js";
import { requireUser } from "../lib/session.js";
import { store } from "../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const found = await requireUser(req, res);
    if (!found) return;

    const credentials = await store.listCredentials(found.user.id);

    sendJson(res, 200, {
        account: {
            id: found.user.id,
            displayName: found.user.display_name,
            createdAt: found.user.created_at,
        },
        credentials: credentials.map((c) => ({
            id: c.id,
            // 전체 id는 화면에 필요 없다 — 앞 12자만 보여준다.
            shortId: c.id.slice(0, 12),
            deviceName: c.device_name,
            createdAt: c.created_at,
            // 서버가 이 패스키에 대해 갖고 있는 값 전부가 이것이다.
            // 공개키는 이름 그대로 공개해도 되는 값이라 그대로 내려준다 — 이 값으로는
            // 서명을 만들 수 없고(확인만 가능하다), 비밀번호처럼 쓸 수도 없다 (T08-C22).
            publicKey: c.public_key,
            signCount: Number(c.counter),
        })),
    });
}
