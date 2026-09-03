/**
 * 비공개 자료 한 건을 id로 직접 열어 보기 (카드 5, T08-C37·C38).
 *
 * 남의 자료 id를 넣어 요청하면 **404**를 돌려준다 — "권한이 없다"(403)라고 답하면
 * 그 id가 존재한다는 사실 자체를 알려주는 셈이라, 있는지 없는지도 밝히지 않는다.
 * 로그인 자체가 안 되어 있으면 그보다 앞에서 401로 끊긴다.
 */

import { methodNotAllowed, sendError, sendJson } from "../../lib/http.js";
import { requireUser } from "../../lib/session.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const found = await requireUser(req, res);
    if (!found) return;

    const id = String(req.query?.id || "");
    const note = await store.getNote(id);

    // 없는 것과 남의 것을 똑같이 취급한다.
    if (!note || note.user_id !== found.user.id) {
        return sendError(res, 404, "그런 자료가 없습니다.");
    }

    sendJson(res, 200, {
        note: {
            id: note.id,
            kind: note.kind,
            title: note.title,
            body: note.body,
            createdAt: note.created_at,
        },
    });
}
