/**
 * 과제 6 증빙 화면 자동 촬영기.
 *
 * 출력 위치는 과제 4·5와 겹치지 않습니다.
 *   과제 4: 정보판 증빙 화면/       과제 5: 과제5 증빙 화면/
 *   과제 6: 과제6 증빙 화면/         ← 이 파일이 씁니다
 *
 *   node plandosee/tools/capture.mjs
 *   BOARD_URL=https://... node plandosee/tools/capture.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5177").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제6 증빙 화면");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds-shot-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9341;
const STORAGE_KEY = "plandosee.records.v2";

fs.mkdirSync(SHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--window-size=1180,2400",
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
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? "평가 실패");
    return result.value;
};

const write = (name, data) => {
    fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, "base64"));
    console.log("  촬영", name);
};

const shot = async (name) => {
    await sleep(450);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    write(name, data);
};

/** 구역만 잘라 찍습니다. 보고서에 넣었을 때 글자가 읽히도록. */
const shotSection = async (name, title, pad = 14) => {
    await sleep(450);
    const rect = await evaluate(`(() => {
        const el = [...document.querySelectorAll('section')]
            .find(s => (s.querySelector('h2') || {}).textContent?.includes(${JSON.stringify(title)}));
        if (!el) throw new Error('구역 없음: ' + ${JSON.stringify(title)});
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
    })()`);
    const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: {
            x: Math.max(0, rect.x - pad),
            y: Math.max(0, rect.y - pad),
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            scale: 1,
        },
    });
    write(name, data);
};

