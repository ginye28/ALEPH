/**
 * 영상 업로드 표. (실제 파일은 이 함수를 거치지 않는다.)
 *
 * 서버리스 함수는 요청 본문을 4.5MB까지만 받는다. 완등 영상은 10초짜리도 그걸 넘기기
 * 쉬우므로, 파일을 서버로 보내지 않고 브라우저가 Blob 저장소로 직접 올린다.
 * 이 함수는 그 업로드를 허가하는 짧은 토큰만 발급한다 — 저장소 쓰기 토큰
 * (BLOB_READ_WRITE_TOKEN)은 서버에만 남고 브라우저로 내려가지 않는다.
 */

import { handleUpload } from "@vercel/blob/client";
import { methodNotAllowed, readJson, sendError, sendJson } from "../lib/http.js";
import { blobReady } from "../lib/feed-store.js";

/** 영상 한 개 상한. 과제용 저장소라 용량을 크게 열어 둘 이유가 없다. */
const MAX_BYTES = 50 * 1024 * 1024;

const ALLOWED = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-m4v",
    "video/3gpp",
];

export default async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    if (!blobReady()) {
        return sendError(res, 503, "이 배포에는 영상 저장소가 연결돼 있지 않습니다.");
    }

    const body = await readJson(req);

    try {
        const result = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async () => ({
                allowedContentTypes: ALLOWED,
                maximumSizeInBytes: MAX_BYTES,
                // 같은 이름으로 덮어쓰는 사고를 막는다. 주소가 곧 파일이므로
                // 이름이 겹치면 남의 영상을 지워버릴 수 있다.
                addRandomSuffix: true,
            }),
            // 업로드가 끝나면 브라우저가 /api/feed로 글을 따로 올린다.
            // 그래서 여기서는 할 일이 없다 (로컬에서는 이 콜백이 아예 오지 않는다).
            onUploadCompleted: async () => {},
        });

        return sendJson(res, 200, result);
    } catch (err) {
        // 상한을 넘겼거나 형식이 안 맞으면 여기로 온다. 사용자가 고칠 수 있는 말로 돌려준다.
        const message = err && err.message ? err.message : "업로드를 시작하지 못했습니다.";
        return sendError(res, 400, message);
    }
}
