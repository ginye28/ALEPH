/**
 * 패스키 삭제 (카드 4, T08-C44·C45·C46).
 *
 * 마지막 한 개를 지우는 것도 **막지 않는다.** 이메일도 비밀번호도 없으니 마지막 패스키를
 * 지우면 그 계정에는 다시 들어올 방법이 없다 — 그게 패스워드리스의 실제 비용이고,
 * 통과 기준이 요구하는 것은 "막았다"가 아니라 "어떻게 되는지 적혀 있는가"다.
 * 대신 화면이 마지막 한 개임을 명확히 경고하고, 응답에도 남은 개수를 실어 보낸다.
 */

import { clearSessionCookie, methodNotAllowed, sendError, sendJson } from "../../lib/http.js";
import { requireUser } from "../../lib/session.js";
import { store } from "../../lib/store.js";

export default async function handler(req, res) {
    if (req.method !== "DELETE") return methodNotAllowed(res, ["DELETE"]);

    const found = await requireUser(req, res);
    if (!found) return;

    const id = String(req.query?.id || "");

    // user_id 조건이 함께 걸려 있어 남의 패스키는 애초에 지워지지 않는다.
    const deleted = await store.deleteCredential({ id, userId: found.user.id });
    if (!deleted) return sendError(res, 404, "그런 패스키가 없습니다.");

    const remaining = await store.listCredentials(found.user.id);

    // 마지막 패스키를 지웠다면 이 계정은 더 이상 열 수 없다. 세션도 함께 끊어
    // "지웠는데 아직 열려 있는" 어정쩡한 상태를 남기지 않는다.
    if (remaining.length === 0) {
        await store.deleteSessionsForUser(found.user.id);
        clearSessionCookie(req, res);
    }

    sendJson(res, 200, {
        ok: true,
        remaining: remaining.length,
        accountUnreachable: remaining.length === 0,
    });
}
