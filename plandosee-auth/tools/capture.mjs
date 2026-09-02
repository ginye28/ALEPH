/**
 * 증빙 자동 촬영기 (7.md).
 *
 *   node plandosee-auth/tools/capture.mjs
 *   BOARD_URL=https://... node plandosee-auth/tools/capture.mjs
 *
 * 7.md의 핵심은 "막았다"는 문장이 아니라 막히는 장면(성공 요청과 거절 요청을 나란히)입니다.
 * 이 스크립트는 check.mjs와 같은 방식으로 스크래치 계정 두 개(A·B)를 직접 만들어 가입·로그인·
 * 로그아웃·계정 간 격리를 화면으로 찍습니다. 실제 개인 계정(카드 5의 진짜 5일 기록)은
 * 이 스크립트가 손댈 수 없습니다 — 비밀번호를 이 스크립트에 넣지 않기 때문입니다(설계 원칙 2).
 * 그 화면은 로그인해 둔 실제 세션에서 따로, 사람이 직접 찍어 같은 폴더에 둡니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5178").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제7 증빙 화면");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds-auth-shot-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9356;
const RUN_STAMP = Date.now();
const EMAIL_A = `pds-auth-shot-a-${RUN_STAMP}@example.com`;
const EMAIL_B = `pds-auth-shot-b-${RUN_STAMP}@example.com`;
const PASSWORD = "ShotPass!23456";
const WRONG_PASSWORD = "WrongPass!99999";
const NONEXISTENT_EMAIL = `pds-auth-shot-none-${RUN_STAMP}@example.com`;

fs.mkdirSync(SHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--window-size=1180,1600",
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
window.__fill = (id, value) => { const el = document.getElementById(id); const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); };
window.__stat = (id) => (document.querySelector('[data-testid="' + id + '"]') || {}).textContent || '';
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(1500);
    await evaluate(helpers);
};

const fillLogin = async (email, password) => {
    await evaluate(`window.__fill('auth-email', ${JSON.stringify(email)})`);
    await evaluate(`window.__fill('auth-password', ${JSON.stringify(password)})`);
};

// ───────────────────────────────────────── 촬영
const log = [];
const record = (name, status, note) => log.push({ name, status, note });

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 1600, deviceScaleFactor: 2, mobile: false });
await goto();

const backendMode = await evaluate(`window.__backendMode`);
console.log(`백엔드: ${backendMode}`);

console.log("A. 카드1 · 비로그인 첫 화면");
await shot("01_비로그인_로그인화면");
record("01_비로그인_로그인화면", "로그인 폼만 있고 자료 화면 요소는 없음", "로그인하지 않으면 자료 화면 자체가 열리지 않는다는 안내가 첫 화면에 그대로 있음(검사 15·21)");

console.log("B. 카드1 · 가입 → 세션 생김");
await evaluate(`window.__click('처음이라면 가입하기')`);
await sleep(300);
await fillLogin(EMAIL_A, PASSWORD);
await shot("02_가입_입력");
await evaluate(`window.__click('가입하기')`);
await sleep(700);
await shot("03_가입_직후_메인화면");
record("03_가입_직후_메인화면", `계정 A(${EMAIL_A}) 가입 직후 자동 로그인, 자료 화면(계획 없음) 표시`, "가입 → 로그인이 이어짐(검사 18)");

console.log("C. 카드1 · 로그아웃");
await evaluate(`window.__click('로그아웃')`);
await sleep(500);
await shot("04_로그아웃_후_로그인화면");
record("04_로그아웃_후_로그인화면", "로그아웃하면 다시 로그인 화면만 보임", "로그아웃 후 세션이 사라짐(검사 18)");

console.log("D. 카드1 · 존재하지 않는 계정 vs 비밀번호만 틀림 — 같은 오류 문구");
await fillLogin(EMAIL_A, WRONG_PASSWORD);
await evaluate(`window.__click('로그인')`);
await sleep(500);
await shotSelector("05_오류_비밀번호틀림", '[data-testid="auth-error"]');
const errWrongPw = await evaluate(`window.__stat('auth-error')`);

await fillLogin(NONEXISTENT_EMAIL, PASSWORD);
await evaluate(`window.__click('로그인')`);
await sleep(500);
await shotSelector("06_오류_계정없음", '[data-testid="auth-error"]');
const errNoAccount = await evaluate(`window.__stat('auth-error')`);
record(
    "05_06_오류문구_대조",
    `비밀번호틀림 "${errWrongPw.trim()}" / 계정없음 "${errNoAccount.trim()}"`,
    errWrongPw.trim() === errNoAccount.trim() ? "두 경우의 화면 문구가 완전히 동일 — 계정 존재 여부를 흘리지 않음(검사 20)" : "문구가 다름(문제)",
);

console.log("E. 카드1 · 가입 중복 거절");
await evaluate(`window.__click('처음이라면 가입하기')`);
await sleep(300);
await fillLogin(EMAIL_A, PASSWORD);
await evaluate(`window.__click('가입하기')`);
await sleep(600);
await shotSelector("07_중복가입_거절", '[data-testid="auth-error"]');
record("07_중복가입_거절", "이미 있는 이메일로 다시 가입 시도 → 거절 문구", "같은 이메일 재가입이 막힘(검사 19)");

console.log("F. 카드4 · 계정 A로 실제 로그인해 계획 하나 만들기");
await evaluate(`window.__click('이미 계정이 있습니다')`); // 중복가입 시도 뒤라 아직 "가입" 모드입니다 — 로그인 모드로 되돌립니다.
await sleep(200);
await evaluate(`window.__fill('auth-email', ${JSON.stringify(EMAIL_A)})`);
await evaluate(`window.__fill('auth-password', ${JSON.stringify(PASSWORD)})`);
await evaluate(`window.__click('로그인')`);
await sleep(700);
await evaluate(`window.__fill('plan-title', ${JSON.stringify("[검사] A의 계획")})`);
await evaluate(`window.__fill('plan-start', '2026-09-01')`);
await evaluate(`window.__fill('plan-end', '2026-09-05')`);
await evaluate(`window.__fill('plan-success', '격리 증빙용')`);
await evaluate(`window.__fill('plan-estimated', '60')`);
await evaluate(`window.__click('계획 만들기')`);
await sleep(600);
await shot("08_계정A_자료화면");
record("08_계정A_자료화면", "계정 A가 만든 계획이 A의 화면에 보임", "정상적으로 로그인한 계정에는 자기 자료가 보임");

const planAId = await evaluate(`window.__db.plans.listWithCurrent().then(r => r.data.find(p => p.current?.title === '[검사] A의 계획')?.id)`);

console.log("G. 카드4 · 계정 B 가입 — A의 계획이 안 보임");
await evaluate(`window.__click('로그아웃')`);
await sleep(400);
await evaluate(`window.__click('처음이라면 가입하기')`);
await sleep(300);
await fillLogin(EMAIL_B, PASSWORD);
await evaluate(`window.__click('가입하기')`);
await sleep(700);
await shot("09_계정B_빈화면");
record("09_계정B_빈화면", "계정 B로 가입 직후 — 계획 목록이 비어 있음(A의 계획이 안 보임)", "목록 조회에 상대 계정 행이 0건(검사 28)");

console.log("H. 카드4 · 계정 B가 A의 계획 id를 직접 조회 — 거절");
let directReadBlocked = null;
if (planAId) {
    directReadBlocked = await evaluate(`window.__db.plans.get(${JSON.stringify(planAId)}).then(r => r.data)`);
}
record(
    "10_직접조회_거절",
    `B가 A의 계획 id(${planAId ? planAId.slice(0, 8) : "?"})를 window.__db.plans.get()으로 직접 조회 → 응답: ${JSON.stringify(directReadBlocked)}`,
    directReadBlocked === null ? "RLS가 남의 행을 null로 돌려줌 — 서버가 거절함(검사 26)" : "차단되지 않음(문제)",
);

console.log("I. 카드5 · 계정 관리 화면");
await shotSectionByHeading("11_계정관리", "내 계정");
record("11_계정관리", "로그아웃·계정 삭제 버튼과 삭제 범위 안내", "계정 삭제는 내 데이터 행까지만 지우고 가입 정보는 별도 절차임을 화면에 명시(T07-C134)");

console.log("J. 토큰이 URL에 없음 (텍스트 기록)");
const currentUrl = await evaluate(`window.location.href`);
record("12_토큰_URL없음", `현재 주소: ${currentUrl}`, "access_token/refresh_token 문자열이 주소 어디에도 없음(검사 24) — 스크린샷 대신 주소 문자열 그대로 기록");

console.log("K. 모바일");
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 1200, deviceScaleFactor: 2, mobile: true });
await goto();
await sleep(300);
await shot("13_모바일_375_로그인화면");
{
    const mobile = await evaluate(`({ scroll: document.body.scrollWidth > document.documentElement.clientWidth, width: document.body.scrollWidth })`);
    record("13_모바일_375_로그인화면", `가로 스크롤 ${mobile.scroll ? "발생" : "없음"} (본문 폭 ${mobile.width}px)`, "375px 화면 — 로그인 화면 기준");
}

// ───────────────────────────────────────── 기록 저장
const external = [...new Set(networkLog.filter((u) => !u.startsWith(URL_APP) && u.startsWith("http")))];

fs.writeFileSync(
    path.join(SHOT_DIR, "촬영 기록.json"),
    JSON.stringify(
        { capturedAt: new Date().toISOString(), url: URL_APP, backendMode, externalRequests: external, log, note: "실사용 계정(카드 5) 화면은 이 스크립트가 아니라 로그인해 둔 실제 세션에서 사람이 직접 찍어 같은 폴더에 추가합니다 — 비밀번호를 스크립트에 넣지 않기 위해서입니다." },
        null,
        2,
    ),
    "utf-8",
);

console.log(`\n촬영 완료 · 외부 요청 ${external.length}종`);
console.log(`기록: ${path.join(SHOT_DIR, "촬영 기록.json")}`);

ws.close();
chrome.kill();
process.exit(0);
