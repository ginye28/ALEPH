/**
 * 검사 10개 실행기 (설계 원칙 5).
 *
 * 통과·실패를 사람 눈이 아니라 이 명령 하나가 판정합니다.
 * 헤드리스 브라우저로 실제 화면을 조작해 번호별 PASS/FAIL을 출력합니다.
 *
 *   node plandosee/tools/check.mjs
 *   node plandosee/tools/check.mjs --json      # 결과를 "검사 기록/"에 남깁니다
 *
 * 공개 주소에서 검사하려면 BOARD_URL을 앞에 붙입니다.
 * 주지 않으면 개발 서버(http://localhost:5177)에서 검사합니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5177").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const LOG_DIR = path.join(ROOT, "검사 기록");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds-check-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9340;
const STORAGE_KEY = "plandosee.records.v2";
const WRITE_JSON = process.argv.includes("--json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────── CDP 연결
const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--window-size=1180,1500",
        "--hide-scrollbars",
        "--no-first-run",
        "--disable-gpu",
        URL_APP,
    ],
    { stdio: "ignore" },
);

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

/**
 * 화면을 읽는 도우미.
 * 검사 전용 표식을 새로 심지 않고, 채점자가 눈으로 읽는 것과 같은 글자·같은 버튼을 읽습니다.
 */
