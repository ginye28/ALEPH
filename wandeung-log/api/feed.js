/**
 * 공유 게시판. GET이면 최근 글 목록, POST면 새 글.
 *
 * 로그인이 없다. 닉네임은 본인이 적는 이름일 뿐 신원이 아니며, 그래서 글 수정·삭제도
 * 열어 두지 않았다 (남의 글을 지울 수 있게 되기 때문). 오래된 글은 상한을 넘으면
 * 서버가 자동으로 정리한다.
 */

import { methodNotAllowed, readJson, sendError, sendJson, clip } from "../lib/http.js";
import { blobReady, listPosts, savePost, prunePosts, MAX_FEED } from "../lib/feed-store.js";

/** 화면과 같은 난이도 눈금 — 여기 없는 값은 받지 않는다. */
const GRADE_IDS = [
    "red", "orange", "yellow", "green", "sky",
    "navy", "purple", "brown", "black", "white",
];

const BLOB_HOST_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

export default async function handler(req, res) {
    if (!blobReady()) {
        return sendError(res, 503, "이 배포에는 공유 저장소가 연결돼 있지 않습니다.");
    }

    if (req.method === "GET") {
        const posts = await listPosts();
        return sendJson(res, 200, { posts, max: MAX_FEED });
    }

    if (req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);

    const body = await readJson(req);

    const title = clip(body.title, 60);
    const text = clip(body.body, 800);
    if (!title) return sendError(res, 400, "제목을 적어 주세요.");
    if (!text) return sendError(res, 400, "내용을 적어 주세요.");

    const grade = GRADE_IDS.includes(body.grade) ? body.grade : "";

    // 영상 주소는 우리 Blob 저장소에서 온 것만 받는다. 그러지 않으면 남의 주소를
    // 넣어 이 게시판을 아무 링크나 퍼뜨리는 판으로 쓸 수 있다.
    let videoUrl = "";
    if (typeof body.videoUrl === "string" && BLOB_HOST_RE.test(body.videoUrl)) {
        videoUrl = body.videoUrl.slice(0, 500);
    }

    const post = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        author: clip(body.author, 20) || "익명",
        gym: clip(body.gym, 40),
        grade,
        sent: body.sent === true,
        hasResult: body.sent === true || body.sent === false,
        title,
        body: text,
        videoUrl,
        createdAt: new Date().toISOString(),
    };

    await savePost(post);
    // 정리에 실패해도 글쓰기는 성공으로 본다 — 사용자가 할 수 있는 일이 없다.
    prunePosts().catch(() => {});

    return sendJson(res, 201, { post });
}
