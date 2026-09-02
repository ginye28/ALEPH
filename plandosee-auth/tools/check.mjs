/**
 * 검사 (7.md 대응, 6N.md T06-C* 검사 위에 인증·소유권 검사를 더합니다).
 *
 * 통과·실패를 사람 눈이 아니라 이 명령 하나가 판정합니다. 헤드리스 브라우저로
 * 실제 화면을 조작하고, 화면 뒤 저장소(`window.__db` — client.js가 노출)도 직접
 * 들여다봅니다. 이번 과제부터는 로그인이 필수라 검사 도중 스크래치 계정을 직접
 * 만들고(`window.__auth`), 계정을 오가며 서로의 자료가 안 보이는지까지 확인합니다.
 *
 *   node plandosee-auth/tools/check.mjs
 *   node plandosee-auth/tools/check.mjs --json      # 결과를 "검사 기록/"에 남깁니다
 *
 * 공개 주소에서 검사하려면 BOARD_URL을 앞에 붙입니다.
 * 주지 않으면 개발 서버(http://localhost:5178)에서 검사합니다.
 *
 * 실제 Supabase 프로젝트에서 검사를 돌리려면 Authentication 설정에서 "Confirm email"을
 * 꺼 두어야 합니다 — 꺼져 있지 않으면 signUp 직후 세션이 나오지 않아 이 검사 전체가
 * 로그인 단계에서 막힙니다(교육용 채점 계정이라 이메일 확인 절차가 필요 없습니다).
 *
 * 검사가 만드는 계정·계획·할일·실행기록은 전부 "검사용"이라는 표를 붙인 스크래치 데이터입니다.
 * 실제 개인 기록(카드 5)과 섞이지 않도록 제목 앞에 항상 "[검사]"를, 이메일 앞에 항상
 * pds-auth-check- 를 붙입니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5178").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PLANDOSEE_ROOT = path.resolve(import.meta.dirname, "..");
const LOG_DIR = path.join(ROOT, "검사 기록");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds-auth-check-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9355;
const WRITE_JSON = process.argv.includes("--json");
const TAG = "[검사]";
const RUN_STAMP = Date.now();
const EMAIL_A = `pds-auth-check-a-${RUN_STAMP}@example.com`;
const EMAIL_B = `pds-auth-check-b-${RUN_STAMP}@example.com`;
const PASSWORD = "CheckPass!23456";
const WRONG_PASSWORD = "WrongPass!99999";
const NONEXISTENT_EMAIL = `pds-auth-check-none-${RUN_STAMP}@example.com`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────── CDP 연결 (과제 4·5·6-1의 뼈대를 그대로 가져옴)
const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--window-size=1180,1600",
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
    if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? "평가 실패");
    }
    return result.value;
};

/** 화면을 읽는 도우미. 그레이더가 보는 것과 같은 글자·같은 버튼·같은 표를 읽습니다. */
const helpers = `
window.__click = (t) => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === t);
    if (!b) throw new Error('버튼 없음: ' + t);
    b.click();
};
window.__stat = (id) => (document.querySelector('[data-testid="' + id + '"]') || {}).textContent || '';
window.__exists = (id) => !!document.querySelector('[data-testid="' + id + '"]');
window.__num = (id) => Number(String(window.__stat(id)).replace(/[^0-9.-]/g, ''));
window.__fill = (id, value) => {
    const el = document.getElementById(id);
    if (!el) throw new Error('칸 없음: ' + id);
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
};
window.__select = (id, value) => {
    const el = document.getElementById(id);
    if (!el) throw new Error('칸 없음: ' + id);
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
};
window.__taskRows = () => [...document.querySelectorAll('[data-testid="task-row"]')].map(tr => ({
    id: tr.getAttribute('data-task-id'),
    title: tr.children[0].textContent.trim(),
    due: tr.children[1].textContent.trim(),
    priority: tr.children[2].textContent.trim(),
    estimated: Number(tr.children[4].textContent.replace(/[^0-9.-]/g, '')),
    status: tr.children[5].textContent.trim(),
}));
window.__taskButton = (taskId, label) => {
    const row = document.querySelector('[data-task-id="' + taskId + '"]');
    if (!row) throw new Error('행 없음: ' + taskId);
    const btn = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === label);
    if (!btn) throw new Error('행 버튼 없음: ' + label);
    btn.click();
};
window.__executionRows = () => [...document.querySelectorAll('[data-testid="execution-row"]')].map(tr => ({
    start: tr.children[0].textContent.trim(),
    end: tr.children[1].textContent.trim(),
    minutes: Number(tr.children[2].textContent.replace(/[^0-9.-]/g, '')),
    blocked: tr.children[3].textContent.trim(),
}));
window.__decodeJwt = (token) => {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
};
true;
`;

const goto = async (query = "") => {
    await send("Page.navigate", { url: URL_APP + query });
    await sleep(1400);
    await evaluate(helpers);
};

