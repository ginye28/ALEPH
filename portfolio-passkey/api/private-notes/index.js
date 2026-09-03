/**
 * 비공개 자료 — 목록 조회와 추가 (카드 1·5).
 *
 * 세션이 없으면 401이고 몸통에 비공개 내용이 한 글자도 실리지 않는다 (T08-C16·C17).
 *
 * ★ 주인을 정하는 곳 (T08-C40·C41) ★
 * 아래 createNote 호출의 userId는 **세션에서 뽑은 값**이다. 요청 본문에 user_id를 적어
 * 보내도 읽지 않는다. 클라이언트가 주인을 고를 수 있는 경로가 아예 없다.
 */

import { methodNotAllowed, readJson, sendError, sendJson } from "../../lib/http.js";
import { requireUser } from "../../lib/session.js";
import { store } from "../../lib/store.js";

const KINDS = ["project_memo", "target_company", "retro"];

export default async function handler(req, res) {
    const found = await requireUser(req, res);
    if (!found) return;

    if (req.method === "GET") {
        const notes = await store.listNotes(found.user.id);
        return sendJson(res, 200, { notes: notes.map(shape) });
    }

    if (req.method === "POST") {
        const body = await readJson(req);
        const kind = KINDS.includes(body.kind) ? body.kind : "retro";
        const title = String(body.title || "").trim().slice(0, 80);
        const text = String(body.body || "").trim().slice(0, 1000);
        if (!title || !text) return sendError(res, 400, "제목과 내용이 필요합니다.");

        const note = await store.createNote({
            userId: found.user.id, // ← 본문의 user_id가 아니라 세션의 주인
            kind,
            title,
            body: text,
        });
        return sendJson(res, 201, { note: shape(note) });
    }

    return methodNotAllowed(res, ["GET", "POST"]);
}

function shape(note) {
    return {
        id: note.id,
        kind: note.kind,
        title: note.title,
        body: note.body,
        createdAt: note.created_at,
    };
}
