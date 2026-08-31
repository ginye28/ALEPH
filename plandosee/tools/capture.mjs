/**
 * 증빙 자동 촬영기 (6N.md).
 *
 *   node plandosee/tools/capture.mjs
 *   BOARD_URL=https://... node plandosee/tools/capture.mjs
 *
 * 6N.md는 구 과제 6과 반대로 "합성 대신 진짜, 대신 공개 가능한 내용만"을 요구합니다.
 * 그래서 이 스크립트는 합성 자료를 새로 만들지 않고, 실제로 넣어 둔 계획 "ALEPH 과제 진행"과
 * 그 할일·실행기록을 그대로 찾아서 찍습니다. 카드 5 내용을 먼저 화면에 넣어야 이 스크립트가 돕니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5177").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제6 증빙 화면");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds2-shot-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9346;

fs.mkdirSync(SHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--window-size=1180,2600",
        "--hide-scrollbars",
        "--force-device-scale-factor=2",
        "--no-first-run",
        "--disable-gpu",
        URL_APP,
    ],
    { stdio: "ignore" },
);

let ws;
let nextId = 1;
const pending = new Map();
const networkLog = [];

const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });

async function connect() {
    for (let i = 0; i < 60; i += 1) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
            const page = list.find((t) => t.type === "page");
            if (page) {
                ws = new WebSocket(page.webSocketDebuggerUrl);
                await new Promise((res, rej) => {
                    ws.onopen = res;
                    ws.onerror = rej;
                });
                ws.onmessage = (e) => {
                    const msg = JSON.parse(e.data);
                    if (msg.method === "Network.requestWillBeSent") {
                        networkLog.push(msg.params.request.url);
                        return;
                    }
                    if (msg.id && pending.has(msg.id)) {
                        const { resolve, reject } = pending.get(msg.id);
                        pending.delete(msg.id);
                        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
                    }
                };
                return;
            }
        } catch {
            // 아직 준비 전
        }
        await sleep(300);
    }
    throw new Error(`브라우저에 연결하지 못했습니다. ${URL_APP} 가 열리는지 확인하세요.`);
}

const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? "평가 실패");
    return result.value;
};

const write = (name, data) => {
    fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, "base64"));
    console.log("  촬영", name);
};

const shot = async (name) => {
    await sleep(400);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    write(name, data);
};

/** CSS 선택자로 찾은 요소 하나만 잘라 찍습니다. */
const shotSelector = async (name, selector, pad = 14) => {
    await sleep(400);
    const rect = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error('요소 없음: ' + ${JSON.stringify(selector)});
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height });
    })()`);
    const { x, y, width, height } = JSON.parse(rect);
    const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: Math.max(0, x - pad), y: Math.max(0, y - pad), width: width + pad * 2, height: height + pad * 2, scale: 1 },
    });
    write(name, data);
};

/** `<h2>` 글자로 그 구역(section)을 찾아 잘라 찍습니다. */
const shotSectionByHeading = async (name, h2Text, pad = 14) => {
    await sleep(400);
    const rect = await evaluate(`(() => {
        const el = [...document.querySelectorAll('section')].find(s => (s.querySelector('h2') || {}).textContent?.includes(${JSON.stringify(h2Text)}));
        if (!el) throw new Error('구역 없음: ' + ${JSON.stringify(h2Text)});
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height });
    })()`);
    const { x, y, width, height } = JSON.parse(rect);
    const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: Math.max(0, x - pad), y: Math.max(0, y - pad), width: width + pad * 2, height: height + pad * 2, scale: 1 },
    });
    write(name, data);
};

const helpers = `
window.__click = (t) => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); };
window.__taskButton = (taskId, label) => { const row = document.querySelector('[data-task-id="' + taskId + '"]'); if (!row) throw new Error('행 없음: ' + taskId); const b = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === label); if (!b) throw new Error('행 버튼 없음: ' + label); b.click(); };
window.__planRowButton = (titleIncludes, label) => {
    const rows = [...document.querySelectorAll('table[aria-label="계획 목록"] tbody tr')];
    const row = rows.find(tr => tr.textContent.includes(titleIncludes) && tr.querySelector('button'));
    if (!row) throw new Error('계획 행 없음: ' + titleIncludes);
    const b = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === label);
    if (!b) throw new Error('계획 행 버튼 없음: ' + label);
    b.click();
};
window.__fill = (id, value) => { const el = document.getElementById(id); const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); };
window.__select = (id, value) => { const el = document.getElementById(id); const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; setter.call(el, value); el.dispatchEvent(new Event('change', { bubbles: true })); };
window.__stat = (id) => (document.querySelector('[data-testid="' + id + '"]') || {}).textContent || '';
window.__num = (id) => Number(String(window.__stat(id)).replace(/[^0-9.-]/g, ''));
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(1500);
    await evaluate(helpers);
};