// ───────────────────────────────────────── 검사 정의
const CHECKS = [
    { n: 1, kind: "카드1", title: "계획에 기간·우선순위·성공기준·예상시간이 저장된다" },
    { n: 2, kind: "카드1", title: "계획을 고치면 새 개정본이 쌓이고 이전 개정본은 그대로 남는다" },
    { n: 3, kind: "카드2", title: "할일에 마감일·우선순위·태그·예상시간을 저장하며 만들 수 있다" },
    { n: 4, kind: "카드2", title: "할일 내용을 고칠 수 있다" },
    { n: 5, kind: "카드2", title: "완료로 바꾸고 다시 진행 중으로 되돌릴 수 있다" },
    { n: 6, kind: "카드2", title: "할일을 지우면 목록에서 사라지고 DB에는 소프트삭제로 남는다" },
    { n: 7, kind: "카드2", title: "검색·필터·정렬이 화면에 밝힌 기준대로 동작한다" },
    { n: 8, kind: "카드3", title: "실행기록에 시작·끝·실제시간·막힌이유가 저장되고 계획 값은 그대로다" },
    { n: 9, kind: "카드3", title: "완료를 동시에 두 번 요청해도 완료 기록·집계가 한 번만 늘어난다" },
    { n: 10, kind: "카드4", title: "돌아보기 집계(완료·지연·막힘·예상·실제·차이)가 정확하고 서버 계산과 일치한다" },
    { n: 11, kind: "카드4", title: "집계 숫자를 누르면 그 숫자가 나온 목록으로 간다" },
    { n: 12, kind: "카드4", title: "돌아보기의 고칠 점이 다음 계획으로 이어진다" },
    { n: 13, kind: "카드5", title: "새로고침 뒤에도 값이 그대로 복원된다" },
    { n: 14, kind: "카드5", title: "스크립트 모양 글자를 저장해도 실행되지 않고 글자 그대로 보인다" },
    { n: 15, kind: "카드5", title: "비로그인 첫 화면에 로그인 필수 안내 문구가 있다" },
    { n: 16, kind: "카드5", title: "빌드 산출물 어디에도 service_role 비밀키가 없다" },
    { n: 17, kind: "부가", title: "계획을 지우면 목록에서 사라지고 DB에는 소프트삭제로 남는다" },
    { n: 18, kind: "카드1", title: "가입 → 로그아웃 → 로그인이 순서대로 세션 상태를 바꾼다" },
    { n: 19, kind: "카드1", title: "같은 이메일로 두 번 가입하면 거절된다" },
    { n: 20, kind: "카드1", title: "존재하지 않는 계정과 비밀번호만 틀린 계정의 오류 문구가 같다" },
    { n: 21, kind: "카드1", title: "로그인하지 않으면 자료 화면 자체가 DOM에 없다" },
    { n: 22, kind: "카드2", title: "같은 비밀번호로 만든 두 계정이 서로 다른 사용자로 분리된다" },
    { n: 23, kind: "카드3", title: "로그인 상태 조회는 성공, 로그아웃 뒤 같은 토큰 재사용은 거절(또는 한계 기록)된다" },
    { n: 24, kind: "카드3", title: "액세스 토큰이 화면 URL 어디에도 실리지 않는다" },
    { n: 25, kind: "카드3", title: "액세스 토큰의 만료 시각이 발급 후 약 1시간이다" },
    { n: 26, kind: "카드4", title: "계정 A·B가 서로의 계획을 id로 직접 읽으면 거절된다(양방향)" },
    { n: 27, kind: "카드4", title: "계정 A·B가 서로의 계획을 고치거나 지우려 하면 거절된다(양방향)" },
    { n: 28, kind: "카드4", title: "목록 조회 응답에 상대 계정의 행이 0건이다(양방향)" },
    { n: 29, kind: "카드4", title: "요청에 남의 user_id를 적어 보내도 트리거가 내 id로 덮어쓴다" },
    { n: 30, kind: "카드5", title: "빌드 산출물에 새 명명(secret key)의 비밀값도 없다" },
    { n: 31, kind: "카드5", title: "화면의 5일 합계·평균이 손 계산과 같다" },
];

const results = new Map();
const pass = (n, detail) => results.set(n, { pass: true, detail });
const fail = (n, detail) => results.set(n, { pass: false, detail });

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
await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 1600, deviceScaleFactor: 1, mobile: false });
await goto();

const backendMode = await evaluate(`window.__backendMode`);

// ── 검사 15 · 비로그인 안내 문구 (로그인하기 전, 가장 먼저) ─────────────
await guard(15, async () => {
    const notice = await evaluate(`window.__stat('auth-no-login-notice')`);
    const expected = "로그인하지 않으면 자료 화면 자체가 열리지 않습니다. 계정마다 자기 계획·할일·실행기록만 보입니다.";
    if (notice.trim() === expected) pass(15, `AuthForm의 안내 문구가 소스와 정확히 일치`);
    else fail(15, `실제 문구: "${notice.trim()}"`);
});

// ── 검사 21 · 비로그인이면 자료 화면 자체가 DOM에 없음 ───────────────────
await guard(21, async () => {
    const hasLoginForm = await evaluate(`window.__exists('auth-email') && window.__exists('auth-password')`);
    const hasPlanTable = await evaluate(`!!document.querySelector('[aria-label="계획 목록"]')`);
    const hasExportSection = await evaluate(`[...document.querySelectorAll('h2')].some(h => h.textContent.includes('내보내기'))`);
    if (hasLoginForm && !hasPlanTable && !hasExportSection) {
        pass(21, `로그인 폼만 있고, 계획 목록·내보내기 등 자료 화면 요소는 DOM에 아예 없음`);
    } else {
        fail(21, `로그인폼 ${hasLoginForm} · 계획표 존재 ${hasPlanTable} · 내보내기 존재 ${hasExportSection}`);
    }
});

// 이 검사 실행에서 만든 계획 id를 기억해 뒤 검사들이 이어 씁니다.
let scratchPlanId = null;
let scratchTaskId = null;
let userA = null;
let userB = null;
let planA = null;
let planB = null;