const helpers = `
window.__btn = (t) => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t));
window.__click = (t) => { const b = window.__btn(t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); };
window.__stat = (id) => (document.querySelector('[data-testid="' + id + '"]') || {}).textContent || '';
window.__num = (id) => Number(String(window.__stat(id)).replace(/[^0-9.-]/g, ''));
window.__rows = () => [...document.querySelectorAll('table[aria-label="기록 목록"] tbody tr')]
    .map(tr => {
        const cells = [...tr.children].map(td => td.textContent.trim());
        return { date: cells[0], subject: cells[1], minutes: Number(cells[2].replace(/[^0-9.-]/g,'')), id: cells[5] };
    });
window.__held = () => [...document.querySelectorAll('table[aria-label="보류 목록"] tbody tr')]
    .map(tr => { const c = [...tr.children].map(td => td.textContent.trim()); return { date: c[0], subject: c[1], value: c[2], reason: c[3] }; });
window.__stored = () => { try { return JSON.parse(localStorage.getItem('${STORAGE_KEY}') || 'null'); } catch { return null; } };
window.__message = () => window.__stat('data-message');
window.__schema = () => window.__stat('schema-line').replace(/\\s+/g,' ').trim();
window.__errors = () => [...document.querySelectorAll('form span')]
    .map(s => s.textContent.trim())
    .filter(t => /비었습니다|형식|이하|이상|숫자/.test(t));

/** 폼 한 칸에 값을 넣습니다. React가 바뀐 것을 알도록 네이티브 setter를 씁니다. */
window.__fill = (id, value) => {
    const el = document.getElementById(id);
    if (!el) throw new Error('칸 없음: ' + id);
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
};

/** 목록의 n번째 행에서 수정/삭제를 누릅니다. */
window.__rowAction = (index, label) => {
    const rows = [...document.querySelectorAll('table[aria-label="기록 목록"] tbody tr')];
    const row = rows[index];
    if (!row) throw new Error('행 없음: ' + index);
    const btn = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === label);
    if (!btn) throw new Error('행 버튼 없음: ' + label);
    btn.click();
};

/** 파일 고르기를 흉내 냅니다. 실제 input에 File을 얹어 change를 일으킵니다. */
window.__putFile = (text, name) => {
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('파일 입력 없음');
    const dt = new DataTransfer();
    dt.items.add(new File([text], name, { type: 'application/json' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
};
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(1400);
    await evaluate(helpers);
};

const clearStorage = () => evaluate(`localStorage.removeItem('${STORAGE_KEY}')`);

/** 합성 자료를 넣고 화면이 그려질 때까지 기다립니다. */
const seed = async (kind) => {
    await evaluate(`window.__click(${JSON.stringify(kind === "v1" ? "v1 합성 기록" : "경계 · 오류 자료")})`);
    await sleep(450);
};

// ───────────────────────────────────────── 검사 정의
const CHECKS = [
    { n: 1, kind: "정상", title: "기록을 추가하면 목록이 1건 늘고 주간 합계가 그만큼 늘어난다" },
    { n: 2, kind: "정상", title: "행을 수정하면 그 행만 바뀌고 주간 합계가 함께 바뀐다" },
    { n: 3, kind: "정상", title: "행을 삭제하면 그 행만 사라지고 합계가 줄어든다" },
    { n: 4, kind: "정상", title: "새로고침 뒤에도 건수·id·값이 그대로다" },
    { n: 5, kind: "오류", title: "필수값이 비면 저장되지 않고 칸마다 이유가 보인다" },
    { n: 6, kind: "오류", title: "깨진 파일을 가져와도 기존 기록이 그대로이고 이유가 보인다" },
    { n: 7, kind: "오류", title: "잘못된 값과 날짜는 보류로 가고 집계에 섞이지 않는다" },
    { n: 8, kind: "회귀", title: "v1을 v2로 변환하고 다시 읽어도 건수·합계가 같다" },
    { n: 9, kind: "회귀", title: "월요일과 일요일 경계 기록이 같은 주에 들어간다" },
    { n: 10, kind: "회귀", title: "전체 삭제 뒤 0건이고 새로고침해도 0건이다" },
];

const results = new Map();
const pass = (n, detail) => results.set(n, { pass: true, detail });
const fail = (n, detail) => results.set(n, { pass: false, detail });

/** 검사 하나가 예외로 죽어도 나머지는 계속 돌립니다. */
const guard = async (n, body) => {
    try {
        await body();
    } catch (error) {
        if (!results.has(n)) fail(n, `검사 중 오류 — ${error.message.split("\n")[0]}`);
    }
};

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
    width: 1180,
    height: 1500,
    deviceScaleFactor: 1,
    mobile: false,
});

// ── 검사 1 · 추가
await guard(1, async () => {
    await goto();
    await clearStorage();
    await goto();
    await seed("v1");

    const before = { rows: await evaluate(`window.__rows().length`), total: await evaluate(`window.__num('week-total')`) };

    // v1 자료가 들어 있는 주(2026-08-24 주)에 한 건 더합니다.
    await evaluate(`window.__fill('f-date', '2026-08-25')`);
    await evaluate(`window.__fill('f-subject', '검사추가')`);
    await evaluate(`window.__fill('f-minutes', '35')`);
    await evaluate(`window.__click('추가')`);
    await sleep(450);

    const after = { rows: await evaluate(`window.__rows().length`), total: await evaluate(`window.__num('week-total')`) };

    if (after.rows === before.rows + 1 && after.total === before.total + 35) {
        pass(1, `목록 ${before.rows}→${after.rows}건 · 합계 ${before.total}→${after.total}분 (+35)`);
    } else {
        fail(1, `목록 ${before.rows}→${after.rows} · 합계 ${before.total}→${after.total} (기대 +1건 / +35분)`);
    }
});

// ── 검사 2 · 수정은 그 행에만
await guard(2, async () => {
    const rowsBefore = await evaluate(`window.__rows()`);
    const target = rowsBefore.findIndex((r) => r.subject === "검사추가");
    if (target < 0) {
        fail(2, "검사 1이 넣은 행을 찾지 못했습니다");
        return;
    }
    const totalBefore = await evaluate(`window.__num('week-total')`);
    const others = rowsBefore.filter((_, i) => i !== target).map((r) => `${r.id}:${r.minutes}`);

    await evaluate(`window.__rowAction(${target}, '수정')`);
    await sleep(350);
    await evaluate(`window.__fill('f-minutes', '80')`);
    await evaluate(`window.__click('수정 저장')`);
    await sleep(450);

    const rowsAfter = await evaluate(`window.__rows()`);
    const totalAfter = await evaluate(`window.__num('week-total')`);
    const changed = rowsAfter.find((r) => r.subject === "검사추가");
    const othersAfter = rowsAfter.filter((r) => r.subject !== "검사추가").map((r) => `${r.id}:${r.minutes}`);

    const onlyOne = others.join("|") === othersAfter.join("|");
    if (changed?.minutes === 80 && onlyOne && totalAfter === totalBefore + 45) {
        pass(2, `그 행만 35→80분 · 다른 ${othersAfter.length}행 그대로 · 합계 ${totalBefore}→${totalAfter}분`);
    } else {
        fail(2, `값 ${changed?.minutes} · 다른 행 ${onlyOne ? "그대로" : "바뀜"} · 합계 ${totalBefore}→${totalAfter}`);
    }
});

// ── 검사 3 · 삭제
await guard(3, async () => {
    const rowsBefore = await evaluate(`window.__rows()`);
    const target = rowsBefore.findIndex((r) => r.subject === "검사추가");
    const totalBefore = await evaluate(`window.__num('week-total')`);

    await evaluate(`window.__rowAction(${target}, '삭제')`);
    await sleep(450);

    const rowsAfter = await evaluate(`window.__rows()`);
    const totalAfter = await evaluate(`window.__num('week-total')`);
    const gone = !rowsAfter.some((r) => r.subject === "검사추가");

    if (gone && rowsAfter.length === rowsBefore.length - 1 && totalAfter === totalBefore - 80) {
        pass(3, `${rowsBefore.length}→${rowsAfter.length}건 · 합계 ${totalBefore}→${totalAfter}분 (−80)`);
    } else {
        fail(3, `삭제 ${gone ? "됨" : "안 됨"} · ${rowsBefore.length}→${rowsAfter.length}건 · 합계 ${totalBefore}→${totalAfter}`);
    }
});

// ── 검사 4 · 새로고침 유지
await guard(4, async () => {
    const before = await evaluate(`window.__rows()`);
    await goto();
    const after = await evaluate(`window.__rows()`);

    const same =
        before.length === after.length &&
        before.every((row, i) => row.id === after[i].id && row.minutes === after[i].minutes && row.date === after[i].date);

    if (same) pass(4, `${before.length}건 · id·날짜·값 모두 같음`);
    else fail(4, `새로고침 전 ${before.length}건 → 후 ${after.length}건, 내용 불일치`);
});

// ── 검사 5 · 필수값 검사
await guard(5, async () => {
    await evaluate(`window.__fill('f-subject', '')`);
    await evaluate(`window.__fill('f-minutes', '')`);
    const rowsBefore = await evaluate(`window.__rows().length`);

    await evaluate(`window.__click('추가')`);
    await sleep(400);

    const rowsAfter = await evaluate(`window.__rows().length`);
    const errors = await evaluate(`window.__errors()`);

    if (rowsAfter === rowsBefore && errors.length >= 2) {
        pass(5, `저장되지 않음 (${rowsBefore}건 유지) · 이유 ${errors.length}개 — ${errors.join(" / ")}`);
    } else {
        fail(5, `${rowsBefore}→${rowsAfter}건 · 이유 ${errors.length}개`);
    }
});

// ── 검사 6 · 깨진 파일
await guard(6, async () => {
    await goto();
    const before = await evaluate(`window.__rows()`);

    await evaluate(`window.__putFile('{ 이건 JSON이 아닙니다', 'broken.json')`);
    await sleep(600);

    const after = await evaluate(`window.__rows()`);
    const message = await evaluate(`window.__message()`);
    const kept = before.length === after.length && before.every((r, i) => r.id === after[i].id);
    const explained = /읽지 못했습니다|records 배열/.test(message);

    if (kept && explained) {
        pass(6, `기존 ${before.length}건 그대로 · 화면 문구 "${message.slice(0, 60)}"`);
    } else {
        fail(6, `기록 ${before.length}→${after.length}건 · 문구 "${message.slice(0, 60)}"`);
    }
});

// ── 검사 7 · 잘못된 값은 보류로
await guard(7, async () => {
    await goto();
    await seed("edge");

    const held = await evaluate(`window.__held()`);
    const total = await evaluate(`window.__num('week-total')`);
    const count = await evaluate(`window.__num('week-count')`);

    const reasons = held.map((h) => h.reason).join(" | ");
    const wantAll = ["값이 비었습니다", "숫자가 아닙니다", "1 이상", "1440 이하", "없는 달", "없는 날짜", "id 중복"];
    const missing = wantAll.filter((want) => !reasons.includes(want));

    // 보류가 집계에 섞였다면 합계가 85분을 넘습니다 (10 + 20 + 55).
    if (missing.length === 0 && total === 85 && count === 3) {
        pass(7, `보류 ${held.length}건 · 합계 ${total}분 · 이번 주 ${count}건 — 보류가 집계에 섞이지 않음`);
    } else {
        fail(7, `보류 ${held.length}건 · 합계 ${total}분 · 누락된 이유 [${missing.join(", ")}]`);
    }
});

// ── 검사 8 · v1 변환의 멱등성
await guard(8, async () => {
    await goto();
    await clearStorage();
    await goto();
    await seed("v1");

    const first = {
        rows: await evaluate(`window.__rows().length`),
        total: await evaluate(`window.__num('week-total')`),
        schema: await evaluate(`window.__schema()`),
        stored: await evaluate(`window.__stored()`),
    };

    // 다시 읽으면 변환이 한 번 더 돕니다. 결과가 같아야 합니다.
    await goto();
    const second = {
        rows: await evaluate(`window.__rows().length`),
        total: await evaluate(`window.__num('week-total')`),
        stored: await evaluate(`window.__stored()`),
    };

    const allV2 = (second.stored?.records ?? []).every((r) => r.schemaVersion === 2 && "tag" in r);
    const same = first.rows === second.rows && first.total === second.total;

    if (allV2 && same && first.schema.includes("v2")) {
        pass(8, `변환 후 ${first.rows}건·${first.total}분 → 다시 읽어도 ${second.rows}건·${second.total}분 · 전부 v2`);
    } else {
        fail(8, `${first.rows}건·${first.total}분 → ${second.rows}건·${second.total}분 · 전부 v2 ${allV2}`);
    }
});

// ── 검사 9 · 주 경계
await guard(9, async () => {
    await goto();
    await seed("edge");

    const range = await evaluate(`window.__stat('week-range')`);
    const rows = await evaluate(`window.__rows()`);
    const total = await evaluate(`window.__num('week-total')`);

    const monday = rows.find((r) => r.date === "2026-08-24");
    const sunday = rows.find((r) => r.date === "2026-08-30");
    const nextWeek = rows.find((r) => r.date === "2026-08-31");

    // 월요일 10 + 일요일 20 + 알고리즘 55 = 85. 다음 주 40이 섞이면 125가 됩니다.
    if (range.includes("2026-08-24") && range.includes("2026-08-30") && monday && sunday && nextWeek && total === 85) {
        pass(9, `${range} · 월요일 ${monday.minutes}분 + 일요일 ${sunday.minutes}분 포함 · 다음 주 ${nextWeek.minutes}분 제외 · 합계 ${total}분`);
    } else {
        fail(9, `${range} · 합계 ${total}분 (기대 85) · 경계 행 ${monday ? "월O" : "월X"}${sunday ? "일O" : "일X"}`);
    }
});

// ── 검사 10 · 전체 삭제
await guard(10, async () => {
    await goto();
    await seed("v1");
    const before = await evaluate(`window.__rows().length`);

    await evaluate(`window.__click('전체 삭제')`);
    await sleep(300);
    await evaluate(`window.__click('네, 전부 지웁니다')`);
    await sleep(450);

    const afterClear = await evaluate(`window.__rows().length`);
    await goto();
    const afterReload = await evaluate(`window.__rows().length`);
    const stored = await evaluate(`window.__stored()`);

    if (before > 0 && afterClear === 0 && afterReload === 0 && stored === null) {
        pass(10, `${before}건 → 삭제 후 0건 → 새로고침 후 0건 · 저장소 비었음`);
    } else {
        fail(10, `${before} → ${afterClear} → ${afterReload}건 · 저장소 ${stored === null ? "비었음" : "남음"}`);
    }
});

// ───────────────────────────────────────── 출력
const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "short",
}).format(new Date());

console.log(`\n검사 대상 ${URL_APP}\n`);

const rows = CHECKS.map((check) => {
    const result = results.get(check.n) ?? { pass: false, detail: "실행되지 않았습니다" };
    console.log(`${String(check.n).padStart(2)}  ${result.pass ? "PASS" : "FAIL"}  [${check.kind}] ${check.title}`);
    console.log(`             ${result.detail}`);
    return { ...check, ...result };
});

const passed = rows.filter((r) => r.pass);
const failed = rows.filter((r) => !r.pass);

console.log("\n─────────────────────────────");
console.log(`PASS ${passed.length} / FAIL ${failed.length}   (${stamp} KST)`);
if (failed.length > 0) console.log(`남은 검사: ${failed.map((r) => r.n).join(", ")}`);

if (WRITE_JSON) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, `plandosee-${stamp.replace(/[: ]/g, "-")}.json`);
    fs.writeFileSync(
        file,
        JSON.stringify(
            { checkedAt: new Date().toISOString(), url: URL_APP, passed: passed.map((r) => r.n), failed: failed.map((r) => r.n), results: rows },
            null,
            2,
        ),
        "utf-8",
    );
    console.log(`기록 저장: ${file}`);
}

ws.close();
chrome.kill();
process.exit(0);
