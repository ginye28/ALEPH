/**
 * 로컬 개발 서버.
 *
 * Vercel에 올리면 api/ 폴더의 파일 하나하나가 서버리스 함수가 된다. 로컬에서도 **같은
 * 핸들러 파일을 그대로** 돌리려고, Vercel의 라우팅 규칙(`api/a/b.js` → `/api/a/b`,
 * `api/a/[id].js` → `/api/a/무엇이든`)만 흉내 내는 얇은 서버를 둔다.
 * 이렇게 해야 로컬에서 통과한 것이 배포에서도 같은 코드로 통과한다.
 *
 *   node tools/dev-server.mjs        → http://localhost:5179
 *
 * localhost는 WebAuthn이 HTTPS 없이도 허용하는 유일한 예외라, 인증서 없이 개발할 수 있다.
 */

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const API_ROOT = join(ROOT, "api");
const PORT = Number(process.env.PORT || 5179);

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".md": "text/markdown; charset=utf-8",
};

/** `[id].js` 같은 동적 이름 찾기. */
function dynamicEntry(dir, { directory }) {
    if (!existsSync(dir)) return null;
    for (const name of readdirSync(dir)) {
        const match = name.match(/^\[(.+?)\](\.js)?$/);
        if (!match) continue;
        const full = join(dir, name);
        const isDir = statSync(full).isDirectory();
        if (isDir !== directory) continue;
        if (!directory && !name.endsWith(".js")) continue;
        return { param: match[1], path: full };
    }
    return null;
}

/** /api/a/b/c → 어느 파일이 처리하는지 + 동적 구간에서 뽑은 값. */
function resolveApiRoute(segments) {
    let dir = API_ROOT;
    const params = {};

    for (let i = 0; i < segments.length; i += 1) {
        const segment = decodeURIComponent(segments[i]);
        const isLast = i === segments.length - 1;

        if (isLast) {
            const direct = join(dir, `${segment}.js`);
            if (existsSync(direct)) return { file: direct, params };

            const asIndex = join(dir, segment, "index.js");
            if (existsSync(asIndex)) return { file: asIndex, params };

            const dyn = dynamicEntry(dir, { directory: false });
            if (dyn) {
                params[dyn.param] = segment;
                return { file: dyn.path, params };
            }
            return null;
        }

        const asDir = join(dir, segment);
        if (existsSync(asDir) && statSync(asDir).isDirectory()) {
            dir = asDir;
            continue;
        }
        const dynDir = dynamicEntry(dir, { directory: true });
        if (dynDir) {
            params[dynDir.param] = segment;
            dir = dynDir.path;
            continue;
        }
        return null;
    }
    return null;
}

/** api/ 와 lib/ 를 통틀어 가장 최근 수정 시각 — 모듈 캐시를 깨는 열쇠로 쓴다. */
function newestSourceTime() {
    let newest = 0;
    const walk = (dir) => {
        if (!existsSync(dir)) return;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (full.endsWith(".js")) newest = Math.max(newest, statSync(full).mtimeMs);
        }
    };
    walk(API_ROOT);
    walk(join(ROOT, "lib"));
    return newest;
}

function serveStatic(pathname, res) {
    const relative = pathname === "/" ? "index.html" : normalize(pathname).replace(/^[/\\]+/, "");
    const target = join(ROOT, relative);

    // 프로젝트 밖으로 나가는 경로는 거절한다.
    if (!target.startsWith(ROOT) || !existsSync(target) || statSync(target).isDirectory()) {
        res.statusCode = 404;
        res.end("찾을 수 없습니다.");
        return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[extname(target)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(readFileSync(target));
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (!url.pathname.startsWith("/api/")) return serveStatic(url.pathname, res);

    const segments = url.pathname.slice("/api/".length).split("/").filter(Boolean);
    const route = resolveApiRoute(segments);

    if (!route) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "그런 주소가 없습니다." }));
        return;
    }

    // Vercel이 넣어주는 것과 같은 모양으로 맞춘다.
    req.query = { ...Object.fromEntries(url.searchParams), ...route.params };

    try {
        // 파일이 바뀌면 다시 읽도록 수정 시각을 쿼리로 붙인다 — 안 그러면 ES 모듈 캐시 때문에
        // 핸들러를 고쳐도 서버를 껐다 켜기 전까지 옛 코드가 돈다.
        // 핸들러 하나만 보면 lib/ 를 고쳤을 때 반영되지 않으므로, api/ 와 lib/ 를 통틀어
        // 가장 최근 수정 시각을 쓴다.
        const module = await import(`${pathToFileURL(route.file).href}?v=${newestSourceTime()}`);
        await module.default(req, res);
    } catch (error) {
        console.error(`[api] ${url.pathname}`, error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
        }
        res.end(JSON.stringify({ error: `서버 오류: ${error.message}` }));
    }
});

server.listen(PORT, () => {
    console.log(`소개 페이지: http://localhost:${PORT}`);
    console.log(`저장소: ${process.env.SUPABASE_URL ? "Supabase" : "로컬 파일(.dev-store/)"}`);
});