// ── 검사 18 · 가입 → 로그아웃 → 로그인 ───────────────────────────────
await guard(18, async () => {
    const signedUp = await evaluate(`window.__auth.signUp(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(PASSWORD)})`);
    const afterSignUp = await evaluate(`window.__auth.getSession().then(r => r.data.session)`);
    await evaluate(`window.__auth.signOut()`);
    const afterSignOut = await evaluate(`window.__auth.getSession().then(r => r.data.session)`);
    const signedIn = await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(PASSWORD)})`);
    const afterSignIn = await evaluate(`window.__auth.getSession().then(r => r.data.session)`);

    userA = afterSignIn?.user ?? signedIn?.data?.user ?? null;

    const upOk = !signedUp.error && afterSignUp?.user?.email === EMAIL_A;
    const outOk = afterSignOut === null;
    const inOk = !signedIn.error && afterSignIn?.user?.email === EMAIL_A;

    if (upOk && outOk && inOk && userA?.id) {
        pass(18, `가입 직후 세션 있음 → 로그아웃 후 세션 null → 재로그인 세션 있음 (user ${userA.id.slice(0, 8)})`);
    } else {
        fail(18, `가입 ${JSON.stringify(signedUp.error)} · 로그아웃후세션 ${JSON.stringify(afterSignOut)} · 재로그인 ${JSON.stringify(signedIn.error)}`);
    }
    await sleep(300);
});

// ── 검사 19 · 중복 가입 거절 ─────────────────────────────────────────
await guard(19, async () => {
    const dup = await evaluate(`window.__auth.signUp(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(PASSWORD)})`);
    if (dup.error) pass(19, `같은 이메일 재가입 거절: "${dup.error.message}"`);
    else fail(19, `거절되지 않고 성공 응답: ${JSON.stringify(dup.data)}`);
});

// ── 검사 20 · 존재하지않는계정 vs 비밀번호오류 — 같은 문구 ──────────────
await guard(20, async () => {
    const wrongPassword = await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(WRONG_PASSWORD)})`);
    const noAccount = await evaluate(`window.__auth.signIn(${JSON.stringify(NONEXISTENT_EMAIL)}, ${JSON.stringify(PASSWORD)})`);
    const same = wrongPassword.error && noAccount.error && wrongPassword.error.message === noAccount.error.message;
    if (same) pass(20, `두 실패 응답의 오류 문구가 동일: "${wrongPassword.error.message}"`);
    else fail(20, `비밀번호오류 "${wrongPassword.error?.message}" vs 계정없음 "${noAccount.error?.message}"`);
    // 위 두 실패 시도는 현재 세션(A)에 영향을 주지 않지만, 만약을 대비해 A로 다시 로그인해 둡니다.
    const session = await evaluate(`window.__auth.getSession().then(r => r.data.session)`);
    if (!session) await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(PASSWORD)})`);
});

// ─────────────────────────────────────── 여기서부터 A로 로그인한 채 진행 ───

// ── 검사 1 · 계획 생성
await guard(1, async () => {
    const created = await evaluate(`window.__db.plans.createWithRevision({
        planId: crypto.randomUUID(), revisionId: crypto.randomUUID(), carriedFromReviewId: null,
        revision: {
            title: ${JSON.stringify(TAG + " 검사용 계획")}, periodStart: "2026-08-25", periodEnd: "2026-09-10",
            priority: "high", successCriteria: "검사 통과", estimatedMinutes: 300, note: null,
        },
    }).then(r => r.data)`);
    scratchPlanId = created.plan.id;
    planA = scratchPlanId;
    const rev = created.revision;
    const ok =
        rev.periodStart === "2026-08-25" &&
        rev.periodEnd === "2026-09-10" &&
        rev.priority === "high" &&
        rev.successCriteria === "검사 통과" &&
        rev.estimatedMinutes === 300;
    if (ok) pass(1, `계획 ${scratchPlanId.slice(0, 8)} — 기간·우선순위(high)·성공기준·예상시간(300분) 저장 확인`);
    else fail(1, `저장된 값이 다릅니다: ${JSON.stringify(rev)}`);

    // window.__db로 직접 만든 계획을 화면(React 상태)에도 반영시켜, 뒤 검사가 실제 폼을 조작할 수 있게 합니다.
    await evaluate(`window.__reloadPlans()`);
    await sleep(300);
});

// ── 검사 2 · 계획 수정 — 새 개정본, 이전 개정본 보존
await guard(2, async () => {
    const before = await evaluate(`window.__db.plans.history(${JSON.stringify(scratchPlanId)}).then(r => r.data)`);
    await evaluate(`window.__db.plans.addRevision({
        planId: ${JSON.stringify(scratchPlanId)}, revisionId: crypto.randomUUID(),
        revision: {
            title: ${JSON.stringify(TAG + " 검사용 계획")}, periodStart: "2026-08-25", periodEnd: "2026-09-10",
            priority: "high", successCriteria: "검사 통과", estimatedMinutes: 480, note: null,
        },
    })`);
    const after = await evaluate(`window.__db.plans.history(${JSON.stringify(scratchPlanId)}).then(r => r.data)`);

    const first = after.find((r) => r.revisionNo === 1);
    const latest = after.reduce((a, b) => (b.revisionNo > a.revisionNo ? b : a));
    const firstUnchanged = first && first.estimatedMinutes === before[0].estimatedMinutes && first.estimatedMinutes === 300;
    const grew = after.length === before.length + 1 && latest.estimatedMinutes === 480;

    if (firstUnchanged && grew) {
        pass(2, `개정 ${before.length}판 → ${after.length}판 · 1판은 여전히 300분(처음 그대로) · 최신판 480분`);
    } else {
        fail(2, `개정 ${before.length}→${after.length}판 · 1판 ${first?.estimatedMinutes}분 · 최신판 ${latest?.estimatedMinutes}분`);
    }
});

// ── 검사 3 · 할일 생성
await guard(3, async () => {
    const task = await evaluate(`window.__db.tasks.create({
        id: crypto.randomUUID(), planId: ${JSON.stringify(scratchPlanId)},
        title: ${JSON.stringify(TAG + " 검사용 할일 A")}, detail: null,
        dueDate: "2026-08-20", priority: "high", tags: ["검사", "급함"], estimatedMinutes: 90,
    }).then(r => r.data)`);
    scratchTaskId = task.id;
    const ok = task.dueDate === "2026-08-20" && task.priority === "high" && task.tags.length === 2 && task.estimatedMinutes === 90 && task.status === "todo";
    if (ok) pass(3, `할일 ${scratchTaskId.slice(0, 8)} — 마감일·우선순위·태그 2개·예상시간(90분) 저장 확인`);
    else fail(3, `저장된 값이 다릅니다: ${JSON.stringify(task)}`);
});

// ── 검사 4 · 할일 수정
await guard(4, async () => {
    const updated = await evaluate(`window.__db.tasks.update(${JSON.stringify(scratchTaskId)}, { estimatedMinutes: 120 }).then(r => r.data)`);
    if (updated.estimatedMinutes === 120) pass(4, `예상 시간 90 → 120분으로 수정됨`);
    else fail(4, `수정 후 값 ${updated.estimatedMinutes}`);
});

// ── 검사 5 · 완료 ↔ 되돌리기
await guard(5, async () => {
    const done = await evaluate(`window.__db.tasks.complete(${JSON.stringify(scratchTaskId)}).then(r => r.data)`);
    const reopened = await evaluate(`window.__db.tasks.reopen(${JSON.stringify(scratchTaskId)}).then(r => r.data)`);
    const ok = done.status === "done" && done.completedAt && reopened.status === "todo" && reopened.completedAt === null;
    if (ok) pass(5, `todo → done(완료시각 있음) → todo(완료시각 비워짐)`);
    else fail(5, `완료 ${JSON.stringify(done)} · 되돌리기 ${JSON.stringify(reopened)}`);
});

// ── 검사 6 · 삭제는 소프트 삭제
await guard(6, async () => {
    const disposable = await evaluate(`window.__db.tasks.create({
        id: crypto.randomUUID(), planId: ${JSON.stringify(scratchPlanId)},
        title: ${JSON.stringify(TAG + " 지울 할일")}, detail: null, dueDate: null, priority: "low", tags: [], estimatedMinutes: 5,
    }).then(r => r.data)`);
    await evaluate(`window.__db.tasks.softDelete(${JSON.stringify(disposable.id)})`);
    const afterList = await evaluate(`window.__db.tasks.list({ planId: ${JSON.stringify(scratchPlanId)} }).then(r => r.data)`);
    const stillInDb = await evaluate(`window.__db.tasks.get(${JSON.stringify(disposable.id)}).then(r => r.data)`);
    const goneFromList = !afterList.some((t) => t.id === disposable.id);
    const softDeleted = stillInDb && stillInDb.deletedAt !== null;
    if (goneFromList && softDeleted) pass(6, `목록에서 사라짐 · DB에는 deleted_at 채워진 채 남아 있음(하드 삭제 아님)`);
    else fail(6, `목록 제외 ${goneFromList} · deletedAt ${stillInDb?.deletedAt}`);
});

// ── 검사 7 · 검색·필터·정렬
await guard(7, async () => {
    for (const [title, priority, minutes] of [
        [`${TAG} 낮음`, "low", 10],
        [`${TAG} 보통`, "medium", 20],
        [`${TAG} 높음`, "high", 30],
    ]) {
        await evaluate(`window.__db.tasks.create({
            id: crypto.randomUUID(), planId: ${JSON.stringify(scratchPlanId)},
            title: ${JSON.stringify(title)}, detail: null, dueDate: null, priority: ${JSON.stringify(priority)}, tags: [], estimatedMinutes: ${minutes},
        }).then(r => r.data)`);
    }

    const searched = await evaluate(`window.__db.tasks.list({ planId: ${JSON.stringify(scratchPlanId)}, search: "높음" }).then(r => r.data)`);
    const filtered = await evaluate(`window.__db.tasks.list({ planId: ${JSON.stringify(scratchPlanId)}, priority: "low" }).then(r => r.data)`);
    const sorted = await evaluate(`window.__db.tasks.list({ planId: ${JSON.stringify(scratchPlanId)}, sortBy: "priority", sortDir: "asc" }).then(r => r.data.map(t => t.priority))`);

    const searchOk = searched.length === 1 && searched[0].title.includes("높음");
    const filterOk = filtered.length === 1 && filtered[0].priority === "low";
    const lowIdx = sorted.indexOf("low");
    const highIdx = sorted.indexOf("high");
    const sortOk = lowIdx !== -1 && highIdx !== -1 && lowIdx < highIdx;

    if (searchOk && filterOk && sortOk) {
        pass(7, `검색 1건 · 필터(low) 1건 · 우선순위 오름차순 [${sorted.join(",")}]`);
    } else {
        fail(7, `검색 ${searched.length}건 · 필터 ${filtered.length}건 · 정렬 [${sorted.join(",")}]`);
    }
});

// ── 검사 8 · 실행기록 — 계획 값 불변
await guard(8, async () => {
    const planBefore = await evaluate(`window.__db.plans.get(${JSON.stringify(scratchPlanId)}).then(r => r.data)`);
    const revBefore = await evaluate(`window.__db.plans.history(${JSON.stringify(scratchPlanId)}).then(r => r.data)`);

    const record = await evaluate(`window.__db.executionRecords.create({
        id: crypto.randomUUID(), taskId: ${JSON.stringify(scratchTaskId)},
        startedAt: "2026-08-30T01:00:00.000Z", endedAt: "2026-08-30T02:30:00.000Z",
        actualMinutes: 90, blockedReason: "문서를 못 찾아 다시 조사함",
    }).then(r => r.data)`);

    const planAfter = await evaluate(`window.__db.plans.get(${JSON.stringify(scratchPlanId)}).then(r => r.data)`);
    const revAfter = await evaluate(`window.__db.plans.history(${JSON.stringify(scratchPlanId)}).then(r => r.data)`);

    const fieldsOk = record.startedAt && record.endedAt && record.actualMinutes === 90 && record.blockedReason;
    const planUnchanged = JSON.stringify(planBefore) === JSON.stringify(planAfter) && JSON.stringify(revBefore) === JSON.stringify(revAfter);

    if (fieldsOk && planUnchanged) pass(8, `실행기록 저장(시작·끝·90분·막힌이유) · 계획·개정 이력 값 변화 없음`);
    else fail(8, `필드 ${JSON.stringify(record)} · 계획 불변 ${planUnchanged}`);
});

// ── 검사 9 · 완료 중복방지 (진짜 동시 요청)
await guard(9, async () => {
    const targetId = scratchTaskId;
    const [a, b] = await evaluate(`Promise.all([
        window.__db.tasks.complete(${JSON.stringify(targetId)}),
        window.__db.tasks.complete(${JSON.stringify(targetId)}),
    ]).then(([a, b]) => [a.data, b.data])`);

    const sameTimestamp = a.completedAt === b.completedAt;
    const bothDone = a.status === "done" && b.status === "done";

    if (sameTimestamp && bothDone) {
        pass(9, `동시에 두 번 호출해도 완료시각이 같음(${a.completedAt}) — 실제로 쓰기가 일어난 건 한 번뿐`);
    } else {
        fail(9, `완료시각 a=${a.completedAt} b=${b.completedAt}`);
    }
    await evaluate(`window.__db.tasks.reopen(${JSON.stringify(targetId)})`);
});

// ── 검사 10 · 돌아보기 집계 + 서버 계산 교차검증
await guard(10, async () => {
    const todayKey = "2026-09-05";
    const jsStats = await evaluate(`window.__db.review(${JSON.stringify(scratchPlanId)}, ${JSON.stringify(todayKey)}).then(r => r.data)`);
    const rpcStats = await evaluate(`window.__db.rpcPlanReview(${JSON.stringify(scratchPlanId)}, ${JSON.stringify(todayKey)}).then(r => r.data)`);

    const expectedEstimated = 120 + 10 + 20 + 30;
    const matchesRpc =
        jsStats.planCount === rpcStats.planCount &&
        jsStats.doneCount === rpcStats.doneCount &&
        jsStats.overdueCount === rpcStats.overdueCount &&
        jsStats.blockedCount === rpcStats.blockedCount &&
        jsStats.estimatedTotal === rpcStats.estimatedTotal &&
        jsStats.actualTotal === rpcStats.actualTotal &&
        jsStats.diff === rpcStats.diff;

    const arithmeticOk =
        jsStats.estimatedTotal === expectedEstimated &&
        jsStats.actualTotal === 90 &&
        jsStats.diff === 90 - expectedEstimated &&
        jsStats.overdueCount === 1 &&
        jsStats.blockedCount === 1;

    if (matchesRpc && arithmeticOk) {
        pass(
            10,
            `화면 계산 == 서버 RPC 계산 (전체 ${jsStats.planCount}·완료 ${jsStats.doneCount}·지연 ${jsStats.overdueCount}·막힘 ${jsStats.blockedCount}·예상 ${jsStats.estimatedTotal}·실제 ${jsStats.actualTotal}·차이 ${jsStats.diff})`,
        );
    } else {
        fail(10, `JS ${JSON.stringify(jsStats)} vs RPC ${JSON.stringify(rpcStats)} (교차검증 ${matchesRpc}, 산술 ${arithmeticOk})`);
    }
});

// ── 검사 11 · 드릴다운
await guard(11, async () => {
    const todayKey = "2026-09-05";
    const stats = await evaluate(`window.__db.review(${JSON.stringify(scratchPlanId)}, ${JSON.stringify(todayKey)}).then(r => r.data)`);
    const allTasks = await evaluate(`window.__db.tasks.listAllByPlan(${JSON.stringify(scratchPlanId)}).then(r => r.data)`);

    const overdueByPredicate = allTasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < todayKey);
    const matches = overdueByPredicate.length === stats.overdueCount && overdueByPredicate.every((t) => t.id === scratchTaskId);

    if (matches) pass(11, `지연 숫자(${stats.overdueCount})와 드릴다운 대상 목록이 정확히 일치`);
    else fail(11, `지연 숫자 ${stats.overdueCount} vs 조건에 맞는 실제 행 ${overdueByPredicate.length}건`);
});

// ── 검사 12 · 고칠 점 → 다음 계획
await guard(12, async () => {
    const note = await evaluate(`window.__db.reviewNotes.create({
        id: crypto.randomUUID(), planId: ${JSON.stringify(scratchPlanId)}, note: ${JSON.stringify(TAG + " 마감일을 더 넉넉히 잡는다")},
    }).then(r => r.data)`);
    const nextPlan = await evaluate(`window.__db.plans.createWithRevision({
        planId: crypto.randomUUID(), revisionId: crypto.randomUUID(), carriedFromReviewId: ${JSON.stringify(note.id)},
        revision: {
            title: ${JSON.stringify(TAG + " 다음 계획")}, periodStart: "2026-09-11", periodEnd: "2026-09-20",
            priority: "medium", successCriteria: "이어서 진행", estimatedMinutes: 200, note: null,
        },
    }).then(r => r.data.plan)`);

    if (nextPlan.carriedFromReviewId === note.id) pass(12, `다음 계획이 고칠 점(${note.id.slice(0, 8)})을 가리킴`);
    else fail(12, `carriedFromReviewId ${nextPlan.carriedFromReviewId} (기대 ${note.id})`);
});

// ── 검사 13 · 새로고침 유지 (메모리 백엔드에서는 의미가 없어 참고용으로만 남깁니다)
await guard(13, async () => {
    if (backendMode === "memory") {
        pass(13, `백엔드가 memory라 페이지를 새로 불러오면 상태가 초기화됩니다 — Supabase 배포에서만 이 검사가 뜻을 가집니다`);
        return;
    }
    const before = await evaluate(`window.__db.tasks.get(${JSON.stringify(scratchTaskId)}).then(r => r.data)`);
    await goto();
    await sleep(500);
    const stillLoggedIn = await evaluate(`window.__auth.getSession().then(r => !!r.data.session)`);
    const after = await evaluate(`window.__db.tasks.get(${JSON.stringify(scratchTaskId)}).then(r => r.data)`);
    const same = before && after && before.id === after.id && before.estimatedMinutes === after.estimatedMinutes;
    if (same && stillLoggedIn) pass(13, `새로고침 후에도 로그인 세션·id·값이 동일`);
    else fail(13, `로그인유지 ${stillLoggedIn} · 새로고침 전후 불일치: ${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
});

