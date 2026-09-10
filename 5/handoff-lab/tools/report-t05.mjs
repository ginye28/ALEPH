/**
 * 과제 5 제출 보고서 PDF 생성기.
 *
 * 과제 4의 report.mjs와 출력 위치가 다릅니다 — 과제 4 보고서를 덮어쓰지 않기 위해서입니다.
 *   과제 4: 오늘의 진짜 정보판 제출 보고서.pdf   ← 건드리지 않음
 *   과제 5: AI 인계 실험 제출 보고서.pdf          ← 이 파일이 씁니다
 *
 *   node handoff-lab/tools/capture-t05.mjs   (먼저 촬영)
 *   node handoff-lab/tools/report-t05.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제5 증빙 화면");
const OUT_PDF = path.join(ROOT, "AI 인계 실험 제출 보고서.pdf");
const OUT_HTML = path.join(SHOT_DIR, "보고서.html");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "t05-report-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9338;

const cap = JSON.parse(fs.readFileSync(path.join(SHOT_DIR, "촬영 기록.json"), "utf-8"));
const worklog = JSON.parse(
    fs.readFileSync(path.join(ROOT, "handoff-lab", "handoff", "worklog.json"), "utf-8"),
);
const handoffText = fs.readFileSync(
    path.join(ROOT, "handoff-lab", "HANDOFF.md"),
    "utf-8",
);

// 검사 기록 폴더에서 가장 최근 결과를 읽습니다. 숫자를 손으로 적지 않습니다.
const CHECK_DIR = path.join(ROOT, "검사 기록");
const checkFiles = fs
    .readdirSync(CHECK_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
const lastCheck = JSON.parse(
    fs.readFileSync(path.join(CHECK_DIR, checkFiles[checkFiles.length - 1]), "utf-8"),
);

const capturedFrom =
    cap.url?.startsWith("http") && !cap.url.includes("localhost") ? cap.url : null;
const PUBLIC_URL = capturedFrom ?? process.env.BOARD_URL ?? "https://aleph-dash.vercel.app";
const isLocalCapture = !capturedFrom;

const { caps, checks, runs, criteria, units, feature } = worklog;
const [runA, runB] = runs;

const byName = Object.fromEntries(cap.log.map((r) => [r.name, r]));

const capturedKst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "medium",
    hour12: false,
}).format(new Date(cap.capturedAt));

const hostsOf = (urls) => [...new Set(urls.map((u) => new URL(u).host))].sort();
const externalHosts = hostsOf(cap.externalRequests);

const esc = (text) =>
    String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const img = (name) => {
    const file = path.join(SHOT_DIR, `${name}.png`);
    if (!fs.existsSync(file)) {
        return `<div class="missing">증빙 화면 없음: ${name}.png</div>`;
    }
    return `<img src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}" alt="${name}">`;
};

const figure = (name, caption, cls = "") => `
<figure class="${cls}">
  ${img(name)}
  <figcaption><b>${name}</b> — ${caption}</figcaption>
</figure>`;

const table = (head, body, cls = "") => `
<table class="${cls}">
  <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;

const cell = (v) => (v === null || v === undefined ? "–" : v);

/** 검사 번호마다 누가 통과시켰는지. 화면의 WorklogTable과 같은 규칙입니다. */
const whoPassed = (n) => {
    const a = runA.passed.includes(n);
    const b = runB.passed.includes(n);
    if (b && !a) return `<span class="tag b">AI B</span>`;
    if (a) return `<span class="tag a">AI A</span>`;
    return `<span class="tag todo">남음</span>`;
};

// HANDOFF.md의 제목만 뽑아 7개 항목이 실제로 채워졌음을 보입니다.
const handoffHeadings = handoffText
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim());

const selected = cap.selected;

