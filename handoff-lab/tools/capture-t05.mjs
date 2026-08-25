/**
 * 과제 5 증빙 화면 자동 촬영기.
 *
 * 과제 4의 capture.mjs와 출력 위치가 다릅니다 — 과제 4 증빙을 덮어쓰지 않기 위해서입니다.
 *   과제 4: 정보판 증빙 화면/       ← 건드리지 않음
 *   과제 5: 과제5 증빙 화면/         ← 이 파일이 씁니다
 *
 *   node handoff-lab/tools/capture-t05.mjs
 *   BOARD_URL=https://... node handoff-lab/tools/capture-t05.mjs
 *
 * BOARD_URL을 주지 않으면 개발 서버(http://localhost:5175)에서 촬영합니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5175").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제5 증빙 화면");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "t05-profile-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9337;
const STORAGE_KEY = "today-dashboard.history.v1";

fs.mkdirSync(SHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────── CDP 연결
const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--window-size=1180,1400",
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
                        msg.error
                            ? reject(new Error(JSON.stringify(msg.error)))
                            : resolve(msg.result);
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
    if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? "평가 실패");
    }
    return result.value;
};

const write = (name, data) => {
    fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, "base64"));
    console.log("  촬영", name);
};

const shot = async (name) => {
    await sleep(450);
    const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
    });
    write(name, data);
};

/** 특정 구역만 잘라 찍습니다. 보고서에 넣었을 때 글자가 읽히도록. */
const shotSection = async (name, title, pad = 14) => {
    await sleep(450);
    const rect = await evaluate(`(() => {
        const el = window.__section(${JSON.stringify(title)});
        if (!el) throw new Error('구역을 찾지 못했습니다: ' + ${JSON.stringify(title)});
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

/** 구역 안의 특정 요소만 잘라 찍습니다. 같은 구역을 두 번 통째로 찍지 않기 위해서입니다. */
const shotBy = async (name, expression, pad = 14) => {
    await sleep(450);
    const rect = await evaluate(`(() => {
        const el = ${expression};
        if (!el) throw new Error('요소를 찾지 못했습니다: ' + ${JSON.stringify(name)});
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
window.__section = (t) => {
    const all = [...document.querySelectorAll('section')];
    return all.find(s => ((s.querySelector('h2') || {}).textContent || '').includes(t))
        ?? all.find(s => s.textContent.includes(t));
};
window.__btn = (t) => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t));
window.__click = (t) => { const b = window.__btn(t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); };
window.__records = () => JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '{"items":[]}').items;
window.__main = () => document.querySelector('main').textContent;

window.__diff = () => {
    const el = window.__section('이전 기록과의 차이');
    const text = el ? el.textContent : '';
    const dates = text.match(/(\\d{4}-\\d{2}-\\d{2})\\s*→\\s*(\\d{4}-\\d{2}-\\d{2})/);
    const eq = text.match(/(-?\\d+\\.\\d+)\\s*\\S*\\s*−\\s*(-?\\d+\\.\\d+)\\s*\\S*\\s*=\\s*([+-]?\\d+\\.\\d+)/);
    return {
        base: dates ? dates[1] : null,
        target: dates ? dates[2] : null,
        equation: eq ? { target: Number(eq[1]), base: Number(eq[2]), delta: Number(eq[3]) } : null,
    };
};

window.__rows = () => {
    const el = window.__section('날짜별 기록');
    const list = el ? el.querySelector('ul[aria-label]') : null;
    if (!list) return [];
    return [...list.children].map((li) => {
        const btn = li.querySelector('button');
        const date = (li.textContent.match(/\\d{4}-\\d{2}-\\d{2}/) || [null])[0];
        return { date, clickable: !!btn && !btn.disabled, selected: btn ? btn.getAttribute('aria-pressed') === 'true' : false };
    });
};

window.__clickRow = (date) => {
    const el = window.__section('날짜별 기록');
    const list = el ? el.querySelector('ul[aria-label]') : null;
    const li = list ? [...list.children].find(x => x.textContent.includes(date)) : null;
    if (!li) throw new Error('기록 행 없음: ' + date);
    (li.querySelector('button') ?? li).click();
};
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(2400);
    await evaluate(helpers);
};

const seed = (items) =>
    evaluate(
        `localStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(
            JSON.stringify({ version: 1, items }),
        )})`,
    );

const clearStorage = () => evaluate(`localStorage.removeItem('${STORAGE_KEY}')`);

const waitForRecords = async (min, timeoutMs = 8000) => {
    const start = Date.now();
    let items = await evaluate(`window.__records()`);
    while (items.length < min && Date.now() - start < timeoutMs) {
        await sleep(300);
        items = await evaluate(`window.__records()`);
    }
    return items;
};

// ───────────────────────────────────────── 촬영
const log = [];

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
    width: 1180,
    height: 1400,
    deviceScaleFactor: 2,
    mobile: false,
});

console.log("A. 카드 1 · 개선 기능의 이름과 사용 방법");
await goto();
await clearStorage();
await goto("/?debug=1");
let records = await waitForRecords(3);
if (records.length < 3) {
    await evaluate(`window.__click('지난 날짜 다시 불러오기')`);
    records = await waitForRecords(3);
}
await goto();
await waitForRecords(3);

await shot("01_전체화면");
await shotSection("02_기능이름과_사용방법", "이전 기록과의 차이");

const before = await evaluate(`window.__diff()`);
log.push({
    name: "02_기능이름과_사용방법",
    note: `기능 이름과 사용 방법이 카드 안에 · 조작 전 비교 ${before.base} → ${before.target}`,
});

