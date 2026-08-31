/**
 * 과제 6 제출 보고서 PDF 생성기 (6N.md).
 *
 *   node plandosee/tools/capture.mjs   (먼저 촬영)
 *   node plandosee/tools/report.mjs
 *
 * 6N.md는 구 6.md와 반대로 "합성 대신 진짜, 대신 공개 가능한 내용만"을 요구합니다.
 * 그래서 이 보고서는 촬영된 화면을 가리지 않고 그대로 싣습니다 — 화면에 "[검사]" 표가
 * 붙은 자료가 보인다면 아직 실제 개인 계획(카드 5)을 넣기 전 스크래치 데이터라는 뜻이고,
 * 그 사실을 보고서 위쪽에 그대로 적습니다.
 *
 * 출력: 플랜두씨 다이어리 제출 보고서.pdf (기존 6.md 제출본을 덮어씁니다)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제6 증빙 화면");
const OUT_PDF = path.join(ROOT, "플랜두씨 다이어리 제출 보고서.pdf");
const OUT_HTML = path.join(SHOT_DIR, "보고서.html");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds2-report-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9347;
const SOURCE_URL = "https://github.com/ginye28/ALEPH/tree/main/plandosee";

const cap = JSON.parse(fs.readFileSync(path.join(SHOT_DIR, "촬영 기록.json"), "utf-8"));

// 가장 최근 검사 결과를 읽습니다. 숫자를 손으로 적지 않습니다.
const CHECK_DIR = path.join(ROOT, "검사 기록");
const checkFiles = fs.existsSync(CHECK_DIR)
    ? fs
          .readdirSync(CHECK_DIR)
          .filter((f) => f.startsWith("plandosee2-") && f.endsWith(".json"))
          .sort()
    : [];
const lastCheck = checkFiles.length
    ? JSON.parse(fs.readFileSync(path.join(CHECK_DIR, checkFiles[checkFiles.length - 1]), "utf-8"))
    : null;

const capturedFrom = cap.url?.startsWith("http") && !cap.url.includes("localhost") ? cap.url : null;
const PUBLIC_URL = capturedFrom ?? process.env.BOARD_URL ?? "https://aleph-pds.vercel.app";
const isLocalCapture = !capturedFrom;
const backendMode = cap.backendMode ?? "memory";
const isScratchData = (cap.log ?? []).some((r) => (r.status ?? "").includes("[검사]") || (r.note ?? "").includes("[검사]"));

const byName = Object.fromEntries(cap.log.map((r) => [r.name, r]));

const capturedKst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "medium",
    hour12: false,
}).format(new Date(cap.capturedAt));

const externalHosts = [...new Set((cap.externalRequests ?? []).map((u) => new URL(u).host))].sort();

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const img = (name) => {
    const file = path.join(SHOT_DIR, `${name}.png`);
    if (!fs.existsSync(file)) return `<div class="missing">증빙 화면 없음: ${name}.png</div>`;
    return `<img src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}" alt="${name}">`;
};

const figure = (name, caption, cls = "") =>
    `<figure class="${cls}">${img(name)}<figcaption><b>${name}</b> — ${caption}</figcaption></figure>`;

const table = (head, body, cls = "") => `
<table class="${cls}">
  <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>플랜두씨 다이어리 2 · 제출 보고서</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  :root {
    --ink:#17191C; --soft:#5A6169; --faint:#878E96; --rule:#C9CFD5; --hair:#E4E8EC;
    --head:#EEF2F5; --accent:#0E5A86; --ok:#0F6B45; --ok-bg:#EAF5EF;
    --todo:#8A5A00; --todo-bg:#FDF4E3;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; font-family:"Malgun Gothic","맑은 고딕","Noto Sans KR",sans-serif;
         font-size:9.6pt; line-height:1.62; color:var(--ink); }
  h1 { font-size:20pt; line-height:1.25; margin:0 0 4pt; letter-spacing:-0.02em; }
  h2 { font-size:13pt; margin:20pt 0 7pt; padding-bottom:4pt;
       border-bottom:1.6pt solid var(--accent); letter-spacing:-0.01em; break-after:avoid; }
  h3 { font-size:10.6pt; margin:12pt 0 4pt; break-after:avoid; }
  p { margin:0 0 5pt; }
  ul, ol { margin:0 0 6pt; padding-left:15pt; }
  li { margin-bottom:2pt; }
  code { font-family:Consolas,"D2Coding",monospace; font-size:8.6pt;
         background:var(--head); padding:0.5pt 3pt; border-radius:2pt; word-break:break-all; }

  .cover { padding-top:42mm; break-after:page; }
  .cover .kicker { color:var(--accent); font-weight:700; font-size:10pt; letter-spacing:0.06em; }
  .cover .sub { color:var(--soft); font-size:11pt; margin-top:6pt; }
  .cover dl { margin-top:26pt; display:grid; grid-template-columns:34mm 1fr; gap:5pt 0;
              font-size:9.4pt; border-top:1pt solid var(--rule); padding-top:12pt; }
  .cover dt { color:var(--soft); }
  .cover dd { margin:0; }

  table { width:100%; border-collapse:collapse; margin:5pt 0 9pt; font-size:8.9pt; }
  th, td { border:0.6pt solid var(--hair); padding:4.2pt 5.5pt; text-align:left; vertical-align:top; }
  thead th { background:var(--head); font-weight:700; white-space:nowrap; }
  table.num td:not(:first-child) { font-family:Consolas,monospace; white-space:nowrap; }
  tr { break-inside:avoid; }

  .pass { color:var(--ok); font-weight:700; }
  .muted { color:#6B7280; }
  .note { background:var(--ok-bg); border-left:2.4pt solid var(--ok); padding:6pt 9pt; margin:7pt 0; font-size:9pt; }
  .todo { background:var(--todo-bg); border-left:2.4pt solid var(--todo); padding:6pt 9pt;
          margin:7pt 0; font-size:9pt; color:var(--todo); }
  .todo b { color:var(--todo); }
  .guide { border:1pt solid var(--rule); padding:9pt 12pt; margin:6pt 0 10pt; }
  .guide h3 { margin-top:8pt; color:var(--accent); font-size:10pt; }
  .guide h3:first-child { margin-top:0; }

  figure { margin:7pt 0 11pt; break-inside:avoid; }
  figure img { width:100%; border:0.6pt solid var(--rule); border-radius:3pt; display:block; }
  figcaption { font-size:8.2pt; color:var(--soft); margin-top:3.5pt; }
  figure.half img { width:70%; }
  .missing { border:1pt dashed #C33; color:#C33; padding:8pt; font-size:9pt; }
  .breakbefore { break-before:page; }
</style>
</head>
<body>

<section class="cover">
  <div class="kicker">T06 · 플랜두씨 다이어리 2</div>
  <h1>계획(Plan) → 실제(Do)<br>→ 돌아보기(See)</h1>
  <p class="sub">서버의 실제 데이터베이스로 이어지는 개인 계획·실행·회고 다이어리 (6N.md)</p>
  <dl>
    <dt>결과물 주소</dt><dd><code>${esc(PUBLIC_URL)}</code></dd>
    <dt>소스 주소</dt><dd><code>${esc(SOURCE_URL)}</code></dd>
    <dt>백엔드</dt><dd>${backendMode === "supabase" ? "Supabase Postgres (실제 서버 DB)" : "임시 메모리 저장소 — 아직 Supabase 미연결"}</dd>
    <dt>촬영</dt><dd>${esc(capturedKst)} · <code>${esc(cap.url)}</code></dd>
    <dt>검사</dt><dd>${lastCheck ? `PASS ${lastCheck.passed.length} / FAIL ${lastCheck.failed.length}` : "검사 기록 없음 — node tools/check.mjs --json 먼저 실행"}</dd>
  </dl>
</section>

${isScratchData ? `
<div class="todo">
  <b>이 보고서의 증빙 화면에는 "[검사]" 표가 붙은 스크래치 데이터가 섞여 있습니다.</b>
  자동 검사·촬영이 만든 시험용 계획·할일·실행기록이며, 카드 5가 요구하는 "내가 실제로 세운
  계획"은 아직 아닙니다. 실제 개인 계획·할일·실행기록을 넣은 뒤 다시 촬영·보고서 생성이
  필요합니다.
</div>` : ""}

${backendMode !== "supabase" ? `
<div class="todo">
  <b>아직 Supabase에 연결되지 않았습니다.</b> 지금은 브라우저 메모리에만 저장되는 임시
  백엔드로 동작 중이라, 새로고침하면 값이 사라집니다(T06-C35 미충족). Supabase 프로젝트를
  만들고 <code>plandosee/supabase/schema.sql</code>을 실행한 뒤, <code>VITE_SUPABASE_URL</code>·
  <code>VITE_SUPABASE_ANON_KEY</code>를 배포 환경에 넣고 다시 검사·촬영·보고서 생성이 필요합니다.
</div>` : ""}

<h2>1. 검증 안내서</h2>

<div class="guide">
  <h3>① 어디로 가나요</h3>
  <p><code>${esc(PUBLIC_URL)}</code> — 설치·로그인 없음</p>

  <h3>② 세 단계 안에 무엇을 하나요</h3>
  <ol>
    <li><b>계획</b> 목록에서 계획 하나의 <b>고치기</b>를 눌러 예상 시간을 바꾸고 저장합니다.</li>
    <li><b>돌아보기</b>에서 <b>지연</b> 또는 <b>막힘</b> 숫자를 누릅니다.</li>
    <li>바로 아래 <b>할 일</b> 목록이 그 조건에 맞는 행만 보여주는지 확인합니다.</li>
  </ol>

  <h3>③ 무엇이 보이면 통과인가요</h3>
  <ul>
    <li>계획 <b>이력</b>을 펼치면 방금 고치기 전 값(1판)이 그대로 남아 있습니다.</li>
    <li>돌아보기의 숫자를 누르면 그 숫자가 나온 할 일 행으로 화면이 이동합니다.</li>
    <li>완료 버튼을 연달아 눌러도 돌아보기의 완료 수는 1만 늘어납니다.</li>
  </ul>

  <h3>④ 안 될 때는 무엇이 보이나요</h3>
  <ul>
    <li>계획이 없으면 "먼저 계획을 하나 선택하거나 만듭니다" 안내가 할 일 자리에 보입니다.</li>
    <li>필수값이 비면 저장되지 않고 칸 아래에 이유가 붙습니다.</li>
    <li>Supabase 연결이 안 됐으면 머리글에 "⚠ Supabase 미설정" 배지가 보입니다.</li>
  </ul>
</div>

<h2>2. AI와 내 판단 3줄</h2>

${table(["구분", "내용"], [
    ["AI에게 맡긴 일", "Supabase 스키마 SQL·RLS 정책 설계, API 계층(memory/Supabase 두 백엔드 동일 인터페이스) 구현, 5개 카드의 화면·컴포넌트 구현, CDP 기반 검사·촬영·보고서 도구 재작성."],
    ["내가 직접 판단한 일", "6N.md가 6.md와 완전히 다른 과제임을 확인하고 전면 재구축을 결정, 백엔드로 Supabase를 선택, 완료 중복방지는 이벤트 로그가 아니라 상태 전이로 모델링하기로 확정, 이력 테이블(plan_revisions·execution_records·review_notes)에는 UPDATE/DELETE 정책을 아예 두지 않아 RLS 수준에서 불변으로 만들기로 결정."],
    ["AI 제안을 따르지 않은 일(없다면 왜 없었는지)", "없음 — AI가 제시한 스키마·아키텍처 제안을 검토 후 그대로 채택했습니다. 다만 구현 중 실제로 검사를 돌려 PlanForm이 '고치기' 모드에서 key 없이 재마운트되지 않아 개정본 저장이 실패하는 버그를 발견해 직접 고쳤습니다."],
])}

<h2 class="breakbefore">3. 카드 1 — 계획 세우기</h2>

<p>계획은 고치지 않습니다. 새 개정본을 쌓고, 계획 ID는 그대로 둡니다 — <code>plan_revisions</code>는
UPDATE/DELETE 정책이 없어 RLS 수준에서 항상 append-only입니다.</p>

${figure("02_계획_이력", `${esc(byName["02_계획_이력"]?.status ?? "")} — ${esc(byName["02_계획_이력"]?.note ?? "")}`)}

<h2 class="breakbefore">4. 카드 2 — 할 일 다루기</h2>

<p>할 일은 만들고 고치고 완료·되돌리기·삭제할 수 있습니다. 삭제는 소프트 삭제(<code>deleted_at</code>)라
DB에는 남고 목록·집계에서만 빠집니다 — <code>tasks</code>에는 DELETE 정책이 없어 anon 키로도
하드 삭제가 불가능합니다.</p>

${figure("03_할일_목록", "마감일·우선순위·태그·예상시간이 각 행에 저장돼 보입니다.")}
${figure("04_검색필터정렬", `${esc(byName["04_검색필터정렬"]?.status ?? "")} — ${esc(byName["04_검색필터정렬"]?.note ?? "")}`)}

<h2 class="breakbefore">5. 카드 3 — 실제로 한 일 적기</h2>

<p>실행기록은 계획·할일과 분리된 별도 테이블(<code>execution_records</code>)입니다. 실행기록을 저장하는
경로는 <code>plans</code>·<code>plan_revisions</code>·<code>tasks</code>의 내용 칼럼을 절대 쓰지
않으므로 "원래 계획 값이 덮어쓰이지 않는다"는 구조적으로 보장됩니다.</p>

${figure("05_실행기록", `${esc(byName["05_실행기록"]?.status ?? "")} — ${esc(byName["05_실행기록"]?.note ?? "")}`)}

<div class="note">
  <b>완료 중복방지</b> — ${esc(byName["06_완료중복방지"]?.status ?? "")}. ${esc(byName["06_완료중복방지"]?.note ?? "")}
  완료는 <code>UPDATE tasks SET status='done' WHERE id=$1 AND status&lt;&gt;'done'</code>로 가드된
  상태 전이입니다 — 이벤트 로그가 아니라 상태라서 애초에 쌓일 것이 없습니다.
</div>

<h2 class="breakbefore">6. 카드 4 — 돌아보기, 그리고 다음 계획으로</h2>

<p>집계(완료·지연·막힘·예상시간·실제시간·차이)는 화면과 드릴다운 목록이 같은 조건식
(<code>reviewFilters.js</code>)을 공유해 계산합니다. 실제 Postgres 함수 <code>plan_review()</code>가
같은 값을 내는지도 검사에서 교차검증합니다.</p>

${figure("07_돌아보기_집계", "완료·지연·막힘 숫자와 예상·실제 시간 합계, 차이가 한 화면에 보입니다.")}
${figure("08_드릴다운", `${esc(byName["08_드릴다운"]?.status ?? "")} — ${esc(byName["08_드릴다운"]?.note ?? "")}`)}
${figure("09_고칠점_다음계획", `${esc(byName["09_고칠점_다음계획"]?.status ?? "")} — ${esc(byName["09_고칠점_다음계획"]?.note ?? "")}`)}

<h2 class="breakbefore">7. 카드 5 — 내 것으로 채우고, 잃지 않게</h2>

${figure("10_로그인없음_배너", `${esc(byName["10_로그인없음_배너"]?.status ?? "")} — ${esc(byName["10_로그인없음_배너"]?.note ?? "")}`)}
${figure("11_내보내기", "계획·이력·할일·실행기록·고칠 점 전체를 파일 하나로 내보낼 수 있습니다.")}

<p>
  최종 데이터베이스의 표·항목·관계와 날짜 규칙은 <code>plandosee/contracts/pds-schema-v2.json</code>에
  적혀 있고 최종 소스에 포함돼 있습니다.
</p>

${isScratchData ? `
<div class="todo">
  <b>진행 중입니다.</b> 실제 계획 1개 이상·할일 5개 이상·실행기록 3개 이상을 내가 직접 넣고,
  그 자료로 돌아보기 화면이 채워지는지(집계가 전부 0이 아닌지) 확인해야 카드 5가 끝납니다.
</div>` : `
<div class="note">
  실제로 세운 계획과 할 일·실행기록이 들어 있고, 그 자료로 돌아보기 화면이 채워져
  집계 숫자가 0이 아닙니다.
</div>`}

<h2 class="breakbefore">8. 검사 ${lastCheck ? lastCheck.results.length : 16}개</h2>

<p class="muted">
  <code>node plandosee/tools/check.mjs</code> 실행 결과. 사람 눈이 아니라 이 명령 하나가 판정합니다.
</p>

${lastCheck ? table(["#", "카드", "검사", "결과", "판정 근거"], lastCheck.results.map((r) => [
    `<b>${r.n}</b>`,
    r.kind,
    esc(r.title),
    r.pass ? `<span class="pass">PASS</span>` : `<span class="todo">FAIL</span>`,
    `<span class="muted">${esc(r.detail)}</span>`,
])) : `<div class="todo">검사 기록이 없습니다 — <code>node plandosee/tools/check.mjs --json</code>을 먼저 실행합니다.</div>`}

<h2 class="breakbefore">9. 개인정보와 비밀값</h2>

${table(["검사 대상", "결과"], [
    ["증빙 촬영 중 나간 <b>모든 외부 요청</b>", externalHosts.length === 0 ? "<span class='pass'>0건</span>" : externalHosts.map((h) => `<code>${esc(h)}</code>`).join(" · ")],
    ["service_role 비밀키가 빌드 산출물에 포함", lastCheck?.results?.find((r) => r.n === 16)?.pass ? "<span class='pass'>없음 (검사 16)</span>" : "<span class='todo'>확인 필요</span>"],
    ["스크립트 모양 글자 실행 여부", lastCheck?.results?.find((r) => r.n === 14)?.pass ? "<span class='pass'>실행되지 않고 글자로 보임 (검사 14)</span>" : "<span class='todo'>확인 필요</span>"],
    ["로그인·인증·초대·비밀번호·CAPTCHA", "<span class='pass'>없음</span> — 6N.md가 요구하는 대로 아직 잠그지 않았습니다"],
])}

<p class="muted">
  anon 공개키는 Supabase 설계상 브라우저에 노출되는 것이 정상입니다(RLS가 접근 통제를 대신합니다).
  노출되면 안 되는 것은 <code>service_role</code> 비밀키뿐이고, 이 키는 스키마를 처음 설정할 때
  Supabase SQL 편집기에서 한 번만 쓰고 저장소·소스·배포 환경 어디에도 넣지 않습니다.
</p>

${figure("12_모바일_375", `${esc(byName["12_모바일_375"]?.status ?? "")}`, "half")}

${isLocalCapture ? `
<div class="todo">
  <b>이 보고서의 증빙은 개발 서버(<code>${esc(cap.url)}</code>)에서 찍었습니다.</b>
  배포가 끝나면 <code>BOARD_URL</code>을 주고 다시 촬영해 이 보고서를 갱신합니다.
</div>` : ""}

</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, "utf-8");
console.log("보고서 HTML 저장:", OUT_HTML);

// ───────────────────────────────────────── PDF 인쇄
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(
    CHROME,
    ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--disable-gpu", "about:blank"],
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

for (let i = 0; i < 60; i += 1) {
    try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        const page = list.find((t) => t.type === "page");
        if (page) {
            ws = new WebSocket(page.webSocketDebuggerUrl);
            await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
            ws.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.id && pending.has(msg.id)) {
                    const p = pending.get(msg.id);
                    pending.delete(msg.id);
                    msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
                }
            };
            break;
        }
    } catch {
        // 아직 준비 전
    }
    await sleep(300);
}

await send("Page.enable");
await send("Page.navigate", { url: `file:///${OUT_HTML.replace(/\\/g, "/")}` });
await sleep(2500);

const { data } = await send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 15mm;font-family:'Malgun Gothic',sans-serif;">
        <span style="float:right">플랜두씨 다이어리 2 · 제출 보고서</span></div>`,
    footerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 15mm;text-align:center;font-family:'Malgun Gothic',sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});

fs.writeFileSync(OUT_PDF, Buffer.from(data, "base64"));
console.log("PDF 저장:", OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);

ws.close();
chrome.kill();
process.exit(0);