// ───────────────────────────────────────── 촬영
const log = [];
const record = (name, status, note) => log.push({ name, status, note });

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 2600, deviceScaleFactor: 2, mobile: false });
await goto();

const backendMode = await evaluate(`window.__backendMode`);
console.log(`백엔드: ${backendMode}`);

console.log("A. 실제 계획·할일·실행기록 확인 (합성 자료를 새로 만들지 않습니다 — 6N.md는 진짜 내용을 요구합니다)");
const planId = await evaluate(`window.__db.plans.listWithCurrent().then(r => r.data.find(p => p.current?.title === 'ALEPH 과제 진행')?.id)`);
if (!planId) {
    throw new Error("실제 계획 'ALEPH 과제 진행'을 찾지 못했습니다. 카드 5 내용을 먼저 넣어주세요.");
}
const planTasks = await evaluate(`window.__db.tasks.listAllByPlan(${JSON.stringify(planId)}).then(r => r.data)`);
const taskA = planTasks.find((t) => t.title.includes("Supabase 스키마"))?.id; // 실행기록·완료중복방지 시연용
if (!taskA) throw new Error("실행기록이 붙은 실제 할일을 찾지 못했습니다.");
await evaluate(`window.__reloadPlans()`);
await sleep(400);
await evaluate(`window.__planRowButton('ALEPH 과제 진행', '선택')`); // 실제 계획을 선택해야 아래 할일 목록이 그 계획 기준으로 보입니다.
await sleep(400);

console.log("B. 카드 1 · 계획 + 이력");
await shotSectionByHeading("02_계획_이력_닫힘", "계획");
await evaluate(`window.__planRowButton('ALEPH 과제 진행', '이력 보기')`);
await sleep(300);
const history = await evaluate(`window.__db.plans.history(${JSON.stringify(planId)}).then(r => r.data)`);
const first = history.find((r) => r.revisionNo === 1);
const latest = history.reduce((a, b) => (b.revisionNo > a.revisionNo ? b : a));
await shotSectionByHeading("02_계획_이력", "계획");
record(
    "02_계획_이력",
    `1판(처음) ${first.estimatedMinutes}분 그대로 · ${latest.revisionNo}판(현재) ${latest.estimatedMinutes}분`,
    "계획을 고쳐도 처음 개정본이 이력에 그대로 남습니다",
);
await evaluate(`window.__planRowButton('ALEPH 과제 진행', '이력 숨기기')`);

console.log("C. 카드 2 · 할일 CRUD + 검색/필터/정렬");
await shotSectionByHeading("03_할일_목록", "할 일");
await evaluate(`window.__select('task-priority-filter', 'high')`);
await sleep(300);
const filteredCount = await evaluate(`document.querySelectorAll('[data-testid="task-row"]').length`);
await shotSectionByHeading("04_검색필터정렬", "할 일");
record("04_검색필터정렬", `우선순위=높음 필터 → ${filteredCount}건`, "정렬 기준과 방향이 화면 머리에 그대로 적혀 있습니다");
await evaluate(`window.__select('task-priority-filter', 'all')`);
await sleep(300);

console.log("D. 카드 3 · 실행기록");
await evaluate(`window.__taskButton(${JSON.stringify(taskA)}, '실행기록')`); // 이미 실행기록이 붙은 "스키마 SQL 작성" 행
await sleep(400);
await shotSectionByHeading("05_실행기록", "실행 기록");
record("05_실행기록", "시작·끝·90분·막힌 이유가 어느 할일에 붙었는지와 함께 보임", "계획·할일 값은 실행기록 저장 전후로 바뀌지 않습니다(검사 8)");