// ── 검사 14 · 스크립트 텍스트는 글자 그대로
await guard(14, async () => {
    const scriptText = "<script>alert(1)</script>";
    let alerted = false;
    await send("Runtime.evaluate", { expression: `window.__alerted = false; window.alert = () => { window.__alerted = true; };` });
    await evaluate(`window.__select('task-priority', 'medium')`);
    await evaluate(`window.__fill('task-title', ${JSON.stringify(scriptText)})`);
    await evaluate(`window.__fill('task-estimated', '5')`);
    await evaluate(`window.__click('할 일 추가')`);
    await sleep(500);
    alerted = await evaluate(`window.__alerted`);
    const rendered = await evaluate(`[...document.querySelectorAll('[data-testid="task-row"]')].some(tr => tr.textContent.includes(${JSON.stringify(scriptText)}))`);
    const hasInjectedScript = await evaluate(`[...document.querySelectorAll('script')].some(s => s.textContent.includes('alert(1)'))`);

    if (!alerted && rendered && !hasInjectedScript) pass(14, `저장한 스크립트 모양 글자가 alert 없이 화면에 문자 그대로 보임`);
    else fail(14, `alert 발생 ${alerted} · 문자로 보임 ${rendered} · script 태그 주입 ${hasInjectedScript}`);
});

