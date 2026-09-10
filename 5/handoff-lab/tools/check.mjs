/**
 * 검사 10개 실행기 (설계도 원칙 1).
 *
 * 통과·실패를 사람 눈이 아니라 이 명령 하나가 판정합니다.
 * 헤드리스 브라우저로 실제 화면을 조작해 번호별 PASS/FAIL을 출력합니다.
 *
 *   node handoff-lab/tools/check.mjs
 *   node handoff-lab/tools/check.mjs --json      # 결과를 "검사 기록/"에 남깁니다
 *
 * 공개 주소에서 검사하려면:
 *   $env:BOARD_URL="https://aleph-dash.vercel.app"; node handoff-lab/tools/check.mjs
 *
 * BOARD_URL을 주지 않으면 개발 서버(http://localhost:5175)에서 검사합니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5175").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const LOG_DIR = path.join(ROOT, "검사 기록");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "board-check-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9335;
const STORAGE_KEY = "today-dashboard.history.v1";
const WRITE_JSON = process.argv.includes("--json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────── CDP 연결 (capture.mjs와 같은 방식)
const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--window-size=1180,1400",
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

/**
 * 화면을 읽는 도우미. 검사 전용 표식을 코드에 심지 않고,
 * 채점자가 눈으로 읽는 것과 같은 글자·같은 버튼을 읽습니다.
 */
