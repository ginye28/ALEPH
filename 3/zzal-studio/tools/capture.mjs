/**
 * 증빙 화면 자동 촬영기.
 *
 * 개발 서버(http://localhost:5174)가 떠 있는 상태에서 실행합니다.
 * 헤드리스 브라우저로 앱을 실제로 조작해 화면을 찍고, 내려받기 버튼을 눌러
 * 완성 이미지도 실제 저장 경로로 받아 옵니다.
 *
 *   node zzal-studio/tools/capture.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const URL_APP = "http://localhost:5174";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "짤카드 증빙 화면");
const SRC_DIR = path.join(import.meta.dirname, "소재");
const DATA_DIR = path.join(ROOT, "zzal-studio", "검사 자료");
const DL_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "zzal-dl-"));
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "zzal-profile-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;

fs.mkdirSync(SHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────── CDP 연결
const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--window-size=1440,1560",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--no-first-run",
    "--disable-gpu",
    URL_APP,
], { stdio: "ignore" });

let ws;
let nextId = 1;
const pending = new Map();

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

const shot = async (name) => {
    await sleep(450);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    const file = path.join(SHOT_DIR, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    console.log("  촬영", name);
};

const upload = async (selector, filePath) => {
    const { root } = await send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`입력을 찾지 못했습니다: ${selector}`);
    await send("DOM.setFileInputFiles", { nodeId, files: [filePath] });
    await evaluate(`(() => {
        const el = document.querySelector('${selector}');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(600);
};

const helpers = `
window.__btn = (t) => [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(t));
window.__click = (t) => { const b = window.__btn(t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); };
window.__ctl = (t) => {
    const lab = [...document.querySelectorAll('label')].find(l => l.textContent.trim().startsWith(t));
    return lab ? lab.querySelector('input, textarea') : null;
};
window.__set = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
};
window.__setCtl = (t, v) => { const el = window.__ctl(t); if (!el) throw new Error('조작 없음: ' + t); window.__set(el, v); };
window.__status = () => document.querySelector('[role="status"]').textContent.trim();
true;
`;

const prep = async () => {
    await evaluate(helpers);
};

// 앱이 만든 파일만 봅니다. 브라우저가 남기는 부산물(downloads.htm 등)은 걸러냅니다.
const isOutput = (f) => /^zzal-.*\.(png|jpg)$/i.test(f);

const waitDownload = async (before) => {
    for (let i = 0; i < 60; i += 1) {
        const fresh = fs.readdirSync(DL_DIR).filter((f) => isOutput(f) && !before.includes(f));
        if (fresh.length) {
            await sleep(300);
            return fresh.sort((a, b) =>
                fs.statSync(path.join(DL_DIR, b)).mtimeMs - fs.statSync(path.join(DL_DIR, a)).mtimeMs)[0];
        }
        await sleep(200);
    }
    throw new Error("내려받기 파일을 찾지 못했습니다.");
};

const download = async (targetName) => {
    const before = fs.readdirSync(DL_DIR).filter(isOutput);
    await evaluate(`window.__click('이미지 내려받기')`);
    const file = await waitDownload(before);
    const ext = path.extname(file);
    const dest = path.join(SHOT_DIR, `${targetName}${ext}`);
    fs.copyFileSync(path.join(DL_DIR, file), dest);
    console.log("  저장", path.basename(dest), fs.statSync(dest).size, "바이트 · 원래 이름", file);
    return { dest, original: file };
};

// ───────────────────────────────────────── 촬영 순서
const log = [];

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1560, deviceScaleFactor: 1, mobile: false });
await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL_DIR });

const goto = async () => {
    await send("Page.navigate", { url: URL_APP });
    await sleep(1400);
    await prep();
};

await goto();
await evaluate(`localStorage.removeItem('zzal-studio.templates.v1')`);
await goto();

console.log("A. 편집과 미리보기");
await upload('input[type=file][accept*="image"]', path.join(SRC_DIR, "세로소재.png"));
await evaluate(`window.__setCtl('문구 내용', '오늘도 무사히\\n퇴근 성공')`);
await shot("01_PNG불러오기");
log.push(["01_PNG불러오기", await evaluate(`window.__status()`)]);

await upload('input[type=file][accept*="image"]', path.join(SRC_DIR, "세로소재.jpg"));
await shot("02_JPEG불러오기");
log.push(["02_JPEG불러오기", await evaluate(`window.__status()`)]);

await evaluate(`(() => {
    window.__setCtl('문구 내용', '문구 위치·크기·색을\\n바꾼 결과입니다');
    window.__setCtl('글자 크기', 0.11);
    window.__setCtl('세로 위치', 0.24);
    const color = window.__ctl('글자 색'); window.__set(color, '#ffd166');
})()`);
await shot("03_문구변경");

await upload('input[type=file][accept*="image"]', path.join(SRC_DIR, "지원안함.svg"));
await shot("04_지원안하는파일");
log.push(["04_지원안하는파일", await evaluate(`window.__status()`)]);

console.log("B. 화면비");
for (const [ratio, name] of [["1:1", "05_비율_1대1"], ["4:5", "06_비율_4대5"], ["9:16", "07_비율_9대16"]]) {
    await evaluate(`window.__click('${ratio}')`);
    await shot(name);
}

console.log("B-4. 미리보기와 저장 파일 비교");
await goto();
await upload('input[type=file][accept*="image"]', path.join(SRC_DIR, "세로소재.png"));
await evaluate(`(() => {
    window.__click('4:5');
    window.__setCtl('문구 내용', '미리보기와 저장 파일\\n배치 비교용 문구');
    window.__setCtl('세로 위치', 0.8);
    window.__setCtl('문구 뒤 띠', 0.45);
})()`);
await sleep(500);
{
    // 화면에 보이는 미리보기 캔버스 영역만 그대로 잘라 찍습니다.
    const rect = await evaluate(`(() => {
        const c = document.querySelector('canvas');
        const r = c.getBoundingClientRect();
        return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
    })()`);
    const { data } = await send("Page.captureScreenshot", {
        format: "png", captureBeyondViewport: true,
        clip: { ...rect, scale: 1 },
    });
    fs.writeFileSync(path.join(SHOT_DIR, "08a_미리보기영역.png"), Buffer.from(data, "base64"));
    console.log("  촬영 08a_미리보기영역");
}
await download("08b_저장파일");

console.log("C. 대표 결함 수정 전·후");
await goto();
await upload('input[type=file][accept*="image"]', path.join(SRC_DIR, "자료표.png"));
await evaluate(`(() => {
    window.__click('1:1');
    window.__click('맞추기');
    window.__setCtl('문구 내용', '오늘 한 내용');
    window.__setCtl('세로 위치', 0.5);
    window.__setCtl('글자 크기', 0.1);
    const color = window.__ctl('글자 색'); window.__set(color, '#000000');
    window.__setCtl('외곽선 두께', 0);
    window.__setCtl('문구 뒤 띠', 0);
    const bg = document.querySelector('input[aria-label="배경색"]'); window.__set(bg, '#ffffff');
})()`);
await shot("09a_결함_수정전_화면");
const before = await download("09_결함_수정전");

await evaluate(`(() => {
    // 고친 방법 두 가지 — 문구를 표 밖 여백으로 옮기고, 글자 뒤에 진한 띠를 깝니다.
    window.__setCtl('세로 위치', 0.22);
    window.__setCtl('문구 뒤 띠', 0.85);
    const boxColor = window.__ctl('띠 색'); window.__set(boxColor, '#111114');
    const color = window.__ctl('글자 색'); window.__set(color, '#ffffff');
})()`);
await shot("10a_결함_수정후_화면");
const after = await download("10_결함_수정후");

console.log("F. 완성 이미지 3장");
await goto();
await upload('input[type=file][accept*="image"]', path.join(SRC_DIR, "세로소재.png"));
await evaluate(`(() => {
    window.__click('9:16');
    window.__setCtl('문구 내용', '퇴근길에\\n하늘이 예뻤다');
    window.__setCtl('세로 위치', 0.82);
    window.__setCtl('글자 크기', 0.075);
})()`);
const done1 = await download("16_완성이미지_1");

await evaluate(`(() => {
    window.__click('4:5');
    window.__setCtl('문구 내용', '오늘 배운 것\\n하나만 남기기');
    window.__setCtl('세로 위치', 0.5);
    window.__setCtl('문구 뒤 띠', 0.55);
})()`);
const done2 = await download("17_완성이미지_2");

await goto();
await upload('input[type=file][accept*="image"]', path.join(SRC_DIR, "투명원.png"));
await evaluate(`(() => {
    window.__click('1:1');
    window.__click('맞추기');
    window.__setCtl('문구 내용', '투명 배경 유지');
    window.__setCtl('세로 위치', 0.88);
    const btn = window.__btn('투명'); btn.click();
})()`);
await shot("11a_투명배경_화면");
const done3 = await download("18_완성이미지_3");

console.log("D·E. 템플릿과 옮겨 쓰기");
await goto();
for (const [name, ratio, text] of [
    ["밈 자막", "1:1", "조스 아조씨 껄껄"],
    ["카드 표지", "4:5", "KORIT"],
    ["자료 캡처", "9:16", "오늘 한 내용"],
]) {
    await evaluate(`(() => {
        window.__click('${ratio}');
        window.__setCtl('문구 내용', '${text}');
        const nameInput = document.querySelector('input[aria-label="템플릿 이름"]');
        window.__set(nameInput, '${name}');
        window.__click('새 템플릿 만들기');
    })()`);
    await sleep(400);
}
await shot("11_템플릿_3개");
log.push(["11_템플릿_3개", await evaluate(`window.__status()`)]);

await goto();
await shot("12_템플릿_새로고침후");
log.push(["12_템플릿_새로고침후", await evaluate(`
    [...document.querySelectorAll('li')].filter(li => li.textContent.includes('불러오기')).length
        + '개 템플릿이 새로고침 뒤에도 표시됨'
`)]);

await upload('input[type=file][accept*="json"]', path.join(DATA_DIR, "정상.json"));
await shot("13_JSON_정상가져오기");
log.push(["13_JSON_정상가져오기", await evaluate(`window.__status()`)]);

await upload('input[type=file][accept*="json"]', path.join(DATA_DIR, "문법오류.json"));
await shot("14_JSON_문법오류");
log.push(["14_JSON_문법오류", await evaluate(`window.__status()`)]);

await upload('input[type=file][accept*="json"]', path.join(DATA_DIR, "필수항목누락.json"));
await shot("15_JSON_필수항목누락");
log.push(["15_JSON_필수항목누락", await evaluate(`window.__status()`)]);

await evaluate(`localStorage.removeItem('zzal-studio.templates.v1')`);

fs.writeFileSync(
    path.join(SHOT_DIR, "촬영 기록.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), url: URL_APP, log, downloads: [before, after, done1, done2, done3] }, null, 2),
    "utf-8",
);

console.log("\n완료. 저장 위치:", SHOT_DIR);
ws.close();
chrome.kill();
process.exit(0);