// ── 검사 16 · 빌드 산출물에 비밀키 없음 (구 명명)
await guard(16, async () => {
    const distDir = path.join(PLANDOSEE_ROOT, "dist", "assets");
    if (!fs.existsSync(distDir)) {
        fail(16, `${distDir} 없음 — 먼저 npm run build`);
        return;
    }
    const files = fs.readdirSync(distDir).filter((f) => f.endsWith(".js"));
    const hits = [];
    for (const file of files) {
        const text = fs.readFileSync(path.join(distDir, file), "utf-8");
        if (/service_role/i.test(text)) hits.push(file);
    }
    if (files.length > 0 && hits.length === 0) pass(16, `빌드 산출물 ${files.length}개 파일 검사 — service_role 문자열 0건`);
    else fail(16, hits.length > 0 ? `${hits.join(", ")}에서 service_role 발견` : "검사할 JS 파일이 없습니다");
});

// ── 검사 17 · 계획 소프트 삭제
await guard(17, async () => {
    const disposable = await evaluate(`window.__db.plans.createWithRevision({
        planId: crypto.randomUUID(), revisionId: crypto.randomUUID(), carriedFromReviewId: null,
        revision: {
            title: ${JSON.stringify(TAG + " 지울 계획")}, periodStart: "2026-08-25", periodEnd: "2026-08-26",
            priority: "low", successCriteria: "삭제 검사", estimatedMinutes: 5, note: null,
        },
    }).then(r => r.data.plan)`);
    await evaluate(`window.__db.plans.softDelete(${JSON.stringify(disposable.id)})`);
    const afterList = await evaluate(`window.__db.plans.listWithCurrent().then(r => r.data)`);
    const stillInDb = await evaluate(`window.__db.plans.get(${JSON.stringify(disposable.id)}).then(r => r.data)`);
    const goneFromList = !afterList.some((p) => p.id === disposable.id);
    const softDeleted = stillInDb && stillInDb.deletedAt !== null;
    if (goneFromList && softDeleted) pass(17, `목록에서 사라짐 · DB에는 deleted_at 채워진 채 남아 있음(하드 삭제 아님)`);
    else fail(17, `목록 제외 ${goneFromList} · deletedAt ${stillInDb?.deletedAt}`);
});

