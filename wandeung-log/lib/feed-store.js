/**
 * 공유 피드 저장소.
 *
 * 글 하나를 Blob 파일 하나(posts/<id>.json)로 둔다. 별도 DB를 붙이지 않은 이유:
 * 영상을 어차피 Blob에 올려야 하는데, 글 목록까지 같은 저장소에 두면 연결할 서비스가
 * 하나로 끝난다. 글마다 파일이 따로라 동시에 써도 서로 덮어쓰지 않는다.
 *
 * 대신 목록을 읽을 때 파일을 하나씩 받아와야 해서, 글이 수천 개로 늘면 이 구조는
 * 버티지 못한다. 그때는 Postgres로 옮겨야 한다 (지금은 상한을 MAX_FEED로 막아 둔다).
 */

import { list, put, del } from "@vercel/blob";

const POST_PREFIX = "posts/";
export const MAX_FEED = 60;

/** 이 배포에 Blob 저장소가 연결돼 있는지. 없으면 화면은 로컬 모드로 내려간다. */
export function blobReady() {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function listPosts(limit = MAX_FEED) {
    const { blobs } = await list({ prefix: POST_PREFIX, limit: MAX_FEED });

    // 파일 이름이 아니라 올라간 시각으로 정렬한다 — 최신 글이 위로.
    const newest = blobs
        .slice()
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, limit);

    const posts = await Promise.all(
        newest.map(async (b) => {
            try {
                const res = await fetch(b.url, { cache: "no-store" });
                if (!res.ok) return null;
                const post = await res.json();
                return post && typeof post === "object" ? post : null;
            } catch {
                // 글 하나가 깨져도 게시판 전체가 죽지는 않게 한다.
                return null;
            }
        }),
    );

    return posts.filter(Boolean);
}

export async function savePost(post) {
    await put(`${POST_PREFIX}${post.id}.json`, JSON.stringify(post), {
        access: "public",
        contentType: "application/json; charset=utf-8",
        addRandomSuffix: false,
        allowOverwrite: true,
    });
    return post;
}

/**
 * 글이 상한을 넘으면 오래된 것부터 지운다. 과제용 저장소라 용량을 계속 불릴 이유가 없고,
 * 목록을 읽을 때 파일을 전부 받아오므로 개수가 늘면 그대로 느려진다.
 * 붙어 있던 영상 파일도 같이 지운다.
 */
export async function prunePosts() {
    const { blobs } = await list({ prefix: POST_PREFIX, limit: 1000 });
    if (blobs.length <= MAX_FEED) return 0;

    const oldest = blobs
        .slice()
        .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))
        .slice(0, blobs.length - MAX_FEED);

    for (const b of oldest) {
        try {
            const res = await fetch(b.url, { cache: "no-store" });
            const post = res.ok ? await res.json() : null;
            if (post && post.videoUrl) await del(post.videoUrl).catch(() => {});
        } catch {
            // 영상 정리에 실패해도 글은 지운다.
        }
        await del(b.url).catch(() => {});
    }
    return oldest.length;
}
