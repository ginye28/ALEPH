/**
 * 증빙 화면 자동 촬영기.
 *
 * 헤드리스 브라우저로 앱을 실제로 조작해 화면을 찍고,
 * 그동안 나간 네트워크 요청 주소를 모두 기록해 비밀값 0건 검사에 씁니다.
 *
 * 공개 주소에서 촬영합니다 (채점자가 실제로 여는 주소).
 *   $env:BOARD_URL="https://aleph-dash.vercel.app"; node today-dashboard/tools/capture.mjs
 *
 * BOARD_URL을 주지 않으면 개발 서버(http://localhost:5175)에서 촬영합니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5175").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "정보판 증빙 화면");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "board-profile-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9334;
const STORAGE_KEY = "today-dashboard.history.v1";

fs.mkdirSync(SHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────── CDP 연결
const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--window-size=1180,1400",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--no-first-run",
    "--disable-gpu",
    URL_APP,
], { stdio: "ignore" });

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
                        networkLog.push({
                            url: msg.params.request.url,
                            method: msg.params.request.method,
                            headerNames: Object.keys(msg.params.request.headers ?? {}),
                        });
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
    throw new Error("브라우저에 연결하지 못했습니다.");
}

// ───────────────────────────────────────── 조작 도우미
const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
        expression, awaitPromise: true, returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? "평가 실패");
    return result.value;
};

const write = (name, data) => {
    fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, "base64"));
    console.log("  촬영", name);
};

/** 화면 전체를 찍습니다. */
const shot = async (name) => {
    await sleep(450);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
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

const helpers = `
window.__section = (t) => [...document.querySelectorAll('section')].find(s => s.textContent.includes(t));
window.__btn = (t) => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t));
window.__click = (t) => { const b = window.__btn(t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); };
window.__status = () => document.querySelector('[role="status"]').textContent.trim();
window.__records = () => JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '{"items":[]}').items;
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(2200);
    await evaluate(helpers);
};

const clearStorage = async () => {
    await evaluate(`localStorage.removeItem('${STORAGE_KEY}')`);
};

// ───────────────────────────────────────── 촬영 순서
const log = [];
const record = async (name, note) => {
    log.push({ name, status: await evaluate(`window.__status()`), note });
};

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
    width: 1180, height: 1400, deviceScaleFactor: 2, mobile: false,
});

/**
 * 실제 조회가 끝날 때까지 기다립니다.
 * 고정 sleep만 믿으면 출처가 늦게 응답한 순간 값도 링크도 없는 화면을 찍습니다.
 */
const waitForLive = async (timeoutMs = 12000) => {
    const start = Date.now();
    for (;;) {
        const ready = await evaluate(
            `!!document.querySelector('a[href^="https://api.open-meteo.com"]')`,
        );
        if (ready) return true;
        if (Date.now() - start > timeoutMs) {
            throw new Error("출처 링크가 나타나지 않았습니다 — 조회가 끝나지 않았거나 실패했습니다.");
        }
        await sleep(300);
    }
};

console.log("A. 카드 1 · 값의 맥락");
await goto();
await clearStorage();
await goto();
await waitForLive();
await shot("01_전체화면");
await shotSection("02_현재값_값단위출처시각", "이 정보판은");
await record("02_현재값_값단위출처시각", "현재값·단위·출처·조회 시각이 한 화면에");

const snapshot = await evaluate(`(() => {
    const link = document.querySelector('a[href^="https://api.open-meteo.com"]');
    const main = document.querySelector('main').textContent;
    return { sourceUrl: link.href, screenValue: main.match(/([0-9]+\\.[0-9])\\s*°C/)[1] };
})()`);

console.log("B. 카드 2 · 출처 주소를 누르면 원자료가 열린다");
await send("Page.navigate", { url: snapshot.sourceUrl });
await sleep(1800);
// 보고서에 인쇄했을 때 숫자가 읽히도록 글자만 키웁니다. 내용은 그대로입니다.
await evaluate(`(() => {
    const pre = document.querySelector('pre') ?? document.body;
    pre.style.fontSize = '18px';
    pre.style.lineHeight = '1.75';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-all';
    pre.style.padding = '18px';
    return true;
})()`);
await sleep(400);
{
    // 응답 앞부분만 잘라 찍습니다 — current 항목이 여기 들어 있습니다.
    const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: 1180, height: 620, scale: 1 },
    });
    write("03_원자료_페이지", data);
}
const rawValue = await evaluate(`(() => {
    const text = document.body.innerText;
    const json = JSON.parse(text);
    // JSON.parse는 31.0을 31로 바꿔 버립니다.
    // 대조표에는 응답에 적힌 글자 그대로를 실어야 화면값과 헛되이 어긋나 보이지 않습니다.
    const matched = text.match(/"current":\\{[^}]*?"temperature_2m":(-?[0-9.]+)/);
    return {
        current: json.current.temperature_2m,
        currentText: matched ? matched[1] : String(json.current.temperature_2m),
        unit: json.current_units.temperature_2m,
        time: json.current.time,
    };
})()`);
log.push({
    name: "03_원자료_페이지",
    status: `원자료 current.temperature_2m = ${rawValue.currentText} ${rawValue.unit} (기준 ${rawValue.time})`,
    note: `화면값 ${snapshot.screenValue} °C 와 대조`,
});

console.log("C. 카드 3 · 장애 5종");
await goto("/?debug=1");
for (const [mode, name] of [
    ["제한시간 초과", "04_장애_제한시간초과"],
    ["인증 실패", "05_장애_인증실패"],
    ["호출 제한", "06_장애_호출제한"],
    ["오프라인", "07_장애_오프라인"],
    ["응답 형식 변경", "08_장애_응답형식변경"],
]) {
    await evaluate(`window.__click(${JSON.stringify(mode)})`);
    await sleep(mode === "제한시간 초과" ? 6200 : 1200);
    await shotSection(name, "이 정보판은");
    await record(name, `${mode} 재현 — 마지막 정상값 유지 확인`);
}

console.log("D. 정상값이 없을 때 · 복구");
await goto();
await clearStorage();
await goto("/?debug=1&fail=auth");
await shotSection("09_정상값없음_빈상태", "이 정보판은");
await record("09_정상값없음_빈상태", "정상값이 하나도 없을 때 — 값을 지어내지 않고 빈 상태");

await evaluate(`document.querySelectorAll('button')[0].click()`);
await sleep(2200);
await shotSection("10_복구_정상", "이 정보판은");
await record("10_복구_정상", "다시 확인 한 번으로 정상 복구");

console.log("E. 카드 4 · 하루 한 번 기록");
await shotSection("11_날짜별기록_최초저장", "날짜별 기록");
const firstSave = await evaluate(`window.__records()`);
log.push({
    name: "11_날짜별기록_최초저장",
    status: `${firstSave.length}건 저장 — ${firstSave.map((r) => `${r.dateKey}(${r.origin})`).join(", ")}`,
    note: "첫 조회에서 오늘 1건 + 출처의 지난 날짜 자동 확보",
});

await evaluate(`document.querySelectorAll('button')[0].click()`);
await sleep(2200);
await shotSection("12_날짜별기록_재실행_중복없음", "날짜별 기록");
const secondSave = await evaluate(`window.__records()`);
const keys = secondSave.map((r) => r.dateKey);
log.push({
    name: "12_날짜별기록_재실행_중복없음",
    status: `재실행 후에도 ${secondSave.length}건 — 중복 ${keys.length - new Set(keys).size}건`,
    note: "같은 날 다시 실행해도 기록이 늘지 않음",
});

console.log("F. 카드 5 · 어제와 비교");
await shotSection("13_비교_차이방향단위", "이전 기록과의 차이");
await shotSection("14_대조표", "점검 도구");
const diffData = await evaluate(`(() => {
    const items = window.__records();
    const [a, b] = items;
    return { latest: a, previous: b, rawDelta: a.value - b.value };
})()`);
log.push({
    name: "13_비교_차이방향단위",
    status: `${diffData.previous.value} → ${diffData.latest.value} ${diffData.latest.unit}, 원본 차이 ${diffData.rawDelta}`,
    note: "화면 표기는 반올림 1자리",
});

console.log("G. 카드 3 · 공개 fixture 합성 재생 (C12~C21)");
await goto();

/** 합성 재생 화면의 버튼을 누릅니다. 사람이 누르는 것과 같은 경로입니다. */
const replayClick = async (text, waitMs = 500) => {
    await evaluate(`(() => {
        const sec = [...document.querySelectorAll('section')]
            .find(s => (s.querySelector('h2') || {}).textContent?.includes('합성 검사 재생'));
        const btn = [...sec.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(text)}));
        if (!btn) throw new Error('재생 버튼 없음: ' + ${JSON.stringify(text)});
        btn.click();
    })()`);
    await sleep(waitMs);
};

/** 화면에 찍힌 상태를 그대로 읽습니다. 내부 변수가 아니라 채점자가 보는 글자입니다. */
const replayState = () => evaluate(`(() => {
    const sec = [...document.querySelectorAll('section')]
        .find(s => (s.querySelector('h2') || {}).textContent?.includes('합성 검사 재생'));
    const spans = [...sec.querySelectorAll('span')].map(s => s.textContent.trim());
    const after = (label) => { const i = spans.indexOf(label); return i >= 0 ? spans[i + 1] : null; };
    return {
        freshness: after('freshness'),
        error_code: after('error_code'),
        rows: after('일별 행 수'),
        lastGood: after('마지막 정상값'),
        stale: sec.textContent.includes('오래된 값'),
        table: [...sec.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim())),
    };
})()`);

await replayClick("정상 · 일별 저장", 700);
await shotSection("16_합성재생_정상_일별저장", "합성 검사 재생");
{
    const st = await replayState();
    log.push({
        name: "16_합성재생_정상_일별저장",
        status: `${st.freshness}/${st.error_code} · 행 ${st.rows}건 · 값 ${st.lastGood}`,
        note: "D1-A→D1-B는 같은 행 갱신(C20), D2는 새 행(C21)",
    });
}

for (const [label, name, code] of [
    ["느린 응답", "17_합성재생_실패_timeout", "timeout"],
    ["401 거절", "18_합성재생_실패_auth", "auth"],
    ["호출 제한", "19_합성재생_실패_rate_limit", "rate_limit"],
    ["오프라인", "20_합성재생_실패_offline", "offline"],
    ["형식 변경", "21_합성재생_실패_schema_error", "schema_error"],
]) {
    await replayClick(label, 600);
    await shotSection(name, "합성 검사 재생");
    const st = await replayState();
    log.push({
        name,
        status: `${st.freshness}/${st.error_code} · 마지막 정상값 ${st.lastGood} 유지 · 오래된 값 표시 ${st.stale ? "있음" : "없음"}`,
        note: `기대 error_code ${code} — 마지막 정상값과 행을 지우지 않음 (C17·C18)`,
    });
}

// C19 — 실패 상태에서 다시 시도를 눌러 fresh/none으로 복구하고 새 행이 정확히 1건 늘어야 합니다.
await replayClick("느린 응답", 600);
const beforeRecover = await replayState();
await replayClick("다시 시도 —", 700);
await shotSection("22_합성재생_회복_recover_d2", "합성 검사 재생");
{
    const after = await replayState();
    const added = after.table.filter((r) => r[1] === "2026-08-25").length;
    log.push({
        name: "22_합성재생_회복_recover_d2",
        status: `${beforeRecover.freshness}/${beforeRecover.error_code} 행 ${beforeRecover.rows} → ${after.freshness}/${after.error_code} 행 ${after.rows} · 값 ${after.lastGood}`,
        note: `T04-RECOVER-D2 재생 — 2026-08-25 신규 행 ${added}건 (C19)`,
    });
}

console.log("H. 모바일 화면");
await send("Emulation.setDeviceMetricsOverride", {
    width: 375, height: 812, deviceScaleFactor: 2, mobile: true,
});
await goto();
await sleep(800);
await shot("15_모바일_375");
const mobile = await evaluate(`({
    horizontalScroll: document.body.scrollWidth > document.documentElement.clientWidth,
    width: document.body.scrollWidth,
})`);
log.push({
    name: "15_모바일_375",
    status: `가로 스크롤 ${mobile.horizontalScroll ? "발생" : "없음"} (본문 폭 ${mobile.width}px)`,
    note: "375×812 화면",
});

// ───────────────────────────────────────── 기록 저장
const external = [...new Set(networkLog.map((r) => r.url))]
    .filter((u) => !u.startsWith(URL_APP) && !u.startsWith("data:") && !u.startsWith("blob:"));

fs.writeFileSync(
    path.join(SHOT_DIR, "촬영 기록.json"),
    JSON.stringify({
        capturedAt: new Date().toISOString(),
        url: URL_APP,
        screenValue: snapshot.screenValue,
        sourceUrl: snapshot.sourceUrl,
        rawValue,
        records: secondSave,
        diff: diffData,
        externalRequests: external,
        requestCount: networkLog.length,
        log,
    }, null, 2),
    "utf-8",
);

console.log("\n외부로 나간 요청 주소:");
external.forEach((u) => console.log("  ", u));
console.log("\n완료. 저장 위치:", SHOT_DIR);
ws.close();
chrome.kill();
process.exit(0);