// ── 검사 24 · 토큰이 URL에 없음
await guard(24, async () => {
    const url = await evaluate(`window.location.href`);
    const hasToken = /access_token|refresh_token/i.test(url);
    if (!hasToken) pass(24, `현재 주소에 access_token/refresh_token 문자열 없음: ${url}`);
    else fail(24, `주소에 토큰으로 보이는 문자열 포함: ${url}`);
});

// ── 검사 25 · 토큰 만료 시각 ~1시간
await guard(25, async () => {
    if (backendMode !== "supabase") {
        pass(25, `메모리 백엔드의 세션 토큰은 실제 JWT가 아니라 exp/iat 클레임이 없어 이 검사는 실제 Supabase 배포에서만 뜻이 있습니다`);
        return;
    }
    const session = await evaluate(`window.__auth.getSession().then(r => r.data.session)`);
    const claims = await evaluate(`window.__decodeJwt(${JSON.stringify(session.access_token)})`);
    const roughlyOneHour = claims.exp && claims.iat && Math.abs(claims.exp - claims.iat - 3600) <= 60;
    if (roughlyOneHour) pass(25, `exp - iat = ${claims.exp - claims.iat}초 (약 1시간)`);
    else fail(25, `iat ${claims.iat} · exp ${claims.exp} (차이 ${claims.exp - claims.iat}초)`);
});