console.log("B. 카드 1 · 한 번 조작하면 결과가 바뀐다");
const picked = records[2].dateKey;
await evaluate(`window.__clickRow(${JSON.stringify(picked)})`);
await sleep(500);
await shotSection("03_조작후_비교기준바뀜", "이전 기록과의 차이");
const after = await evaluate(`window.__diff()`);
const handCalc = Math.round((records[0].value - records[2].value) * 10) / 10;
log.push({
    name: "03_조작후_비교기준바뀜",
    note: `${picked} 선택 → ${after.equation.target} − ${after.equation.base} = ${after.equation.delta} (손계산 ${handCalc})`,
});

await shotSection("04_선택표시_날짜별기록", "날짜별 기록");
const rows = await evaluate(`window.__rows()`);
log.push({
    name: "04_선택표시_날짜별기록",
    note: `선택 표시 ${rows.filter((r) => r.selected).length}개 · ${rows.find((r) => r.selected)?.date}`,
});

console.log("C. 검사 6 · 기록 1건이면 고를 수 없다");
await goto("/?fail=auth");
await seed([records[0]]);
await goto("/?fail=auth");
await shotSection("05_검사6_기록1건_비활성", "날짜별 기록");
const oneRow = await evaluate(`window.__rows()`);
log.push({
    name: "05_검사6_기록1건_비활성",
    note: `기록 ${oneRow.length}건 · 행 ${oneRow[0]?.clickable ? "누를 수 있음" : "비활성"} · 2건 이상 안내 문구 표시`,
});

console.log("D. 카드 3 · 인계 문서 7개 항목");
await goto();
await clearStorage();
await goto();
await waitForRecords(3);
await shotSection("06_인계문서_7개항목", "인계 문서");
const headings = await evaluate(`(() => {
    const el = window.__section('인계 문서');
    return [...el.querySelectorAll('h3,h4,dt,summary,strong')].map(x => x.textContent.trim())
        .filter(t => ['목표','현재 상태','실행 명령','통과한 검사','남은 문제','다음 행동','건드리면 안 되는 부분'].includes(t));
})()`);
log.push({
    name: "06_인계문서_7개항목",
    note: `7개 항목 중 화면에서 확인된 제목 ${headings.length}개 — ${headings.join(" · ")}`,
});

console.log("E. 카드 5 · 두 AI 비교 표와 선택 기준");
// 비교 표는 표 부분만, 검사 목록은 목록 부분만 잘라 서로 다른 증빙이 되게 합니다.
// 표는 좁은 화면에서 가로로 잘리므로, 이 두 장을 찍는 동안만 화면을 넓힙니다.
await send("Emulation.setDeviceMetricsOverride", {
    width: 1560,
    height: 1400,
    deviceScaleFactor: 2,
    mobile: false,
});
await goto();
await waitForRecords(3);
// 표 감싸개가 overflow-x: auto라 넓은 화면에서도 오른쪽 열이 잘려 나갑니다.
// 촬영하는 동안만 그 제한을 풀어 표 전체가 한 장에 담기게 합니다. 값은 바꾸지 않습니다.
await evaluate(`(() => {
    const wrap = window.__section('두 AI 작업 기록').querySelector('table').parentElement;
    wrap.style.overflow = 'visible';
    wrap.style.width = 'max-content';
    wrap.style.maxWidth = 'none';
    return true;
})()`);
await shotBy("07_두AI_비교표", `window.__section('두 AI 작업 기록').querySelector('table')`);
await shotBy("08_검사10개_누가어디까지", `window.__section('두 AI 작업 기록').querySelectorAll('ul')[0]`);
await send("Emulation.setDeviceMetricsOverride", {
    width: 1180,
    height: 1400,
    deviceScaleFactor: 2,
    mobile: false,
});
// 기준 개수는 문구를 세지 않고 화면의 목록 항목 수를 직접 셉니다 —
// 문구로 세면 표현이 다른 기준이 빠져 실제보다 적게 잡힙니다.
const worklogView = await evaluate(`(() => {
    const el = window.__section('두 AI 작업 기록');
    const list = el.querySelector('ol');
    return {
        hasCaps: el.textContent.includes('상한'),
        criteriaCount: list ? list.children.length : 0,
    };
})()`);
log.push({
    name: "07_두AI_비교표",
    note: `상한 표시 ${worklogView.hasCaps ? "있음" : "없음"} · 두 AI를 같은 항목으로 비교`,
});
log.push({
    name: "08_검사10개_누가어디까지",
    note: "검사 10개마다 AI A 통과 / AI B 통과 표시",
});

console.log("F. 카드 5 · 앞으로의 선택 기준");
await goto();
await waitForRecords(3);
await shot("09_전체화면_비교표와기준");
log.push({
    name: "09_전체화면_비교표와기준",
    note: `선택 기준 ${worklogView.criteriaCount}개가 비교 표와 같은 화면에`,
});

console.log("G. 모바일");
await send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 900,
    deviceScaleFactor: 2,
    mobile: true,
});
await goto();
await waitForRecords(3);
await shot("10_모바일_375");
log.push({ name: "10_모바일_375", note: "375px 폭에서도 가로 스크롤 없이 읽힌다" });

// ───────────────────────────────────────── 기록 저장
const external = [...new Set(networkLog.filter((u) => !u.startsWith(URL_APP) && u.startsWith("http")))];

const out = {
    capturedAt: new Date().toISOString(),
    url: URL_APP,
    records,
    selected: { dateKey: picked, equation: after.equation, handCalc },
    externalRequests: external,
    log,
};

fs.writeFileSync(path.join(SHOT_DIR, "촬영 기록.json"), JSON.stringify(out, null, 2), "utf-8");
console.log(`\n촬영 ${log.length}장 · 외부 요청 ${external.length}종`);
console.log(`기록: ${path.join(SHOT_DIR, "촬영 기록.json")}`);

ws.close();
chrome.kill();
process.exit(0);