const helpers = `
/**
 * 구역은 제목(h2)으로 찾습니다. 본문 글자로 찾으면 다른 구역이 그 말을 인용한 순간
 * (예: 비교 영역의 "아래 날짜별 기록에서…") 엉뚱한 구역을 잡습니다.
 */
window.__section = (t) => {
    const all = [...document.querySelectorAll('section')];
    return all.find(s => ((s.querySelector('h2') || {}).textContent || '').includes(t))
        ?? all.find(s => s.textContent.includes(t));
};
window.__btn = (t) => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t));
window.__click = (t) => { const b = window.__btn(t); if (!b) throw new Error('버튼 없음: ' + t); b.click(); };
window.__status = () => (document.querySelector('[role="status"]')?.textContent ?? '').trim();
window.__records = () => JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '{"items":[]}').items;
window.__main = () => document.querySelector('main').textContent;

/** 비교 영역을 읽습니다. 숫자는 화면에 찍힌 계산식에서 그대로 뽑습니다. */
window.__diff = () => {
    const el = window.__section('이전 기록과의 차이');
    const text = el ? el.textContent : '';
    const dates = text.match(/(\\d{4}-\\d{2}-\\d{2})\\s*→\\s*(\\d{4}-\\d{2}-\\d{2})/);
    const eq = text.match(/(-?\\d+\\.\\d+)\\s*\\S*\\s*−\\s*(-?\\d+\\.\\d+)\\s*\\S*\\s*=\\s*([+-]?\\d+\\.\\d+)/);
    return {
        text: text.replace(/\\s+/g, ' ').trim(),
        base: dates ? dates[1] : null,
        target: dates ? dates[2] : null,
        equation: eq ? { target: Number(eq[1]), base: Number(eq[2]), delta: Number(eq[3]) } : null,
        cleared: !!window.__btn('선택 해제'),
    };
};

/** 날짜별 기록의 각 행. 목록 ul 하나만 읽어 안내 문구 목록과 섞이지 않게 합니다. */
window.__rows = () => {
    const el = window.__section('날짜별 기록');
    const list = el ? el.querySelector('ul[aria-label]') : null;
    if (!list) return [];
    return [...list.children].map((li) => {
        const btn = li.querySelector('button');
        const date = (li.textContent.match(/\\d{4}-\\d{2}-\\d{2}/) || [null])[0];
        return {
            date,
            clickable: !!btn && !btn.disabled,
            selected: btn ? btn.getAttribute('aria-pressed') === 'true' : false,
        };
    });
};

window.__clickRow = (date) => {
    const el = window.__section('날짜별 기록');
    const list = el ? el.querySelector('ul[aria-label]') : null;
    const li = list ? [...list.children].find(x => x.textContent.includes(date)) : null;
    if (!li) throw new Error('기록 행 없음: ' + date);
    const target = li.querySelector('button') ?? li;
    target.click();
    return !!li.querySelector('button');
};
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(2400);
    await evaluate(helpers);
};

const seed = async (items) => {
    await evaluate(
        `localStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(
            JSON.stringify({ version: 1, items }),
        )})`,
    );
};

const clearStorage = () => evaluate(`localStorage.removeItem('${STORAGE_KEY}')`);

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * 실제 API 응답 시간은 매번 다릅니다. 고정된 sleep 하나로는 가끔 응답이 늦게 와서
 * 기록이 아직 안 채워진 채로 다음 단계를 읽어버리는 결함이 생깁니다 (검사 자체의 결함,
 * 화면 결함이 아닙니다). 조회가 끝났다는 신호(로딩 문구가 사라짐)가 보일 때까지
 * 최대 timeoutMs만큼 짧은 간격으로 다시 확인합니다.
 */
const waitForRecords = async (min, timeoutMs = 8000) => {
    const start = Date.now();
    let records = await evaluate(`window.__records()`);
    while (records.length < min && Date.now() - start < timeoutMs) {
        await sleep(300);
        records = await evaluate(`window.__records()`);
    }
    return records;
};

// ───────────────────────────────────────── 검사 정의
const CHECKS = [
    { n: 1, kind: "정상", title: "선택 없이 열면 최신 2건이 비교되고 계산식이 보인다" },
    { n: 2, kind: "정상", title: "지난 날짜 기록을 누르면 비교 기준이 그 날짜로 바뀐다" },
    { n: 3, kind: "정상", title: "다른 기록을 누르면 선택 표시가 옮겨간다" },
    { n: 4, kind: "정상", title: "선택 해제를 누르면 기본 비교로 돌아온다" },
    { n: 5, kind: "오류", title: "최신 기록 자신을 누르면 사유 문구가 보이고 차이 숫자가 없다" },
    { n: 6, kind: "오류", title: "기록이 1건이면 행을 누를 수 없고 부족 문구가 보인다" },
    { n: 7, kind: "오류", title: "선택한 날짜가 사라지면 선택이 자동 해제된다" },
    { n: 8, kind: "회귀", title: "장애 5종을 재현해도 선택 상태와 기록 목록이 유지된다" },
    { n: 9, kind: "회귀", title: "다시 확인을 두 번 눌러도 날짜별 기록에 중복이 없다" },
    { n: 10, kind: "회귀", title: "09시 기준·origin 배지·출처 링크가 그대로 보인다" },
];

const results = new Map();
const pass = (n, detail) => results.set(n, { pass: true, detail });
const fail = (n, detail) => results.set(n, { pass: false, detail });

/** 검사 하나가 예외로 죽어도 나머지 9개는 계속 돌립니다. */
const guard = async (n, body) => {
    try {
        await body();
    } catch (error) {
        if (!results.has(n)) {
            fail(n, `검사 중 오류 — ${error.message.split("\n")[0]}`);
        }
    }
};

await connect();
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
    width: 1180,
    height: 1400,
    deviceScaleFactor: 1,
    mobile: false,
});

// 저장소를 비우고 처음부터 시작합니다. 첫 조회에서 오늘 1건 + 지난 날짜가 채워집니다.
await goto();
await clearStorage();
await goto("/?debug=1");

let records = await waitForRecords(3);

if (records.length < 3) {
    await evaluate(`window.__click('지난 날짜 다시 불러오기')`);
    records = await waitForRecords(3);
}

const enough = records.length >= 3;

// ── 검사 1 · 기본 비교 = 최신 2건
await guard(1, async () => {
    const diff = await evaluate(`window.__diff()`);
    const okDates = diff.target === records[0].dateKey && diff.base === records[1].dateKey;
    const okEquation =
        diff.equation !== null &&
        diff.equation.delta === round1(records[0].value - records[1].value);

    if (okDates && okEquation) {
        pass(
            1,
            `${diff.base} → ${diff.target}, 계산식 ${diff.equation.target} − ${diff.equation.base} = ${diff.equation.delta}`,
        );
    } else {
        fail(
            1,
            `기대 ${records[1].dateKey} → ${records[0].dateKey} · 실제 ${diff.base} → ${diff.target} · 계산식 ${JSON.stringify(diff.equation)}`,
        );
    }
});

// ── 검사 2 · 지난 날짜 선택
await guard(2, async () => {
    if (!enough) {
        fail(2, `기록이 ${records.length}건 — 기본 비교와 구분되는 세 번째 날짜가 필요합니다`);
        return;
    }
    const picked = records[2].dateKey;
    const clickable = await evaluate(`window.__clickRow(${JSON.stringify(picked)})`);
    if (!clickable) {
        fail(2, `기록 행 ${picked}이(가) 누를 수 있는 요소가 아닙니다`);
        return;
    }
    await sleep(350);
    const diff = await evaluate(`window.__diff()`);
    const expected = round1(records[0].value - records[2].value);

    if (diff.base === picked && diff.equation && diff.equation.delta === expected) {
        pass(2, `${picked} 선택 → ${diff.equation.target} − ${diff.equation.base} = ${diff.equation.delta} (손계산 ${expected})`);
    } else {
        fail(2, `${picked} 선택 후 비교 기준 ${diff.base} · 계산식 ${JSON.stringify(diff.equation)} · 기대 차이 ${expected}`);
    }
});

// ── 검사 3 · 선택 표시 이동
await guard(3, async () => {
    if (!enough) {
        fail(3, `기록이 ${records.length}건 — 옮길 대상이 없습니다`);
        return;
    }
    const moved = records[1].dateKey;
    await evaluate(`window.__clickRow(${JSON.stringify(moved)})`);
    await sleep(350);
    const rows = await evaluate(`window.__rows()`);
    const selected = rows.filter((row) => row.selected).map((row) => row.date);

    if (selected.length === 1 && selected[0] === moved) {
        pass(3, `선택 표시 1개 · ${moved}`);
    } else {
        fail(3, `선택 표시 ${selected.length}개 (${selected.join(", ") || "없음"}) · 기대 ${moved} 1개`);
    }
});

// ── 검사 4 · 선택 해제
await guard(4, async () => {
    const has = await evaluate(`!!window.__btn('선택 해제')`);
    if (!has) {
        fail(4, "선택 해제 버튼이 화면에 없습니다");
        return;
    }
    await evaluate(`window.__click('선택 해제')`);
    await sleep(350);
    const diff = await evaluate(`window.__diff()`);
    const rows = await evaluate(`window.__rows()`);
    const anySelected = rows.some((row) => row.selected);

    if (diff.base === records[1].dateKey && diff.target === records[0].dateKey && !anySelected) {
        pass(4, `기본 비교 복귀 ${diff.base} → ${diff.target} · 선택 표시 없음`);
    } else {
        fail(4, `복귀 후 ${diff.base} → ${diff.target} · 선택 표시 ${anySelected ? "남음" : "없음"}`);
    }
});

// ── 검사 5 · 최신 기록 자신을 선택
await guard(5, async () => {
    const latest = records[0].dateKey;
    await evaluate(`window.__clickRow(${JSON.stringify(latest)})`);
    await sleep(350);
    const diff = await evaluate(`window.__diff()`);
    const hasReason = diff.text.includes("같은 날짜");

    if (hasReason && diff.equation === null) {
        pass(5, `사유 문구 표시 · 차이 숫자 없음 — "${diff.text.slice(0, 60)}"`);
    } else {
        fail(
            5,
            `사유 문구 ${hasReason ? "있음" : "없음"} · 계산식 ${diff.equation ? "표시됨(0으로 꾸밈)" : "없음"}`,
        );
    }
});

// ── 검사 6 · 기록 1건
await guard(6, async () => {
    // 처음부터 실패 모드로 엽니다 — 실제 API가 성공해 저장소를 먼저 채워버리는
    // 경쟁 상태를 피하기 위해, 성공할 수도 있는 조회를 아예 거치지 않습니다.
    await goto("/?fail=auth");
    await seed([records[0]]);
    // 조회가 실패하면 지난 날짜를 채우지 않으므로 1건 상태가 그대로 유지됩니다.
    await goto("/?fail=auth");

    const rows = await evaluate(`window.__rows()`);
    const diff = await evaluate(`window.__diff()`);
    const beforeText = diff.text;

    if (rows.length !== 1) {
        fail(6, `기록을 1건으로 만들지 못했습니다 (${rows.length}건)`);
        return;
    }

    let changed = false;
    if (rows[0].clickable) {
        await evaluate(`window.__clickRow(${JSON.stringify(rows[0].date)})`);
        await sleep(300);
        const after = await evaluate(`window.__diff()`);
        changed = after.text !== beforeText;
    }

    const hasShortage = diff.text.includes("2건 이상");

    if (!rows[0].clickable && hasShortage) {
        pass(6, `행 비활성 · 부족 문구 표시 — "${diff.text.slice(0, 40)}"`);
    } else {
        fail(
            6,
            `행 ${rows[0].clickable ? "누를 수 있음" : "비활성"} · 부족 문구 ${hasShortage ? "있음" : "없음"} · 클릭 후 화면 ${changed ? "바뀜" : "그대로"}`,
        );
    }
});

// ── 검사 7 · 선택한 날짜가 사라지면 자동 해제
await guard(7, async () => {
    await goto();
    await clearStorage();
    await goto("/?debug=1");

    const before = await waitForRecords(3);
    if (before.length < 3) {
        fail(7, `기록이 ${before.length}건 — 선택할 지난 날짜가 없습니다`);
        return;
    }

    await evaluate(`window.__clickRow(${JSON.stringify(before[2].dateKey)})`);
    await sleep(350);
    await evaluate(`window.__click('기록 비우기')`);
    await sleep(500);

    const emptyText = await evaluate(`window.__main()`);
    const badNumber = /NaN|undefined/.test(emptyText);

    // 기록이 돌아왔을 때 사라졌던 선택이 되살아나면 안 됩니다.
    await evaluate(`window.__click('다시 확인')`);
    await sleep(2600);
    const rows = await evaluate(`window.__rows()`);
    const revived = rows.filter((row) => row.selected).map((row) => row.date);

    if (!badNumber && revived.length === 0) {
        pass(7, "기록을 비운 뒤 NaN 없음 · 다시 확인 후에도 선택이 되살아나지 않음");
    } else {
        fail(
            7,
            `${badNumber ? "빈 상태에 NaN/undefined 표시 · " : ""}다시 확인 후 선택 ${revived.join(", ") || "없음"}`,
        );
    }
});

// ── 검사 8 · 장애 5종 후 선택 상태 유지 (회귀)
await guard(8, async () => {
    await goto();
    await clearStorage();
    await goto("/?debug=1");

    const before = await waitForRecords(3);
    if (before.length < 3) {
        fail(8, `기록이 ${before.length}건 — 선택할 지난 날짜가 없습니다`);
        return;
    }

    const picked = before[2].dateKey;
    await evaluate(`window.__clickRow(${JSON.stringify(picked)})`);
    await sleep(350);

    const broken = [];
    for (const mode of ["제한시간 초과", "인증 실패", "호출 제한", "오프라인", "응답 형식 변경"]) {
        await evaluate(`window.__click(${JSON.stringify(mode)})`);
        await sleep(mode === "제한시간 초과" ? 6400 : 1400);

        const status = await evaluate(`window.__status()`);
        const rows = await evaluate(`window.__rows()`);
        const stillSelected = rows.some((row) => row.date === picked && row.selected);

        if (!stillSelected || rows.length !== before.length || !status.includes("오래된 데이터")) {
            broken.push(
                `${mode}(선택 ${stillSelected ? "유지" : "사라짐"}/기록 ${rows.length}건/상태 "${status}")`,
            );
        }
    }

    if (broken.length === 0) {
        pass(8, `장애 5종 모두 선택 ${picked} 유지 · 기록 ${before.length}건 유지 · 오래된 데이터 표시`);
    } else {
        fail(8, broken.join(" · "));
    }
});

// ── 검사 9 · 다시 확인 두 번 → 중복 없음 (회귀)
await guard(9, async () => {
    await goto();
    await clearStorage();
    await goto();
    await sleep(600);

    const before = await evaluate(`window.__records()`);
    for (let i = 0; i < 2; i += 1) {
        await evaluate(`window.__click('다시 확인')`);
        await sleep(2600);
    }
    const after = await evaluate(`window.__records()`);
    const keys = after.map((r) => r.dateKey);
    const duplicates = keys.length - new Set(keys).size;

    if (duplicates === 0 && after.length === before.length) {
        pass(9, `${before.length}건 → ${after.length}건, 중복 0건`);
    } else {
        fail(9, `${before.length}건 → ${after.length}건, 중복 ${duplicates}건`);
    }
});

// ── 검사 10 · 09시 기준 · origin 배지 · 출처 링크 (회귀)
await guard(10, async () => {
    const view = await evaluate(`(() => {
        const main = document.querySelector('main').textContent;
        const link = document.querySelector('a[href^="https://api.open-meteo.com"]');
        return {
            hour: /9시 값/.test(main),
            live: main.includes('직접 조회'),
            backfill: main.includes('출처의 지난 기록'),
            href: link ? link.href : null,
        };
    })()`);

    const called = networkLog.includes(view.href);
    const problems = [];
    if (!view.hour) problems.push("09시 기준 문구 없음");
    if (!view.live) problems.push("직접 조회 배지 없음");
    if (!view.backfill) problems.push("출처의 지난 기록 배지 없음");
    if (!view.href) problems.push("출처 링크 없음");
    else if (!called) problems.push("출처 링크가 실제 호출 주소와 다름");

    if (problems.length === 0) {
        pass(10, `09시 기준·배지 2종 표시 · 출처 링크 = 실제 호출 주소`);
    } else {
        fail(10, problems.join(" · "));
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
    const mark = result.pass ? "PASS" : "FAIL";
    console.log(`${String(check.n).padStart(2)}  ${mark}  [${check.kind}] ${check.title}`);
    console.log(`             ${result.detail}`);
    return { ...check, ...result };
});

const passed = rows.filter((r) => r.pass);
const failed = rows.filter((r) => !r.pass);

console.log("\n─────────────────────────────");
console.log(`PASS ${passed.length} / FAIL ${failed.length}   (${stamp} KST)`);
if (failed.length > 0) {
    console.log(`남은 검사: ${failed.map((r) => r.n).join(", ")}`);
}

if (WRITE_JSON) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, `${stamp.replace(/[: ]/g, "-")}.json`);
    fs.writeFileSync(
        file,
        JSON.stringify(
            {
                checkedAt: new Date().toISOString(),
                url: URL_APP,
                passed: passed.map((r) => r.n),
                failed: failed.map((r) => r.n),
                results: rows,
            },
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