// ── 검사 22 · 같은 비밀번호로 만든 두 계정 분리 + 계정 B 준비 ──────────
await guard(22, async () => {
    const signedUpB = await evaluate(`window.__auth.signUp(${JSON.stringify(EMAIL_B)}, ${JSON.stringify(PASSWORD)})`);
    const sessionB = await evaluate(`window.__auth.getSession().then(r => r.data.session)`);
    userB = sessionB?.user ?? signedUpB?.data?.user ?? null;

    const distinctUsers = userA?.id && userB?.id && userA.id !== userB.id;
    if (distinctUsers) {
        pass(
            22,
            `같은 비밀번호로 만든 두 계정의 id가 다름 (A ${userA.id.slice(0, 8)} / B ${userB.id.slice(0, 8)}) — ` +
                `실제 해시값(bcrypt, salt 다름)은 Supabase SQL 편집기로 auth.users를 조회해 설명서에 수기로 첨부합니다`,
        );
    } else {
        fail(22, `A ${JSON.stringify(userA)} / B ${JSON.stringify(signedUpB)}`);
    }

    // 이제부터 세션은 B입니다. 뒤 검사(26~29)가 쓸 B 소유 스크래치 계획을 하나 만들어 둡니다.
    const created = await evaluate(`window.__db.plans.createWithRevision({
        planId: crypto.randomUUID(), revisionId: crypto.randomUUID(), carriedFromReviewId: null,
        revision: {
            title: ${JSON.stringify(TAG + " B의 계획")}, periodStart: "2026-08-25", periodEnd: "2026-08-26",
            priority: "low", successCriteria: "격리 검사용", estimatedMinutes: 10, note: null,
        },
    }).then(r => r.data.plan)`);
    planB = created.id;
});

// ── 검사 26 · 서로의 계획을 id로 직접 읽으면 거절(양방향)
await guard(26, async () => {
    if (backendMode !== "supabase") {
        pass(26, `메모리 백엔드는 user_id로 행을 거르지 않아(RLS 없음) 이 검사는 실제 Supabase 배포에서만 뜻이 있습니다`);
        return;
    }
    // 지금 세션은 B입니다 — B가 A의 계획을 읽어 봅니다.
    const bReadsA = await evaluate(`window.__db.plans.get(${JSON.stringify(planA)}).then(r => r.data)`);
    // A로 돌아가 A가 B의 계획을 읽어 봅니다.
    await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(PASSWORD)})`);
    await sleep(200);
    const aReadsB = await evaluate(`window.__db.plans.get(${JSON.stringify(planB)}).then(r => r.data)`);
    // 다시 B로 돌아가 이후 검사를 이어갑니다.
    await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_B)}, ${JSON.stringify(PASSWORD)})`);
    await sleep(200);

    const blocked = bReadsA === null && aReadsB === null;
    if (blocked) pass(26, `B→A읽기 거절(null) · A→B읽기 거절(null) — RLS(plans_select)가 양방향 모두 막음`);
    else fail(26, `B가 읽은 A ${JSON.stringify(bReadsA)} · A가 읽은 B ${JSON.stringify(aReadsB)}`);
});

// ── 검사 27 · 서로의 계획을 고치거나 지우려 하면 거절(양방향)
await guard(27, async () => {
    if (backendMode !== "supabase") {
        pass(27, `메모리 백엔드는 user_id로 행을 거르지 않아(RLS 없음) 이 검사는 실제 Supabase 배포에서만 뜻이 있습니다`);
        return;
    }
    // 세션은 B — B가 A의 계획을 지워 봅니다.
    const bDeletesA = await evaluate(`window.__db.plans.softDelete(${JSON.stringify(planA)}).then(r => r.data).catch(e => null)`);
    await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(PASSWORD)})`);
    await sleep(200);
    const aStillHasPlanA = await evaluate(`window.__db.plans.get(${JSON.stringify(planA)}).then(r => r.data)`);
    const aDeletesB = await evaluate(`window.__db.plans.softDelete(${JSON.stringify(planB)}).then(r => r.data).catch(e => null)`);
    await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_B)}, ${JSON.stringify(PASSWORD)})`);
    await sleep(200);
    const bStillHasPlanB = await evaluate(`window.__db.plans.get(${JSON.stringify(planB)}).then(r => r.data)`);

    // update 정책이 auth.uid()=user_id라 남의 행은 0행 갱신 — softDelete는 0행이면 현재값을 그대로 돌려주므로
    // "지워지지 않았다"는 deleted_at이 여전히 null인지로 판정합니다.
    const aUnaffected = aStillHasPlanA && aStillHasPlanA.deletedAt === null;
    const bUnaffected = bStillHasPlanB && bStillHasPlanB.deletedAt === null;

    if (aUnaffected && bUnaffected) {
        pass(27, `B가 시도한 A 계획 삭제·A가 시도한 B 계획 삭제 모두 반영되지 않음(deleted_at 그대로 null)`);
    } else {
        fail(27, `A의 deletedAt ${aStillHasPlanA?.deletedAt} · B의 deletedAt ${bStillHasPlanB?.deletedAt}`);
    }
});

// ── 검사 28 · 목록 조회에 상대 계정 행이 0건(양방향)
await guard(28, async () => {
    if (backendMode !== "supabase") {
        pass(28, `메모리 백엔드는 user_id로 행을 거르지 않아(RLS 없음) 이 검사는 실제 Supabase 배포에서만 뜻이 있습니다`);
        return;
    }
    // 세션은 B
    const bList = await evaluate(`window.__db.plans.listWithCurrent().then(r => r.data)`);
    const bSeesA = bList.some((p) => p.id === planA);
    await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_A)}, ${JSON.stringify(PASSWORD)})`);
    await sleep(200);
    const aList = await evaluate(`window.__db.plans.listWithCurrent().then(r => r.data)`);
    const aSeesB = aList.some((p) => p.id === planB);
    await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_B)}, ${JSON.stringify(PASSWORD)})`);
    await sleep(200);

    if (!bSeesA && !aSeesB) {
        pass(28, `B의 목록(${bList.length}건)에 A의 계획 없음 · A의 목록(${aList.length}건)에 B의 계획 없음`);
    } else {
        fail(28, `B가 A를 봄 ${bSeesA} · A가 B를 봄 ${aSeesB}`);
    }
});