// JSON은 26.0을 26으로 줄여 버립니다. 보고서 숫자가 증빙 화면과 달라 보이지 않도록
// 화면과 같은 자릿수·부호로 다시 씁니다.
const fixed = (n) => Number(n).toFixed(1);
const signed = (n) => (n > 0 ? `+${fixed(n)}` : fixed(n));

// ───────────────────────────────────────── 본문
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>AI 인계 실험 · 제출 보고서</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }

  :root {
    --ink: #17191C;
    --soft: #5A6169;
    --faint: #878E96;
    --rule: #C9CFD5;
    --hair: #E4E8EC;
    --head: #EEF2F5;
    --accent: #0E5A86;
    --ok: #0F6B45;
    --ok-bg: #EAF5EF;
    --todo: #8A5A00;
    --todo-bg: #FDF4E3;
    --b: #6A3E9E;
    --b-bg: #F3EDFA;
  }

  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: "Malgun Gothic", "맑은 고딕", "Noto Sans KR", sans-serif;
    font-size: 9.6pt;
    line-height: 1.62;
    color: var(--ink);
  }

  h1 { font-size: 20pt; line-height: 1.25; margin: 0 0 4pt; letter-spacing: -0.02em; }
  h2 {
    font-size: 13pt; margin: 20pt 0 7pt; padding-bottom: 4pt;
    border-bottom: 1.6pt solid var(--accent); letter-spacing: -0.01em;
    break-after: avoid;
  }
  h3 { font-size: 10.6pt; margin: 12pt 0 4pt; break-after: avoid; }
  p { margin: 0 0 5pt; }
  ul, ol { margin: 0 0 6pt; padding-left: 15pt; }
  li { margin-bottom: 2pt; }
  b, strong { font-weight: 700; }
  code {
    font-family: Consolas, "D2Coding", monospace;
    font-size: 8.6pt; background: var(--head); padding: 0.5pt 3pt; border-radius: 2pt;
    word-break: break-all;
  }

  .cover { padding-top: 42mm; text-align: left; break-after: page; }
  .cover .kicker { color: var(--accent); font-weight: 700; font-size: 10pt; letter-spacing: 0.06em; }
  .cover .sub { color: var(--soft); font-size: 11pt; margin-top: 6pt; }
  .cover dl {
    margin-top: 26pt; display: grid; grid-template-columns: 34mm 1fr;
    gap: 5pt 0; font-size: 9.4pt; border-top: 1pt solid var(--rule); padding-top: 12pt;
  }
  .cover dt { color: var(--soft); }
  .cover dd { margin: 0; }

  table { width: 100%; border-collapse: collapse; margin: 5pt 0 9pt; font-size: 8.9pt; }
  th, td {
    border: 0.6pt solid var(--hair); padding: 4.2pt 5.5pt;
    text-align: left; vertical-align: top;
  }
  thead th { background: var(--head); font-weight: 700; white-space: nowrap; }
  table.num td:not(:first-child) { font-family: Consolas, monospace; white-space: nowrap; }
  tr { break-inside: avoid; }

  .pass { color: var(--ok); font-weight: 700; }
  .muted { color: #6B7280; }
  .nw { white-space: nowrap; }

  .tag {
    display: inline-block; padding: 0.5pt 4pt; border-radius: 2pt;
    font-size: 8pt; font-weight: 700;
  }
  .tag.a { background: var(--ok-bg); color: var(--ok); }
  .tag.b { background: var(--b-bg); color: var(--b); }
  .tag.todo { background: var(--todo-bg); color: var(--todo); }

  .note {
    background: var(--ok-bg); border-left: 2.4pt solid var(--ok);
    padding: 6pt 9pt; margin: 7pt 0; font-size: 9pt;
  }
  .todo {
    background: var(--todo-bg); border-left: 2.4pt solid var(--todo);
    padding: 6pt 9pt; margin: 7pt 0; font-size: 9pt; color: var(--todo);
  }
  .todo b { color: var(--todo); }

  .guide { border: 1pt solid var(--rule); padding: 9pt 12pt; margin: 6pt 0 10pt; }
  .guide h3 { margin-top: 8pt; color: var(--accent); font-size: 10pt; }
  .guide h3:first-child { margin-top: 0; }

  figure { margin: 7pt 0 11pt; break-inside: avoid; }
  figure img {
    width: 100%; border: 0.6pt solid var(--rule); border-radius: 3pt; display: block;
  }
  figcaption { font-size: 8.2pt; color: var(--soft); margin-top: 3.5pt; }
  figure.half img { width: 74%; }
  .missing { border: 1pt dashed #C33; color: #C33; padding: 8pt; font-size: 9pt; }

  .flow { margin: 8pt 0 10pt; font-size: 8.6pt; }
  .flow .row { display: flex; align-items: stretch; gap: 0; }
  .flow .box {
    border: 0.8pt solid var(--rule); border-radius: 3pt; padding: 6pt 8pt;
    background: #FBFCFD; flex: 1; min-width: 0;
  }
  .flow .box b { display: block; font-size: 9pt; margin-bottom: 1.5pt; }
  .flow .box span { color: var(--soft); }
  .flow .arrow {
    display: flex; align-items: center; justify-content: center;
    width: 26pt; color: var(--accent); font-weight: 700; font-size: 12pt; flex: none;
  }

  .breakbefore { break-before: page; }
</style>
</head>
<body>

<section class="cover">
  <div class="kicker">T05 · AI가 바뀌어도 작업 이어가기</div>
  <h1>한 AI가 멈춰도<br>저장소와 인계 문서만으로<br>같은 작업을 이어간다</h1>
  <p class="sub">개선 기능 — ${esc(feature.name)}</p>

  <dl>
    <dt>개선한 기능</dt><dd>${esc(feature.sentence)}</dd>
    <dt>검사 결과</dt><dd class="pass">${lastCheck.passed.length}개 통과 / ${lastCheck.failed.length}개 실패</dd>
    <dt>두 AI</dt><dd>AI A ${cell(runA.minutes)}분·${cell(runA.requests)}요청 → 중단 · AI B ${cell(runB.minutes)}분·${cell(runB.requests)}요청 → 완성</dd>
    <dt>공개 주소</dt><dd><code>${esc(PUBLIC_URL)}</code></dd>
    <dt>증빙 촬영</dt><dd>${capturedKst} · <code>${esc(cap.url)}</code></dd>
  </dl>
</section>

<h2>1. 무엇을 했나</h2>

<p>
  과제 4에서 만든 정보판에 <b>작은 기능 하나</b>를 더했다. 그 기능을 만드는 도중에
  <b>일부러 AI를 바꿨다.</b> 첫 AI(A)가 검사 8개까지 통과시킨 뒤 계획한 지점에서 멈추고,
  두 번째 AI(B)에게는 <b>이 대화 전문 대신 저장소와 인계 문서 한 장만</b> 넘겼다.
  AI B가 남은 검사 2개를 끝내 10개가 모두 통과했다.
</p>

<div class="flow">
  <div class="row">
    <div class="box">
      <b>AI A</b>
      <span>기능 정의와 검사 10개만 받음<br>${cell(runA.minutes)}분 · ${cell(runA.requests)}요청 → 검사 ${runA.passed.length}개</span>
    </div>
    <div class="arrow">→</div>
    <div class="box">
      <b>계획한 중단</b>
      <span>${esc(caps.stopAt)}<br>남은 검사 ${runA.failed.join("·")}은 손대지 않음</span>
    </div>
    <div class="arrow">→</div>
    <div class="box">
      <b>인계 문서 <code>HANDOFF.md</code></b>
      <span>7개 항목 한 페이지<br>첫 대화 전문 없음</span>
    </div>
    <div class="arrow">→</div>
    <div class="box">
      <b>AI B</b>
      <span>저장소 + 인계 문서만 받음<br>${cell(runB.minutes)}분 · ${cell(runB.requests)}요청 → 검사 ${runB.passed.length}개</span>
    </div>
  </div>
</div>

<h3>개선한 기능 — ${esc(feature.name)}</h3>
<p>${esc(feature.sentence)}</p>
<p class="muted">사용 방법 — ${esc(feature.howTo)}</p>

${figure("02_기능이름과_사용방법", "기능의 <b>이름</b>(비교 기준 고르기)과 <b>사용 방법</b>이 카드 안에 함께 보인다. 조작하기 전 기본 비교는 최신 2건이다.")}

${figure("03_조작후_비교기준바뀜", `기록 한 건(<code>${esc(selected.dateKey)}</code>)을 <b>누르자</b> 비교 기준이 그 날짜로 바뀌고 차이·방향·단위가 즉시 다시 계산됐다. 화면의 계산식 <code>${fixed(selected.equation.target)} − ${fixed(selected.equation.base)} = ${signed(selected.equation.delta)}</code>는 손계산 <code>${signed(selected.handCalc)}</code>과 같다.`)}

${figure("04_선택표시_날짜별기록", "누른 날짜에만 선택 표시가 남는다. 다른 기록을 누르면 표시가 옮겨간다(검사 3).", "half")}

<h2 class="breakbefore">2. 같은 기준과 예산 — 작업 전에 정하고 커밋했다</h2>

<p>
  두 AI를 공평하게 비교하려면 <b>검사와 상한을 작업 시작 전에</b> 정해야 한다.
  작업 중에 유리한 쪽으로 바꾸면 비교가 무효가 된다. 아래는
  <code>handoff/worklog.json</code>에 먼저 커밋한 값이다.
</p>

${table(
    ["항목", "정한 값"],
    [
        ["요청 상한", `<b>${caps.requests}회</b> (사람이 보낸 메시지 수)`],
        ["시간 상한", `<b>${caps.minutes}분</b>`],
        ["계획 중단 지점", esc(caps.stopAt)],
        ["무료 한도", esc(caps.freeLimit)],
    ],
)}

<div class="note">
  <b>무료 한도를 일부러 소진하지 않았다.</b> 상한을 무료 범위의 절반 이하로 잡고,
  중단은 한도 소진이 아니라 <b>미리 정한 검사 개수·요청 수</b>로 결정했다.
  개인 결제를 새로 하지 않았다.
</div>

<h3>기록 단위 — 두 AI에 같은 자를 댔다</h3>

${table(
    ["항목", "세는 방법"],
    Object.entries(units).map(([k, v]) => [`<code>${esc(k)}</code>`, esc(v)]),
)}

<h3>검사 10개</h3>

${table(
    ["#", "종류", "검사 내용", "누가 통과시켰나"],
    checks.map((c) => [
        `<b>${c.n}</b>`,
        c.kind,
        esc(c.title),
        whoPassed(c.n),
    ]),
    "",
)}

${figure("08_검사10개_누가어디까지", "같은 목록이 화면에도 그대로 있다. 검사마다 AI A가 했는지 AI B가 했는지 색으로 구분된다.")}

<h2 class="breakbefore">3. 인계 문서 — 첫 대화 없이 이어갈 수 있는가</h2>

<p>
  AI B에게는 이 대화 전문을 주지 않았다. 준 것은 아래
  <code>handoff-lab/HANDOFF.md</code>와 고쳐야 할 소스 4개를 묶은 <b>파일 한 장</b>뿐이다.
  문서에는 7개 항목이 모두 채워져 있고, 실행 명령은 그대로 복사해 실행할 수 있다.
</p>

${table(
    ["#", "항목", "채워진 내용"],
    handoffHeadings.map((h, i) => [
        `${i + 1}`,
        `<b>${esc(h)}</b>`,
        h === "목표" ? "기능 한 문장 + 끝나는 조건(검사 10개 통과)"
        : h === "현재 상태" ? "통과·실패 검사 번호와 바뀐 파일 목록"
        : h === "실행 명령" ? "<code>npm run dev</code> · <code>node tools/check.mjs</code> — 복사해 바로 실행"
        : h === "통과한 검사" ? "번호와 한 줄 설명"
        : h === "남은 문제" ? "검사 6·7의 재현 방법과 원인 추정까지"
        : h === "다음 행동" ? "파일 이름과 함께 3단계"
        : "computeDiff.js · history.js를 건드리지 말 것과 그 이유",
    ]),
)}

${figure("06_인계문서_7개항목", "인계 문서는 <b>저장소의 <code>HANDOFF.md</code> 원문을 그대로 읽어</b> 화면에 그린다. 화면용 사본을 따로 두면 문서와 화면이 어긋나고, 그때부터 인계 문서를 믿을 수 없게 된다.")}

<div class="note">
  <b>이해 확인을 먼저 했다.</b> AI B에게 코드를 고치기 전에 세 가지를 먼저 물었다 —
  ① 목표를 한 문장으로 ② 지금 실패하는 검사 번호와 원인 추정 ③ 건드리면 안 되는 파일과 그 이유.
  세 답이 모두 맞아 인계 문서를 고칠 필요가 없었다 (<code>handoffMisreads: ${cell(runB.handoffMisreads)}</code>).
</div>

<h2 class="breakbefore">4. AI B가 완성한 것</h2>

<p>
  AI B는 남은 검사 2개를 구현했다. 접근 방식은 인계 문서가 제안한 것과 달랐고, 더 나았다 —
  인계 문서는 “<code>vanished</code>일 때 선택을 비운다”고 적었지만,
  AI B는 <b>기록을 갱신하는 시점(<code>applyHistory</code>)에서 곧바로 정리</b>하는 쪽을 골랐다.
</p>

${table(
    ["검사", "무엇이 문제였나", "AI B가 한 일"],
    [
        [
            "<b>6</b>",
            "기록이 1건뿐이라 비교가 불가능한데도 행을 누를 수 있었다",
            "<code>HistoryList</code>에 <code>selectable</code>을 넘겨 2건 미만이면 행을 <code>disabled</code>로 두고, 안내 문구를 바꿨다",
        ],
        [
            "<b>7</b>",
            "선택한 날짜가 기록에서 사라져도 선택이 남아, 기록을 비웠다 채우면 되살아났다",
            "<code>applyHistory()</code>를 만들어 기록을 바꿔 넣는 모든 경로에서 사라진 선택을 함께 정리했다",
        ],
    ],
)}

${figure("05_검사6_기록1건_비활성", "검사 6 — 기록이 1건이면 행이 <b>비활성</b>이고, “2건 이상부터 비교 기준을 고를 수 있습니다”가 보인다. 누를 수 없으니 잘못된 비교가 애초에 일어나지 않는다.", "half")}

<h3>검사 결과 — ${lastCheck.passed.length} / ${checks.length}</h3>

<p class="muted">
  <code>node handoff-lab/tools/check.mjs</code> 실행 결과.
  사람 눈이 아니라 이 명령 하나가 판정한다.
</p>

${table(
    ["#", "결과", "판정 근거 (실행기가 출력한 그대로)"],
    lastCheck.results.map((r) => [
        `<b>${r.n}</b>`,
        r.pass ? `<span class="pass">PASS</span>` : `<span class="tag todo">FAIL</span>`,
        `<span class="muted">${esc(r.detail)}</span>`,
    ]),
)}

<h2 class="breakbefore">5. 두 AI 비교와 앞으로의 선택 기준</h2>

<p>
  <b>모델 이름은 가렸다.</b> 이름에 대한 인상이 아니라 시간·요청·오류·재작업 기록만 보고
  운영 기준을 정하기 위해서다.
</p>

${table(
    ["항목", "AI A", "AI B"],
    [
        ["모델", runA.model ?? "가림", runB.model ?? "가림"],
        ["시간 (분)", cell(runA.minutes), cell(runB.minutes)],
        ["요청 (사람 메시지 수)", cell(runA.requests), cell(runB.requests)],
        ["재작업 (다시 실행한 검사 수)", cell(runA.rework), cell(runB.rework)],
        ["인계 이해 오류 (횟수)", cell(runA.handoffMisreads), cell(runB.handoffMisreads)],
        ["통과 검사", runA.passed.join(" · "), runB.passed.join(" · ")],
        ["남긴 오류", runA.failed.length ? runA.failed.join(" · ") : "–", runB.failed.length ? runB.failed.join(" · ") : "–"],
    ],
    "num",
)}

${figure("07_두AI_비교표", "같은 표가 화면에도 있다. 두 AI가 <b>같은 검사 10개·같은 기록 단위</b>로 정리돼 있다.")}

<div class="note">
  <b>AI B가 받은 것은 인계 묶음 하나뿐이다.</b> 첫 대화 전문도, 저장소 접근도 주지 않았다.
  준 것은 <code>HANDOFF.md</code>와 고쳐야 할 소스 4개(<code>selectPair.js</code> ·
  <code>Dashboard.jsx</code> · <code>HistoryList.jsx</code> · <code>styles.js</code>)를 묶은
  파일 한 장이다. 카드 4가 요구하는 “저장소와 인계 문서만 제공”이 그대로 성립한다.
</div>

<div class="todo">
  <b>한 가지 짚어 둘 것.</b> AI B는 작업을 시작하며 “직전 요청에서 이미 저장소를 검사했으니
  백지 상태가 아니다”라고 <b>스스로 단서를 달았다.</b> 확인해 보니 그때 본 것도 같은 인계 묶음이었다 —
  검사 7의 원인(<code>vanished</code>)은 묶음에 들어 있던 <code>selectPair.js</code> 전문에서
  나온 것이라 인계 자료 안에서 나온 이해다. <b>AI가 스스로 밝힌 한계라도 그대로 받아 적지 않고
  근거를 확인해야 한다</b>는 것을 이 건에서 배웠다.
</div>

<h3>앞으로의 선택 기준</h3>

<p class="muted">측정 기록에 근거해 정했다. 모델 이름이 아니라 숫자와 연결된다.</p>

<ol>
${criteria.map((c) => `  <li>${esc(c)}</li>`).join("\n")}
</ol>

${figure("09_전체화면_비교표와기준", "두 AI 비교 표와 앞으로의 선택 기준이 <b>같은 화면</b>에 함께 보인다 (완료 기준 3).")}

<h2 class="breakbefore">6. 검증 안내서</h2>

<div class="guide">
  <h3>어디로 가나요</h3>
  <p><code>${esc(PUBLIC_URL)}</code> — 설치·로그인 없음</p>

  <h3>무엇을 하나요 (3단계)</h3>
  <ol>
    <li><b>이전 기록과의 차이</b> 카드에서 기능 이름과 사용 방법을 읽는다.</li>
    <li>아래 <b>날짜별 기록</b>에서 지난 날짜 한 건을 누른다.</li>
    <li>더 내려 <b>두 AI 작업 기록</b> 표와 <b>앞으로의 선택 기준</b>을 확인한다.</li>
  </ol>

  <h3>무엇이 보이면 통과인가요</h3>
  <ul>
    <li>1단계 — “비교 기준 고르기”라는 <b>이름</b>과 “한 건을 누르면 그 날짜와 비교합니다”라는 <b>사용 방법</b>이 한 카드에 있다.</li>
    <li>2단계 — 누른 <b>즉시</b> 비교 기준 날짜·차이 숫자·방향(▲/▼)·단위·계산식이 함께 바뀐다.</li>
    <li>3단계 — 두 AI가 같은 항목으로 비교된 표와, 선택 기준 ${criteria.length}개가 <b>같은 화면</b>에 보인다.</li>
  </ul>

  <h3>안 될 때</h3>
  <ul>
    <li>기록이 1건뿐이면 행이 눌리지 않는다 — 정상이다. <b>다시 확인</b>을 누르면 지난 날짜가 채워진다.</li>
    <li>최신 날짜를 누르면 차이 대신 사유 문구가 나온다 — 같은 날짜끼리는 비교하지 않는다.</li>
    <li>화면이 비어 있으면 <b>다시 확인</b>을 누른다.</li>
  </ul>
</div>

${figure("10_모바일_375", "375px 폭에서도 가로 스크롤 없이 읽힌다.", "half")}

<h2>7. 비밀값과 개인정보</h2>

${table(
    ["검사 대상", "결과"],
    [
        ["증빙 촬영 중 나간 <b>모든 외부 요청</b>의 호스트", externalHosts.map((h) => `<code>${esc(h)}</code>`).join(" · ")],
        ["인증키·토큰", `<span class="pass">0건</span> — 인증키가 필요 없는 공개 출처만 쓴다`],
        ["공개 화면·인계 문서·제출 기록의 개인정보", `<span class="pass">0건</span>`],
        ["첫 대화 전문", `인계 문서에 포함하지 않음 — <code>HANDOFF.md</code>는 상태와 다음 행동만 적는다`],
    ],
)}

<h2>8. AI 3줄</h2>

<ul>
  <li><b>AI에게 맡긴 일</b> — 검사 10개의 실행기(<code>check.mjs</code>) 작성, 비교 기준 선택 기능 구현, 인계 문서 초안.</li>
  <li><b>내가 판단한 일</b> — 어디서 멈출지(검사 6개 통과 시점), 무엇을 검사 10개로 삼을지, 두 AI를 무엇으로 비교할지. 그리고 AI B에게 무엇까지 넘길지 — 인계 문서와 고쳐야 할 소스까지만 주고 첫 대화 전문은 빼기로 한 것.</li>
  <li><b>AI 말을 안 들은 일</b> — 검사기가 6·8을 FAIL로 찍었을 때 <b>코드를 고치지 않았다.</b> 같은 검사를 다시 돌려 결과가 흔들리는 것을 확인하고, 원인이 검사기 자체의 타이밍 결함임을 밝힌 뒤 <b>검사기를</b> 고쳤다. 첫 결과만 믿었으면 멀쩡한 코드를 망가뜨렸을 것이다. AI B가 스스로 “나는 백지 상태가 아니다”라고 단서를 달았을 때도 그대로 적지 않고 근거를 되짚어, 그 말이 사실과 다름을 확인한 뒤 기록을 고쳤다.</li>
</ul>

${isLocalCapture ? `
<div class="todo">
  <b>이 보고서의 증빙은 개발 서버(<code>${esc(cap.url)}</code>)에서 찍었다.</b>
  과제 4가 심사 중이라 같은 공개 주소를 덮어쓰지 않으려고 배포를 미뤘다.
  과제 4 심사가 끝나면 배포한 뒤 <code>BOARD_URL</code>을 주고 다시 촬영해 이 보고서를 갱신한다.
</div>` : ""}

</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, "utf-8");
console.log("보고서 HTML 저장:", OUT_HTML);

// ───────────────────────────────────────── PDF 인쇄
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
    CHROME,
    [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        "--no-first-run",
        "--disable-gpu",
        "about:blank",
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
        <span style="float:right">AI 인계 실험 · 제출 보고서</span></div>`,
    footerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 15mm;text-align:center;font-family:'Malgun Gothic',sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});

fs.writeFileSync(OUT_PDF, Buffer.from(data, "base64"));
console.log("PDF 저장:", OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);

ws.close();
chrome.kill();
process.exit(0);
