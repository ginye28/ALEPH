/**
 * 검사 (6N.md T06-C* 대응).
 *
 * 통과·실패를 사람 눈이 아니라 이 명령 하나가 판정합니다. 헤드리스 브라우저로
 * 실제 화면을 조작하고, 화면 뒤 저장소(`window.__db` — client.js가 노출)도 직접
 * 들여다봅니다.
 *
 *   node plandosee/tools/check.mjs
 *   node plandosee/tools/check.mjs --json      # 결과를 "검사 기록/"에 남깁니다
 *
 * 공개 주소에서 검사하려면 BOARD_URL을 앞에 붙입니다.
 * 주지 않으면 개발 서버(http://localhost:5177)에서 검사합니다.
 *
 * 검사가 만드는 계획·할일·실행기록은 전부 "검사용"이라는 표를 붙인 스크래치 데이터입니다.
 * 실제 개인 기록(카드 5)과 섞이지 않도록 제목 앞에 항상 "[검사]"를 붙입니다.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5177").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PLANDOSEE_ROOT = path.resolve(import.meta.dirname, "..");
const LOG_DIR = path.join(ROOT, "검사 기록");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds2-check-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9345;
const WRITE_JSON = process.argv.includes("--json");
const TAG = "[검사]";

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
    { n: 15, kind: "카드5", title: "첫 화면에 로그인 없음 안내 문구가 있다" },
    { n: 16, kind: "카드5", title: "빌드 산출물 어디에도 service_role 비밀키가 없다" },
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

// 이 검사 실행에서 만든 계획 id를 기억해 뒤 검사들이 이어 씁니다.
let scratchPlanId = null;
let scratchTaskId = null;

// ── 검사 1 · 계획 생성
await guard(1, async () => {
    const created = await evaluate(`window.__db.plans.createWithRevision({
        planId: crypto.randomUUID(), revisionId: crypto.randomUUID(), carriedFromReviewId: null,
        revision: {
            title: ${JSON.stringify(TAG + " 검사용 계획")}, periodStart: "2026-08-25", periodEnd: "2026-09-10",
            priority: "high", successCriteria: "검사 10개 통과", estimatedMinutes: 300, note: null,
        },
    }).then(r => r.data)`);
    scratchPlanId = created.plan.id;
    const rev = created.revision;
    const ok =
        rev.periodStart === "2026-08-25" &&
        rev.periodEnd === "2026-09-10" &&
        rev.priority === "high" &&
        rev.successCriteria === "검사 10개 통과" &&
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
            priority: "high", successCriteria: "검사 10개 통과", estimatedMinutes: 480, note: null,
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

// ── 검사 6 · 삭제는 소프트 삭제 (checks 8·9·10·11이 쓰는 scratchTaskId는 건드리지 않는 별도 할일로 시험합니다)
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
    const ids = [];
    for (const [title, priority, minutes] of [
        [`${TAG} 낮음`, "low", 10],
        [`${TAG} 보통`, "medium", 20],
        [`${TAG} 높음`, "high", 30],
    ]) {
        const t = await evaluate(`window.__db.tasks.create({
            id: crypto.randomUUID(), planId: ${JSON.stringify(scratchPlanId)},
            title: ${JSON.stringify(title)}, detail: null, dueDate: null, priority: ${JSON.stringify(priority)}, tags: [], estimatedMinutes: ${minutes},
        }).then(r => r.data)`);
        ids.push(t.id);
    }

    const searched = await evaluate(`window.__db.tasks.list({ planId: ${JSON.stringify(scratchPlanId)}, search: "높음" }).then(r => r.data)`);
    const filtered = await evaluate(`window.__db.tasks.list({ planId: ${JSON.stringify(scratchPlanId)}, priority: "low" }).then(r => r.data)`);
    const sorted = await evaluate(`window.__db.tasks.list({ planId: ${JSON.stringify(scratchPlanId)}, sortBy: "priority", sortDir: "asc" }).then(r => r.data.map(t => t.priority))`);

    const searchOk = searched.length === 1 && searched[0].title.includes("높음");
    const filterOk = filtered.length === 1 && filtered[0].priority === "low";
    // 오름차순이면 low가 high보다 앞서야 합니다(값이 같으면 id 순 — 결정적입니다).
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
    const targetId = scratchTaskId; // 검사 5에서 지금 todo 상태로 되돌려둔 할일
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
    await evaluate(`window.__db.tasks.reopen(${JSON.stringify(targetId)})`); // 이후 검사를 위해 되돌림
});

// ── 검사 10 · 돌아보기 집계 + 서버 계산 교차검증
await guard(10, async () => {
    const todayKey = "2026-09-05"; // 검사 3의 마감일(2026-08-20)이 지연으로 잡히도록 고정된 기준일을 씁니다.
    const jsStats = await evaluate(`window.__db.review(${JSON.stringify(scratchPlanId)}, ${JSON.stringify(todayKey)}).then(r => r.data)`);
    const rpcStats = await evaluate(`window.__db.rpcPlanReview(${JSON.stringify(scratchPlanId)}, ${JSON.stringify(todayKey)}).then(r => r.data)`);

    const expectedEstimated = 120 + 10 + 20 + 30; // 검사4에서 120으로 고친 A + low/medium/high 3건
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
        jsStats.overdueCount === 1 && // 마감 2026-08-20 지난 할일 A(진행 중)
        jsStats.blockedCount === 1; // 검사 8의 실행기록

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
    const after = await evaluate(`window.__db.tasks.get(${JSON.stringify(scratchTaskId)}).then(r => r.data)`);
    const same = before && after && before.id === after.id && before.estimatedMinutes === after.estimatedMinutes;
    if (same) pass(13, `새로고침 후에도 id·값이 동일`);
    else fail(13, `새로고침 전후 불일치: ${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
});

// ── 검사 14 · 스크립트 텍스트는 글자 그대로
await guard(14, async () => {
    const scriptText = "<script>alert(1)</script>";
    let alerted = false;
    await send("Runtime.evaluate", { expression: `window.__alerted = false; window.alert = () => { window.__alerted = true; };` });
    await evaluate(`window.__select('task-priority', 'medium')`); // 폼이 렌더돼 있는지 확인 겸
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

// ── 검사 15 · 로그인 없음 안내
await guard(15, async () => {
    const banner = await evaluate(`window.__stat('no-login-banner')`);
    const expected = "지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요.";
    if (banner.trim() === expected) pass(15, `문구가 6N.md 원문과 정확히 일치`);
    else fail(15, `실제 문구: "${banner.trim()}"`);
});

// ── 검사 16 · 빌드 산출물에 비밀키 없음 (CDP 아님 — 파일시스템 정적 검사)
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
    const file = path.join(LOG_DIR, `plandosee2-${stamp.replace(/[: ]/g, "-")}.json`);
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