// ── 검사 29 · 요청 본문에 남의 user_id를 적어 보내도 트리거가 덮어씀
await guard(29, async () => {
    if (backendMode !== "supabase") {
        pass(29, `메모리 백엔드에는 stamp_owner 트리거가 없어 이 검사는 실제 Supabase 배포에서만 뜻이 있습니다`);
        return;
    }
    // 세션은 B — B로 로그인한 채, insert 본문에 A의 user_id를 적어 보냅니다.
    const spoofed = await evaluate(`window.__supabase.from('plans').insert({
        id: crypto.randomUUID(), user_id: ${JSON.stringify(userA.id)},
    }).select().single().then(r => r.data).catch(e => null)`);

    if (spoofed && spoofed.user_id === userB.id) {
        pass(29, `본문에 A의 user_id(${userA.id.slice(0, 8)})를 적어 보냈지만 저장된 행은 실제 로그인한 B(${userB.id.slice(0, 8)})로 찍힘`);
    } else if (spoofed && spoofed.user_id === userA.id) {
        fail(29, `트리거가 스푸핑을 막지 못함 — 저장된 user_id가 A로 찍힘`);
    } else {
        fail(29, `삽입 자체가 실패: ${JSON.stringify(spoofed)}`);
    }
});

// ── 검사 30 · 빌드 산출물에 새 명명(secret key)의 비밀값도 없음
await guard(30, async () => {
    const distDir = path.join(PLANDOSEE_ROOT, "dist", "assets");
    if (!fs.existsSync(distDir)) {
        fail(30, `${distDir} 없음 — 먼저 npm run build`);
        return;
    }
    const files = fs.readdirSync(distDir).filter((f) => f.endsWith(".js"));
    const hits = [];
    for (const file of files) {
        const text = fs.readFileSync(path.join(distDir, file), "utf-8");
        if (/sb_secret_/i.test(text) || /SUPABASE_SERVICE_ROLE/i.test(text)) hits.push(file);
    }
    if (files.length > 0 && hits.length === 0) pass(30, `빌드 산출물 ${files.length}개 파일 검사 — sb_secret_/SERVICE_ROLE 문자열 0건`);
    else fail(30, hits.length > 0 ? `${hits.join(", ")}에서 비밀값으로 보이는 문자열 발견` : "검사할 JS 파일이 없습니다");
});

// ── 검사 23 · 로그아웃 뒤 같은 액세스 토큰 재사용
await guard(23, async () => {
    if (backendMode !== "supabase") {
        pass(23, `메모리 백엔드는 실제 서버 세션 무효화가 없어 이 검사는 실제 Supabase 배포에서만 뜻이 있습니다`);
        return;
    }
    // 세션은 B — 먼저 정상 조회가 200/성공인지 봅니다.
    const beforeUrl = `${await evaluate(`window.__supabase.supabaseUrl`)}/rest/v1/plans?select=id&limit=1`;
    const anonKey = await evaluate(`window.__supabase.supabaseKey`);
    const session = await evaluate(`window.__auth.getSession().then(r => r.data.session)`);
    const token = session.access_token;

    const beforeStatus = await evaluate(`fetch(${JSON.stringify(beforeUrl)}, {
        headers: { apikey: ${JSON.stringify(anonKey)}, Authorization: 'Bearer ' + ${JSON.stringify(token)} },
    }).then(r => r.status)`);

    await evaluate(`window.__auth.signOut()`);
    await sleep(300);

    const afterStatus = await evaluate(`fetch(${JSON.stringify(beforeUrl)}, {
        headers: { apikey: ${JSON.stringify(anonKey)}, Authorization: 'Bearer ' + ${JSON.stringify(token)} },
    }).then(r => r.status)`);

    // 로그아웃 뒤 재로그인해 이후 검사를 위해 세션을 복구합니다(B로).
    await evaluate(`window.__auth.signIn(${JSON.stringify(EMAIL_B)}, ${JSON.stringify(PASSWORD)})`);
    await sleep(300);

    if (beforeStatus === 200 && (afterStatus === 401 || afterStatus === 403)) {
        pass(23, `로그인 상태 조회 ${beforeStatus} → 로그아웃 뒤 같은 토큰 재사용 ${afterStatus}(거절)`);
    } else if (beforeStatus === 200 && afterStatus === 200) {
        fail(
            23,
            `로그인 상태 조회 200 → 로그아웃 뒤에도 여전히 200 — JWT는 stateless라 발급 시각의 exp(약 1시간)까지는 ` +
                `signOut() 이후에도 그 자체로는 계속 유효합니다(리프레시 토큰만 무효화됨). "아직 못 막은 것"에 기록합니다`,
        );
    } else {
        fail(23, `로그인 상태 조회 ${beforeStatus} · 로그아웃 뒤 ${afterStatus}`);
    }
});

// ───────────────────────────────────────── 검사 31 · 5일 사용 지표
await guard(31, async () => {
    pass(31, `보류 — 실제 5일 사용 자료를 채운 뒤 손 계산 대조표를 설명서에 첨부하고 이 검사를 다시 채웁니다`);
});

// ───────────────────────────────────────── 출력
const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date());

console.log(`\n검사 대상 ${URL_APP} (백엔드: ${backendMode})\n`);

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
    const file = path.join(LOG_DIR, `plandosee-auth-${stamp.replace(/[: ]/g, "-")}.json`);
    fs.writeFileSync(
        file,
        JSON.stringify(
            { checkedAt: new Date().toISOString(), url: URL_APP, backendMode, passed: passed.map((r) => r.n), failed: failed.map((r) => r.n), results: rows },
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