const helpers = `
window.__btn = (t) => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t));
window.__click = (t) => { const b = window.__btn(t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); };
window.__stat = (id) => (document.querySelector('[data-testid="' + id + '"]') || {}).textContent || '';
window.__num = (id) => Number(String(window.__stat(id)).replace(/[^0-9.-]/g, ''));
window.__rows = () => [...document.querySelectorAll('table[aria-label="기록 목록"] tbody tr')]
    .map(tr => { const c = [...tr.children].map(td => td.textContent.trim());
        return { date: c[0], subject: c[1], minutes: Number(c[2].replace(/[^0-9.-]/g,'')), id: c[5] }; });
window.__held = () => [...document.querySelectorAll('table[aria-label="보류 목록"] tbody tr')]
    .map(tr => { const c = [...tr.children].map(td => td.textContent.trim());
        return { date: c[0], subject: c[1], value: c[2], reason: c[3] }; });
window.__message = () => window.__stat('data-message');
window.__schema = () => window.__stat('schema-line').replace(/\\s+/g,' ').trim();
window.__errors = () => [...document.querySelectorAll('form span')].map(s => s.textContent.trim())
    .filter(t => /비었습니다|형식|이하|이상|숫자/.test(t));
window.__stored = () => { try { return JSON.parse(localStorage.getItem('${STORAGE_KEY}') || 'null'); } catch { return null; } };
window.__fill = (id, value) => {
    const el = document.getElementById(id);
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
};
window.__rowAction = (index, label) => {
    const rows = [...document.querySelectorAll('table[aria-label="기록 목록"] tbody tr')];
    [...rows[index].querySelectorAll('button')].find(b => b.textContent.trim() === label).click();
};
window.__putFile = (text, name) => {
    const input = document.querySelector('input[type="file"]');
    const dt = new DataTransfer();
    dt.items.add(new File([text], name, { type: 'application/json' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
};
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(1500);
    await evaluate(helpers);
};

const clearStorage = () => evaluate(`localStorage.removeItem('${STORAGE_KEY}')`);

const seed = async (kind) => {
    await evaluate(`window.__click(${JSON.stringify(kind === "v1" ? "v1 합성 기록" : "경계 · 오류 자료")})`);
    await sleep(500);
};

// ───────────────────────────────────────── 촬영
const log = [];
const record = (name, status, note) => log.push({ name, status, note });

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 2400, deviceScaleFactor: 2, mobile: false });

console.log("A. 카드 1 · 기록의 구조");
await goto();
await clearStorage();
await goto();
await seed("v1");
await shot("01_전체화면");
await shotSection("02_기록추가_필드와단위", "기록 추가");
record("02_기록추가_필드와단위", "단위 분 · 기준 시간대 Asia/Seoul (UTC+9)", "필드·단위·기준 시간대가 폼 머리에 보임");

const before1 = { rows: await evaluate(`window.__rows().length`), total: await evaluate(`window.__num('week-total')`) };
await evaluate(`window.__fill('f-date', '2026-08-25')`);
await evaluate(`window.__fill('f-subject', '증빙용 추가')`);
await evaluate(`window.__fill('f-minutes', '35')`);
await evaluate(`window.__click('추가')`);
await sleep(500);
const after1 = { rows: await evaluate(`window.__rows().length`), total: await evaluate(`window.__num('week-total')`) };
await shotSection("03_추가후_목록과합계", "주간 요약");
record("03_추가후_목록과합계", `목록 ${before1.rows}→${after1.rows}건 · 합계 ${before1.total}→${after1.total}분`, "추가 한 건이 목록과 요약에 함께 반영");

console.log("B. 카드 1 · 수정은 그 행에만");
{
    const rows = await evaluate(`window.__rows()`);
    const index = rows.findIndex((r) => r.subject === "증빙용 추가");
    const totalBefore = await evaluate(`window.__num('week-total')`);
    await evaluate(`window.__rowAction(${index}, '수정')`);
    await sleep(400);
    await evaluate(`window.__fill('f-minutes', '80')`);
    await evaluate(`window.__click('수정 저장')`);
    await sleep(500);
    const after = await evaluate(`window.__rows()`);
    const totalAfter = await evaluate(`window.__num('week-total')`);
    await shotSection("04_수정후_그행과요약", "기록 목록");
    record(
        "04_수정후_그행과요약",
        `그 행 35→80분 · 합계 ${totalBefore}→${totalAfter}분 · 다른 ${after.length - 1}행 그대로`,
        "수정이 id 한 건에만 반영되고 요약이 함께 바뀜",
    );
}

console.log("C. 카드 1 · 필수값 검사");
await evaluate(`window.__fill('f-subject', '')`);
await evaluate(`window.__fill('f-minutes', '')`);
const rowsBeforeError = await evaluate(`window.__rows().length`);
await evaluate(`window.__click('추가')`);
await sleep(450);
await shotSection("05_필수값_오류이유", "기록 추가");
{
    const errors = await evaluate(`window.__errors()`);
    const rowsAfter = await evaluate(`window.__rows().length`);
    record("05_필수값_오류이유", `${rowsBeforeError}건 유지 · 이유 ${errors.length}개 — ${errors.join(" / ")}`, "빈 필수값은 저장되지 않고 칸마다 이유가 붙음");
}

console.log("D. 카드 2 · 손상 파일을 넣어도 기존 기록 유지");
await goto();
const beforeBroken = await evaluate(`window.__rows()`);
await evaluate(`window.__putFile('{ 이건 JSON이 아닙니다', 'broken.json')`);
await sleep(700);
await shotSection("06_손상파일_기존유지", "자료 도구");
{
    const after = await evaluate(`window.__rows()`);
    const message = await evaluate(`window.__message()`);
    record("06_손상파일_기존유지", `기존 ${beforeBroken.length}건 → ${after.length}건 · "${message}"`, "읽기→검사→쓰기 순서라 손상 파일이 기존 기록을 지우지 않음");
}

console.log("E. 카드 3 · v1 → v2 변환");
await goto();
await clearStorage();
await goto();
await seed("v1");
await shotSection("07_자료형식_변환상태", "자료 도구");
{
    const schema = await evaluate(`window.__schema()`);
    const stored = await evaluate(`window.__stored()`);
    const allV2 = (stored?.records ?? []).every((r) => r.schemaVersion === 2 && "tag" in r);
    record("07_자료형식_변환상태", schema, `저장된 기록 ${stored?.records?.length ?? 0}건이 전부 v2 · tag 기본값 채워짐 (${allV2})`);
}

// 다시 읽으면 변환이 한 번 더 돕니다. 결과가 같아야 합니다.
const firstPass = { rows: await evaluate(`window.__rows().length`), total: await evaluate(`window.__num('week-total')`) };
await goto();
const secondPass = { rows: await evaluate(`window.__rows().length`), total: await evaluate(`window.__num('week-total')`) };
record("07_자료형식_변환상태_재실행", `${firstPass.rows}건·${firstPass.total}분 → 다시 읽어도 ${secondPass.rows}건·${secondPass.total}분`, "변환을 두 번 돌려도 기록이 늘거나 값이 바뀌지 않음");

console.log("F. 카드 4 · 주 경계와 잘못된 값");
await goto();
await seed("edge");
await shotSection("08_주간요약_기간과집계", "주간 요약");
{
    const range = await evaluate(`window.__stat('week-range')`);
    const total = await evaluate(`window.__num('week-total')`);
    const count = await evaluate(`window.__num('week-count')`);
    const held = await evaluate(`window.__num('held-count')`);
    record("08_주간요약_기간과집계", `${range} · 합계 ${total}분 · 이번 주 ${count}건 · 보류 ${held}건`, "월요일 10분 + 일요일 20분 + 55분 = 85분. 다음 주 40분은 제외");
}

await shotSection("09_보류목록_이유", "보류 목록");
{
    const held = await evaluate(`window.__held()`);
    record("09_보류목록_이유", `보류 ${held.length}건 — ${held.map((h) => h.reason).join(" / ")}`, "잘못된 값은 버리지 않고 이유와 함께 남기되 집계에서 뺌");
}

console.log("G. 카드 2 · 전체 삭제");
await evaluate(`window.__click('전체 삭제')`);
await sleep(350);
await evaluate(`window.__click('네, 전부 지웁니다')`);
await sleep(500);
await shotSection("10_전체삭제_0건", "자료 도구");
{
    const afterClear = await evaluate(`window.__rows().length`);
    await goto();
    const afterReload = await evaluate(`window.__rows().length`);
    const stored = await evaluate(`window.__stored()`);
    record("10_전체삭제_0건", `삭제 후 ${afterClear}건 → 새로고침 후 ${afterReload}건 · 저장소 ${stored === null ? "비었음" : "남음"}`, "메모리만 비우지 않고 저장소에서 다시 읽어 그림");
}

console.log("H. 모바일");
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 900, deviceScaleFactor: 2, mobile: true });
await goto();
await seed("edge");
await shot("11_모바일_375");
{
    const mobile = await evaluate(`({ scroll: document.body.scrollWidth > document.documentElement.clientWidth, width: document.body.scrollWidth })`);
    record("11_모바일_375", `가로 스크롤 ${mobile.scroll ? "발생" : "없음"} (본문 폭 ${mobile.width}px)`, "375px 화면");
}

// ───────────────────────────────────────── 기록 저장
const external = [...new Set(networkLog.filter((u) => !u.startsWith(URL_APP) && u.startsWith("http")))];

fs.writeFileSync(
    path.join(SHOT_DIR, "촬영 기록.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), url: URL_APP, externalRequests: external, log }, null, 2),
    "utf-8",
);

console.log(`\n촬영 ${log.filter((l) => !l.name.includes("재실행")).length}장 · 외부 요청 ${external.length}종`);
console.log(`기록: ${path.join(SHOT_DIR, "촬영 기록.json")}`);

ws.close();
chrome.kill();
process.exit(0);
