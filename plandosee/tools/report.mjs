/**
 * 과제 6 제출 보고서 PDF 생성기.
 *
 *   node plandosee/tools/capture.mjs   (먼저 촬영)
 *   node plandosee/tools/report.mjs
 *
 * 출력: AI 인계 실험·정보판 보고서와 겹치지 않는 이름을 씁니다.
 *   → 플랜두씨 다이어리 제출 보고서.pdf
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제6 증빙 화면");
const OUT_PDF = path.join(ROOT, "플랜두씨 다이어리 제출 보고서.pdf");
const OUT_HTML = path.join(SHOT_DIR, "보고서.html");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds-report-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9342;

const cap = JSON.parse(fs.readFileSync(path.join(SHOT_DIR, "촬영 기록.json"), "utf-8"));

// 가장 최근 검사 결과를 읽습니다. 숫자를 손으로 적지 않습니다.
const CHECK_DIR = path.join(ROOT, "검사 기록");
const checkFiles = fs
    .readdirSync(CHECK_DIR)
    .filter((f) => f.startsWith("plandosee-") && f.endsWith(".json"))
    .sort();
const lastCheck = JSON.parse(fs.readFileSync(path.join(CHECK_DIR, checkFiles[checkFiles.length - 1]), "utf-8"));

const capturedFrom = cap.url?.startsWith("http") && !cap.url.includes("localhost") ? cap.url : null;
const PUBLIC_URL = capturedFrom ?? process.env.BOARD_URL ?? "https://<배포 주소>";
const isLocalCapture = !capturedFrom;

const byName = Object.fromEntries(cap.log.map((r) => [r.name, r]));

const capturedKst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "medium",
    hour12: false,
}).format(new Date(cap.capturedAt));

const externalHosts = [...new Set(cap.externalRequests.map((u) => new URL(u).host))].sort();

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
<title>플랜두씨 다이어리 · 제출 보고서</title>
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
  <div class="kicker">T06 · 플랜두씨 다이어리 1</div>
  <h1>계획한 나와<br>실제의 나</h1>
  <p class="sub">공부한 시간을 분 단위로 기록·수정·삭제하고 다시 불러오는 개인 기록기</p>
  <dl>
    <dt>검사 결과</dt><dd class="pass">${lastCheck.passed.length}개 통과 / ${lastCheck.failed.length}개 실패</dd>
    <dt>공개 주소</dt><dd><code>${esc(PUBLIC_URL)}</code></dd>
    <dt>증빙 촬영</dt><dd>${capturedKst} · <code>${esc(cap.url)}</code></dd>
    <dt>자료</dt><dd>공개 화면은 <b>전부 합성</b>. 실제 기록은 PC에만 둡니다</dd>
  </dl>
</section>

<h2>1. 검증 안내서</h2>
<div class="guide">
  <h3>어디로 가나요</h3>
  <p><code>${esc(PUBLIC_URL)}</code> — 설치도 로그인도 없습니다.</p>

  <h3>무엇을 하나요 (3단계)</h3>
  <ol>
    <li><b>자료 도구</b>에서 <b>경계 · 오류 자료</b>를 누릅니다.</li>
    <li><b>기록 목록</b>에서 아무 행의 <b>수정</b>을 눌러 시간을 바꾸고 저장합니다.</li>
    <li><b>JSON 내보내기</b>를 누른 뒤 그 파일로 <b>JSON 가져오기</b>를 합니다.</li>
  </ol>

  <h3>무엇이 보이면 통과인가요</h3>
  <ul>
    <li>1단계 — 주간 요약에 기간 <code>2026-08-24(월) ~ 2026-08-30(일)</code>·합계 <code>85분</code>·이번 주 <code>3건</code>·보류 <code>7건</code>이 보이고, 잘못된 값은 <b>보류 목록</b>에 이유와 함께 있습니다.</li>
    <li>2단계 — 고친 행 하나만 바뀌고 <b>주간 합계가 같은 화면에서 함께</b> 바뀝니다.</li>
    <li>3단계 — 건수가 늘지 않고 <code>n건은 이미 있어 건너뜀</code>이 결과 영역에 보입니다.</li>
  </ul>

  <h3>안 될 때</h3>
  <ul>
    <li>목록이 비면 <b>합성 자료 넣기</b>를 먼저 누릅니다.</li>
    <li>가져오기가 실패하면 <b>결과·오류</b> 영역의 이유를 읽습니다. 기존 기록은 그대로입니다.</li>
    <li>전체 삭제 뒤에는 새로고침해도 0건입니다.</li>
  </ul>
</div>

<h2>2. AI 3줄</h2>
${table(["구분", "내용"], [
    ["AI에게 맡긴 일", "React·Emotion 구성요소 작성, 검사·변환·집계 함수 구현, 검사 10개 실행기(<code>tools/check.mjs</code>)와 증빙 자동 촬영기, 보고서 조판."],
    ["내가 판단한 일", "무엇을 기록할지(<b>공부 시간·분</b>) 결정 — 체중은 하루 한 건이라 주간 집계가 빈약하고, 운동 O/X는 불리언이라 합계가 무의미해 카드 5의 “요약값이 함께 바뀐다”를 보이기 어려웠다. 분 입력에 <b>1440 상한</b>을 두기로 한 것도 판단이다. 600을 6000으로 잘못 치면 주간 합계가 통째로 망가진다."],
    ["AI 말을 안 들은 일", "AI가 잘못된 값을 <b>저장 단계에서 버리자</b>고 했지만 그렇게 하지 않았다. 조용히 버리면 사용자는 자기 기록이 사라진 줄 안다. 대신 <b>보류</b>로 남기고 이유를 화면에 쓰되 집계에서만 뺐다. 카드 4가 요구한 것은 “섞이지 않는다”이지 “없앤다”가 아니다."],
])}

<h2 class="breakbefore">3. 카드 1 — 기록의 구조</h2>

<p>
  기록 문장은 <b>“공부한 시간을 분 단위로, Asia/Seoul 기준 날짜에 기록한다”</b>입니다.
  하루에 여러 건이 쌓이고, 더하면 의미가 생기고, 잘못된 값을 자연스럽게 만들 수 있는 항목이라야
  카드 4·5가 성립합니다.
</p>

${table(["필드", "형", "규칙", "왜 필요한가"], [
    ["<code>id</code>", "string", "<code>crypto.randomUUID()</code>", "행을 가리키는 유일한 수단. 순번으로 가리키면 정렬만 바꿔도 다른 행이 지워집니다"],
    ["<code>date</code>", "string", "<code>YYYY-MM-DD</code> · Asia/Seoul", "집계의 단위"],
    ["<code>timezone</code>", "string", "<code>Asia/Seoul</code>", "화면에 기준 시간대를 표시해야 합니다"],
    ["<code>subject</code>", "string", "1~40자 · 필수", "무엇을 공부했는지"],
    ["<code>minutes</code>", "number", "정수 1~1440", "값. 상한이 자릿수 오타를 막습니다"],
    ["<code>unit</code>", "string", "<code>분</code>", "화면에 단위를 표시해야 합니다"],
    ["<code>tag</code>", "string", "<b>v2에서 추가</b>", "카드 3의 변환 대상"],
])}

${figure("02_기록추가_필드와단위", `${esc(byName["02_기록추가_필드와단위"]?.status ?? "")} — 폼 머리에 단위와 기준 시간대가 함께 보입니다.`)}
${figure("03_추가후_목록과합계", `${esc(byName["03_추가후_목록과합계"]?.status ?? "")}. 추가 한 건이 목록과 주간 요약에 동시에 반영됩니다.`)}
${figure("04_수정후_그행과요약", `${esc(byName["04_수정후_그행과요약"]?.status ?? "")} — 수정이 <b>그 <code>id</code> 한 건</b>에만 반영되고 요약이 함께 바뀝니다 (카드 5의 통과 기준).`)}
${figure("05_필수값_오류이유", `${esc(byName["05_필수값_오류이유"]?.status ?? "")}`)}

<h2 class="breakbefore">4. 카드 2 — 내보내기와 전체 삭제</h2>

<p>
  저장 위치는 <code>localStorage</code>의 키 <b>하나뿐</b>입니다. 읽는 곳과 쓰는 곳이 갈라지면
  “새로고침하면 사라진다”와 “전체 삭제 뒤 일부가 남는다”가 동시에 생깁니다.
</p>

<div class="note">
  <b>가져오기 순서가 핵심입니다 — 읽기 → 검사 → 통과한 경우에만 쓰기.</b>
  지우고 나서 읽으면 손상 파일 하나가 기존 기록을 통째로 날립니다.
</div>

${table(["입력", "결과", "화면 문구"], [
    ["정상 JSON", "복원", "<code>n건을 불러왔습니다</code>"],
    ["JSON은 맞지만 형식이 다름", "<b>기존 기록 유지</b>", "<code>records 배열이 없습니다</code>"],
    ["JSON이 아님", "<b>기존 기록 유지</b>", "<code>파일을 JSON으로 읽지 못했습니다 (위치 n)</code>"],
])}

${figure("06_손상파일_기존유지", `${esc(byName["06_손상파일_기존유지"]?.status ?? "")}`)}
${figure("10_전체삭제_0건", `${esc(byName["10_전체삭제_0건"]?.status ?? "")} — 메모리만 비우지 않고 저장소에서 다시 읽어 그리므로 새로고침해도 0건입니다.`)}

<h2 class="breakbefore">5. 카드 3 — 기존 기록을 잃지 않는 변경</h2>

<p>
  v2에서 <code>tag</code> 필드를 더했습니다. v1 기록을 읽으면 <code>schemaVersion</code>을 보고
  <b>한 번만</b> 변환합니다. 이미 v2인 기록과 값이 있는 필드는 건드리지 않습니다.
</p>

${table(["상황", "처리"], [
    ["<code>schemaVersion</code>이 없음", "v1으로 보고 변환 · <code>tag</code>에 기본값 <code>\"\"</code>"],
    ["<code>schemaVersion === 2</code>", "<b>건너뜁니다</b>"],
    ["이미 <code>tag</code>가 있는 v1 기록", "기존 값을 <b>덮어쓰지 않습니다</b>"],
])}

${figure("07_자료형식_변환상태", `${esc(byName["07_자료형식_변환상태"]?.status ?? "")} — 현재 자료 형식과 변환 상태가 화면에 남습니다.`)}

<div class="note">
  <b>변환을 두 번 돌려도 결과가 같습니다.</b> ${esc(byName["07_자료형식_변환상태_재실행"]?.status ?? "")}.
  ${esc(byName["07_자료형식_변환상태_재실행"]?.note ?? "")}
</div>

<h2 class="breakbefore">6. 카드 4 — 날짜와 잘못된 값</h2>

<p>
  주는 <b>월요일 00:00 ~ 일요일 23:59, Asia/Seoul</b>입니다. 날짜를 <code>Date</code> 객체로 바꾸지 않고
  <code>YYYY-MM-DD</code> <b>문자열로 비교</b>합니다 — <code>new Date("2026-08-24")</code>는 UTC 자정으로
  해석돼 KST에서 하루 밀립니다.
</p>

<h3>예상 결과표 — 먼저 쓰고 나서 구현했습니다</h3>

${table(["입력", "처리", "실제 결과"], [
    ["<code>2026-08-24</code> 월요일 경계", "집계 포함", "<span class='pass'>포함</span>"],
    ["<code>2026-08-30</code> 일요일 경계", "집계 포함", "<span class='pass'>포함</span>"],
    ["<code>2026-08-31</code> 다음 주", "제외", "<span class='pass'>제외</span>"],
    ["<code>minutes: null</code>", "보류", "<code>값이 비었습니다</code>"],
    ["<code>minutes: \"삼십\"</code>", "보류", "<code>숫자가 아닙니다</code>"],
    ["<code>minutes: -10</code>", "보류", "<code>1 이상이어야 합니다</code>"],
    ["<code>minutes: 5000</code>", "보류", "<code>1440 이하여야 합니다</code>"],
    ["<code>date: 2026-13-45</code>", "보류", "<code>없는 달입니다</code>"],
    ["<code>date: 2026-02-30</code>", "보류", "<code>없는 날짜입니다</code>"],
    ["같은 <code>id</code> 두 건", "뒤엣것 건너뜀", "<code>id 중복 — 앞엣것만 셉니다</code>"],
])}

${figure("08_주간요약_기간과집계", `${esc(byName["08_주간요약_기간과집계"]?.status ?? "")} — ${esc(byName["08_주간요약_기간과집계"]?.note ?? "")}`)}
${figure("09_보류목록_이유", `보류 행마다 이유가 붙습니다. 이 7건은 <b>합계에 들어가지 않습니다</b>.`)}

<h2 class="breakbefore">7. 검사 10개</h2>

<p class="muted">
  <code>node plandosee/tools/check.mjs</code> 실행 결과. 사람 눈이 아니라 이 명령 하나가 판정합니다.
</p>

${table(["#", "종류", "검사", "결과", "판정 근거"], lastCheck.results.map((r) => [
    `<b>${r.n}</b>`,
    r.kind,
    esc(r.title),
    r.pass ? `<span class="pass">PASS</span>` : `<span class="todo">FAIL</span>`,
    `<span class="muted">${esc(r.detail)}</span>`,
]))}

<h2 class="breakbefore">8. 카드 5 — 5일 사용 후 개선</h2>

<div class="todo">
  <b>진행 중입니다.</b> 카드 5는 <b>서로 다른 실제 날짜 5일</b>에 기록기를 쓰고, 그동안 반복해서
  불편했던 한 가지를 고칠 것을 요구합니다. 기다린 시간은 5~6시간 작업시간에 넣지 않습니다.
  <br><br>
  개선 항목을 <b>미리 정하지 않았습니다.</b> 카드가 요구하는 것은 “실제로 불편했던 점”이고,
  예상과 실제는 다릅니다. 5일을 채운 뒤 고르고 이 절을 채웁니다.
</div>

${table(["항목", "상태"], [
    ["실제 날짜 5일 기록", "진행 중 — 카드 1을 마친 날이 1일차"],
    ["개선 한 가지", "미정 — 5일 뒤 결정"],
    ["개선 전·후 요약값 대조", "개선 뒤 기록"],
])}

<p>
  <b>실제 기록과 공개 화면은 분리돼 있습니다.</b> 실제 기록은 브라우저 저장소에만 남고 서버로
  보내지 않습니다. 공개 화면에는 합성 자료만 올리며, 5일 요약은 과목·메모를 뺀
  <b>가림 처리한 집계</b>만 싣습니다.
</p>

<h2>9. 개인정보와 비밀값</h2>

${table(["검사 대상", "결과"], [
    ["증빙 촬영 중 나간 <b>모든 외부 요청</b>", externalHosts.length === 0 ? "<span class='pass'>0건</span>" : externalHosts.map((h) => `<code>${esc(h)}</code>`).join(" · ")],
    ["외부 API 호출", "<span class='pass'>없음</span> — 서버 없이 브라우저에서만 동작합니다"],
    ["인증키·토큰", "<span class='pass'>0건</span> — 쓰지 않습니다"],
    ["공개 화면의 실제 개인 기록", "<span class='pass'>0건</span> — 합성 자료만"],
])}

<p class="muted">
  외부 요청은 글꼴 두 곳뿐입니다. 자료를 주고받는 서버가 없으므로 기록이 밖으로 나갈 경로가 없습니다.
</p>

${figure("11_모바일_375", `${esc(byName["11_모바일_375"]?.status ?? "")}`, "half")}

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
        <span style="float:right">플랜두씨 다이어리 · 제출 보고서</span></div>`,
    footerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 15mm;text-align:center;font-family:'Malgun Gothic',sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});

fs.writeFileSync(OUT_PDF, Buffer.from(data, "base64"));
console.log("PDF 저장:", OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);

ws.close();
chrome.kill();
process.exit(0);