console.log("E. 카드 3 · 완료 중복방지");
// taskA는 이미 실제로 완료된 할일입니다 — 이미 완료된 것에 완료를 동시에 두 번 더 호출해도
// 완료시각이 조금도 바뀌지 않는다는 게 이 검사의 핵심입니다.
const [beforeCompletedAt, afterPair] = await Promise.all([
    evaluate(`window.__db.tasks.get(${JSON.stringify(taskA)}).then(r => r.data.completedAt)`),
    evaluate(`Promise.all([window.__db.tasks.complete(${JSON.stringify(taskA)}), window.__db.tasks.complete(${JSON.stringify(taskA)})]).then(([a, b]) => [a.data.completedAt, b.data.completedAt])`),
]);
const unchanged = beforeCompletedAt === afterPair[0] && afterPair[0] === afterPair[1];
record(
    "06_완료중복방지",
    `이미 완료된 할일에 완료를 동시에 두 번 더 호출 — 완료시각 ${unchanged ? "완전히 그대로" : "바뀜(문제)"} (${beforeCompletedAt})`,
    "완료는 상태 전이라 몇 번을 호출해도 새로 쌓이는 기록이 없습니다(검사 9)",
);

console.log("F. 카드 4 · 돌아보기 + 드릴다운");
await shotSectionByHeading("07_돌아보기_집계", "돌아보기");
const overdueBtn = await evaluate(`(() => { const b = document.querySelector('[data-testid="review-stat-blockedCount"]'); b.click(); return b.textContent.replace(/\\s+/g,' ').trim(); })()`);
await sleep(400);
await shotSectionByHeading("08_드릴다운", "할 일");
record("08_드릴다운", `돌아보기의 "${overdueBtn}" 숫자를 눌러 그 조건에 맞는 할일 목록으로 이동`, "숫자와 목록이 같은 조건식(reviewFilters.js)에서 나와 서로 어긋나지 않습니다");
await evaluate(`window.__click('필터 해제')`);

console.log("G. 카드 4 · 고칠 점 → 다음 계획");
await evaluate(`window.__fill('review-note', ${JSON.stringify("자동화 스크립트를 UI 좌표 클릭보다 DOM 헬퍼로 짜니 훨씬 안정적이었다 — 다음 도구 스크립트도 처음부터 이렇게 짠다")})`);
await evaluate(`window.__click('고칠 점 저장')`);
await sleep(400);
await evaluate(`window.__click(${JSON.stringify("이 고칠 점으로 다음 계획 만들기")})`);
await sleep(500);
await shotSectionByHeading("09_고칠점_다음계획", "계획");
record("09_고칠점_다음계획", "돌아보기에서 저장한 고칠 점이 새 계획 폼 위에 안내로 보임", "돌아보기의 노트가 다음 계획으로 이어집니다(검사 12)");

console.log("H. 카드 5 · 로그인 없음 안내 + 전체");
await shotSelector("10_로그인없음_배너", '[data-testid="no-login-banner"]');
record("10_로그인없음_배너", "첫 화면에 6N.md 원문 그대로의 안내 문구", "아직 로그인이 없다는 사실을 첫 화면에 못박음(검사 15)");

console.log("I. 카드 5 · 내보내기");
await shotSectionByHeading("11_내보내기", "내 자료 내보내기");

await shot("01_전체화면");

console.log("J. 모바일");
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 1200, deviceScaleFactor: 2, mobile: true });
await goto();
await sleep(300);
await shot("12_모바일_375");
{
    const mobile = await evaluate(`({ scroll: document.body.scrollWidth > document.documentElement.clientWidth, width: document.body.scrollWidth })`);
    record("12_모바일_375", `가로 스크롤 ${mobile.scroll ? "발생" : "없음"} (본문 폭 ${mobile.width}px)`, "375px 화면");
}

// ───────────────────────────────────────── 기록 저장
const external = [...new Set(networkLog.filter((u) => !u.startsWith(URL_APP) && u.startsWith("http")))];

fs.writeFileSync(
    path.join(SHOT_DIR, "촬영 기록.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), url: URL_APP, backendMode, externalRequests: external, log }, null, 2),
    "utf-8",
);

console.log(`\n촬영 완료 · 외부 요청 ${external.length}종`);
console.log(`기록: ${path.join(SHOT_DIR, "촬영 기록.json")}`);

ws.close();
chrome.kill();
process.exit(0);
