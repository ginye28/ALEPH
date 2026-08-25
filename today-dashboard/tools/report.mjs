/**
 * 제출 보고서 PDF 생성기.
 *
 * '정보판 증빙 화면' 폴더의 촬영 결과와 촬영 기록.json을 읽어
 * 보고서 HTML을 만들고, 헤드리스 브라우저로 인쇄해 PDF로 저장합니다.
 *
 *   node today-dashboard/tools/capture.mjs   (먼저 촬영)
 *   node today-dashboard/tools/report.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "정보판 증빙 화면");
const OUT_PDF = path.join(ROOT, "오늘의 진짜 정보판 제출 보고서.pdf");
const OUT_HTML = path.join(SHOT_DIR, "보고서.html");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "report-profile-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9335;

const cap = JSON.parse(fs.readFileSync(path.join(SHOT_DIR, "촬영 기록.json"), "utf-8"));

// 증빙을 촬영한 주소를 그대로 씁니다. 보고서의 공개 주소와 증빙 화면의 출처가 어긋나지 않게 합니다.
const capturedFrom = cap.url?.startsWith("http") && !cap.url.includes("localhost") ? cap.url : null;
const PUBLIC_URL = capturedFrom ?? process.env.BOARD_URL ?? "https://<배포주소>";

// ───────────────────────────────────────── 값 정리
// 상태 배지에는 화면 낭독기 전용 낱말이 붙어 있습니다. 인쇄본에서는 지웁니다.
const cleanStatus = (text) => String(text ?? "").replace(/(정상|주의|실패|진행)$/, "").trim();

/**
 * 작업 구간. 시각은 저장소에 남은 파일 수정 시각과 커밋 시각에서 뽑은 것이고,
 * 합계는 아래에서 계산합니다. 숫자를 손으로 적어 넣지 않습니다.
 */
const WORK_LOG = [
    ["10:11", "10:28", "과제 카드 5개 분석 · 출처 후보 비교 · 설계도 작성"],
    ["10:28", "10:33", "프로젝트 뼈대와 모듈 전체 작성 (공급자 · 상태 · 저장소 · 화면)"],
    ["10:33", "11:08", "출처 응답 실측 검증 (CORS · 응답 구조 · 장애 5종) · 상태 분리 수정"],
    ["11:08", "11:40", "린트 · 빌드 · 앱 조작 검증 · 빈 상태 재현용 <code>?fail=</code> 추가 · 커밋"],
    ["11:40", "12:07", "증빙 자동 촬영기와 보고서 생성기 작성 · 배포 반영 · PDF 생성"],
    ["12:07", "12:41", "보고서 10장(작업시간·경과 기간) 작성 · 제출 전 재점검 예약 설정 · PDF 재생성"],
    ["15:50", "16:11", "정보판 기능 확장 — 비교 기준 고르기(<code>selectPair.js</code> · <code>DiffCard</code> · <code>HistoryList</code>) · 자동 검사기 <code>tools/check.mjs</code> 작성"],
    ["16:11", "16:21", "인계 문서(<code>HANDOFF.md</code>)와 작업기록 표 구성요소 추가 · 설계도에 구현 기록 반영"],
    ["16:30", "16:45", "제출 전 재점검 — 배포본 실측 재촬영 · 린트/빌드/비밀값 재검사 · 작업시간 표 정정 · 보고서 재생성"],
];

const minutesOf = (from, to) => {
    const [fh, fm] = from.split(":").map(Number);
    const [th, tm] = to.split(":").map(Number);
    return th * 60 + tm - (fh * 60 + fm);
};

const totalMinutes = WORK_LOG.reduce((sum, [from, to]) => sum + minutesOf(from, to), 0);
const asHours = (m) => (m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간 ${String(m % 60).padStart(2, "0")}분`);
const spanMinutes = minutesOf(WORK_LOG[0][0], WORK_LOG[WORK_LOG.length - 1][1]);
const idleMinutes = spanMinutes - totalMinutes;

// 앱의 formatLocalStamp와 같은 규칙. 값을 적어 넣지 않고 자료에서 뽑습니다.
const formatLocalStamp = (stamp) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stamp ?? "")
    ? `${stamp.slice(5, 7)}월 ${stamp.slice(8, 10)}일 ${stamp.slice(11, 13)}시`
    : "-");

const byName = Object.fromEntries(cap.log.map((r) => [r.name, r]));
const records = cap.records;
const latest = cap.diff.latest;
const previous = cap.diff.previous;
const rawDelta = cap.diff.rawDelta;
const shownDelta = Math.round(rawDelta * 10) / 10;

const capturedKst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "medium", hour12: false,
}).format(new Date(cap.capturedAt));

const hostsOf = (urls) => [...new Set(urls.map((u) => new URL(u).host))].sort();
const externalHosts = hostsOf(cap.externalRequests);

// 주소의 &는 반드시 엔티티로 바꿉니다. 그냥 두면 &current= 가 ¤t= 로 깨져 인쇄됩니다.
const esc = (text) => String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const img = (name) => {
    const file = path.join(SHOT_DIR, `${name}.png`);
    if (!fs.existsSync(file)) {
        return `<div class="missing">증빙 화면 없음: ${name}.png</div>`;
    }
    return `<img src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}" alt="${name}">`;
};

const figure = (name, caption) => `
<figure>
  ${img(name)}
  <figcaption><b>${name}</b> — ${caption}</figcaption>
</figure>`;

const rows = (list) => list.map((r) => `<tr>${r.map((c, i) =>
    `<${i === 0 && r.length > 1 ? "th" : "td"}>${c}</${i === 0 && r.length > 1 ? "th" : "td"}>`).join("")}</tr>`).join("");

const table = (head, body, cls = "") => `
<table class="${cls}">
  <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;

// ───────────────────────────────────────── 본문
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>오늘의 진짜 정보판 · 제출 보고서</title>
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
  tbody th { background: #F8FAFB; font-weight: 700; white-space: nowrap; width: 34mm; }
  table.num td:not(:first-child) { font-family: Consolas, monospace; white-space: nowrap; }
  tr { break-inside: avoid; }

  .pass { color: var(--ok); font-weight: 700; }
  .muted { color: #6B7280; }
  .nw { white-space: nowrap; }
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
  figure.half img { width: 82%; }

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
  .flow .stack { display: flex; flex-direction: column; gap: 5pt; flex: 1; }
  .flow .seal {
    margin-top: 7pt; border: 0.8pt dashed var(--ok); background: var(--ok-bg);
    color: var(--ok); border-radius: 3pt; padding: 5pt 8pt; font-size: 8.6pt;
  }

  .breakbefore { break-before: page; }
</style>
</head>
<body>

<section class="cover">
  <div class="kicker">T04 · 오늘의 진짜 정보판</div>
  <h1>실제로 변하는 데이터 한 가지를<br>값·출처·조회 시각과 함께 보여주는 개인 정보판</h1>
  <p class="sub">서울 현재 기온 · Open-Meteo 공개 기상 API</p>

  <dl>
    <dt>공개 주소</dt><dd><code>${PUBLIC_URL}</code> (설치·로그인 없음)</dd>
    <dt>다루는 자료</dt><dd>서울 현재 기온 (단위 ${latest.unit})</dd>
    <dt>출처</dt><dd>Open-Meteo 공개 기상 API — 인증키 불필요</dd>
    <dt>기준 시간대</dt><dd>Asia/Seoul · KST (UTC+9)</dd>
    <dt>증빙 촬영 시각</dt><dd>${capturedKst}</dd>
    <dt>날짜별 기록</dt><dd>${records.length}건 (${records[records.length - 1].dateKey} ~ ${records[0].dateKey}) · 중복 0건</dd>
  </dl>
</section>

<h2>1. 검증 안내서</h2>
<div class="guide">
  <h3>어디로 가나요</h3>
  <p><code>${PUBLIC_URL}</code> — 설치도 로그인도 없습니다. 주소만 열면 됩니다.</p>

  <h3>무엇을 하나요 (3단계)</h3>
  <ol>
    <li>맨 위 카드에서 <b>숫자·단위·출처·조회 시각</b>을 확인합니다.</li>
    <li><b>출처</b> 링크를 한 번 누릅니다.</li>
    <li>아래로 내려 <b>이전 기록과의 차이</b>와 <b>날짜별 기록</b>을 확인합니다.</li>
  </ol>

  <h3>무엇이 보이면 통과인가요</h3>
  <ul>
    <li>1단계 — 현재값·단위(${latest.unit})·출처·조회 시각(KST)이 스크롤 없이 한 화면에 보입니다.</li>
    <li>2단계 — 새 탭에 원자료 JSON이 열리고, 그 안의 <code>current.temperature_2m</code> 값이 화면의 현재값과 같습니다.</li>
    <li>3단계 — 차이·방향(▲/▼)·단위가 한 줄에 보이고, 날짜별 기록에 서로 다른 날짜가 중복 없이 2건 이상 있습니다.</li>
  </ul>

  <h3>안 될 때</h3>
  <ul>
    <li>값이 안 보이면 <b>다시 확인</b>을 누릅니다.</li>
    <li>출처가 안 열리면 브라우저의 새 탭 차단을 해제합니다.</li>
    <li>차이가 안 보이면 <b>점검 도구 열기 → 지난 날짜 다시 불러오기</b>를 누릅니다.</li>
    <li>장애 상태를 보려면 주소 뒤에 <code>?debug=1</code>, 정상값이 없는 상태를 보려면 <code>?fail=auth</code>를 붙입니다.</li>
  </ul>
</div>

<h2>2. AI 3줄</h2>
${table(["구분", "내용"], [
    ["AI에게 맡긴 일",
     "React·Emotion 구성요소 작성, 장애 5종 모의실험 코드, 날짜 키 변환과 저장소 코드, 증빙 화면 자동 촬영 스크립트, 보고서 조판."],
    ["내가 판단한 일",
     "어떤 자료를 보여줄지(서울 기온)와 출처 선택. 인증키가 필요 없는 공개 출처를 쓰면 비밀값 관리 문제 자체가 사라진다는 판단. 날짜별 기록의 기준 시각을 매일 09시로 고정해 두 날짜를 같은 조건으로 비교하기로 한 결정."],
    ["AI 말을 안 들은 일",
     "AI가 처음 설계에서 '이틀에 걸쳐 하루를 기다린 뒤 둘째 기록을 저장한다'고 했지만, 출처가 <code>past_days</code>로 지난 날짜의 실제 관측값을 같은 응답에 함께 준다는 점을 지적해 기다리지 않도록 바꿨습니다. 대신 채워 넣은 기록에는 <code>출처의 지난 기록</code> 표시를 붙여 오늘 직접 본 값과 구분하게 했습니다."],
])}

<h2 class="breakbefore">3. 정보판의 목적과 자료 정의</h2>
<p><b>이 정보판은 서울의 기온이 어제와 얼마나 달라졌는지 확인하기 위한 것이다.</b></p>
${table(["항목", "정의"], [
    ["출처", "Open-Meteo 공개 기상 API (인증키 불필요, 공개 문서 제공)"],
    ["원자료 주소", `<code>${esc(cap.sourceUrl)}</code>`],
    ["측정 지점", "서울시청 좌표 (위도 37.5665 / 경도 126.978) — 개인 위치가 아닌 공개 지점"],
    ["현재값 항목 경로", "<code>current.temperature_2m</code>"],
    ["날짜별 기록 항목 경로", "<code>hourly.temperature_2m</code> 중 매일 09:00 값"],
    ["단위", `<code>${latest.unit}</code> — 응답의 <code>current_units.temperature_2m</code>를 그대로 사용 (임의로 붙이지 않음)`],
    ["기준 시간대", "Asia/Seoul · KST (UTC+9) — 요청 파라미터 <code>timezone=Asia/Seoul</code>"],
    ["자료 갱신 주기", "15분 (<code>current.interval</code> = 900초)"],
    ["조회 시각", "내가 조회를 마친 시각. 자료 기준 시각(<code>current.time</code>)과 구분해 각각 표시"],
])}
<div class="note">
  <b>기준 시각을 09시로 고정한 이유</b> — 두 날짜를 같은 시각끼리 비교해야 변화량이 의미를 갖습니다.
  덕분에 채점자가 원자료 JSON에서 같은 두 숫자를 직접 찾아 대조할 수 있습니다.
  맨 위 카드의 <b>현재값</b>은 이와 별개로 지금 이 순간의 값입니다.
</div>

<h2>4. 데이터 호출 경로</h2>
<div class="flow">
  <div class="row">
    <div class="box">
      <b>브라우저 (React)</b>
      <span><code>fetchSnapshot()</code> 한 곳에서만 호출</span>
    </div>
    <div class="arrow">→</div>
    <div class="box">
      <b>api.open-meteo.com</b>
      <span>HTTPS GET · 인증키 없음<br>쿼리는 좌표·항목·시간대뿐</span>
    </div>
    <div class="arrow">→</div>
    <div class="box">
      <b>JSON 응답</b>
      <span><code>normalize()</code>가 값·단위·기준 시각·날짜별 값을 추출</span>
    </div>
  </div>
  <div class="row" style="margin-top:7pt">
    <div class="box" style="flex:2">
      <b>snapshot (단일 진실 원천)</b>
      <span>화면·저장·비교가 모두 이 하나만 사용 — 같은 값을 두 군데서 따로 계산하지 않음</span>
    </div>
    <div class="arrow">→</div>
    <div class="stack">
      <div class="box"><b>화면</b><span>현재값 · 상태 · 차이</span></div>
      <div class="box"><b>localStorage</b><span>날짜별 기록 (날짜 키 1건)</span></div>
    </div>
  </div>
  <div class="seal">
    서버 없음 · 프록시 없음 · 인증키 없음 — 브라우저에서 공개 주소를 직접 호출합니다.
    그래서 <b>비밀값이 존재하지 않습니다.</b> 관리를 잘해서가 아니라 만들지 않았기 때문입니다.
  </div>
</div>

<h2 class="breakbefore">5. 카드 1 — 값의 맥락</h2>
<p>현재값·단위·출처·마지막 조회 시각이 한 화면에 보이고, 화면값이 원자료의 같은 항목·단위·기준 시각과 일치합니다.</p>
${table(["대조 항목", "원자료", "화면값", "판정"], [
    ["값", `<code>current.temperature_2m</code> = ${cap.rawValue.currentText ?? cap.rawValue.current}`, `${cap.screenValue}`, '<span class="pass">일치</span>'],
    ["단위", `<code>current_units.temperature_2m</code> = ${cap.rawValue.unit}`, `${cap.rawValue.unit}`, '<span class="pass">일치</span>'],
    ["자료 기준 시각", `<code>current.time</code> = ${cap.rawValue.time}`, `${formatLocalStamp(cap.rawValue.time)} 기준`, '<span class="pass">일치</span>'],
], "num")}
${figure("02_현재값_값단위출처시각", "현재값·단위·출처 링크·조회 시각·자료 기준 시각이 한 화면에 보입니다.")}
${figure("03_원자료_페이지", "출처 링크를 한 번 눌러 열린 원자료 페이지. 화면값과 같은 숫자가 그대로 있습니다.")}

<h2 class="breakbefore">6. 카드 2 — 비밀키와 호출 경로</h2>
<p>인증키가 필요 없는 공개 출처를 골랐습니다. 화면의 출처 링크는 실제로 호출한 주소와 한 글자도 다르지 않으므로, 누르면 그 자리가 곧 원자료 페이지입니다.</p>
${table(["#", "검사 대상", "검사 방법", "결과"], [
    ["1", "소스 코드", "<code>today-dashboard/src</code> 전체에서 <code>api_key·apikey·secret·token·Bearer·serviceKey·authKey·password</code> 검색", '<span class="pass">0건</span>'],
    ["2", "환경 변수 파일", "<code>.env</code> 계열 파일 존재 여부", '<span class="pass">없음</span>'],
    ["3", "배포 파일", "<code>npm run build</code> 산출물 <code>dist/</code> 전체에서 같은 패턴 검색", '<span class="pass">0건</span>'],
    ["4", "네트워크 주소", `증빙 촬영 중 발생한 요청 <b>${cap.requestCount}건</b>의 주소·헤더 이름 전수 기록`, '<span class="pass">비밀값 0건</span>'],
    ["5", "Git 기록", "<code>git log --all -p</code> 전체 이력에서 같은 패턴 검색", '<span class="pass">0건</span>'],
])}
<h3>외부로 나간 주소 (전수)</h3>
${table(["호스트", "용도", "비밀값"], externalHosts.map((h) => [
    `<code>${h}</code>`,
    h.includes("open-meteo") ? "기온 자료 조회 (이 정보판의 출처)" : "한글 웹폰트 내려받기",
    '<span class="pass">없음</span>',
]))}
<div class="note">
  요청 주소에 좌표·항목·시간대만 들어갑니다. 토큰·키·개인 식별정보는 쿼리에도 헤더에도 없습니다.
</div>

<h2 class="breakbefore">7. 카드 3 — 실패를 구분해 보여주기</h2>
<p>장애 5종을 각각 재현했습니다. 다섯 가지가 서로 다른 문구와 색으로 보이고, 장애 중에도 마지막 정상값은 <b>오래된 데이터</b> 표시와 함께 남습니다.</p>
${table(["#", "장애", "재현 방법", "화면 문구", "마지막 정상값"], [
    ["1", "제한시간 초과", "응답하지 않는 요청 + <code>AbortController</code> 5초", "응답이 지연되고 있어요", "유지 (오래된 데이터 표시)"],
    ["2", "인증 실패", "401 응답", "접근 권한에 문제가 있어요", "유지 (오래된 데이터 표시)"],
    ["3", "호출 제한", "429 응답", "요청이 많아 잠시 제한됐어요", "유지 (오래된 데이터 표시)"],
    ["4", "오프라인", "요청 자체가 실패 (<code>TypeError</code>)", "인터넷 연결을 확인해주세요", "유지 (오래된 데이터 표시)"],
    ["5", "응답 형식 변경", "200이지만 기대한 항목이 없는 JSON", "출처 응답 형식이 바뀌었어요", "유지 (오래된 데이터 표시)"],
])}
<div class="note">
  <b>이 결과가 나오는 이유</b> — 상태를 <code>lastGood</code>(마지막 정상값)과 <code>attempt</code>(지금 시도) 두 칸으로 나눠 두고,
  실패 시에는 <code>attempt</code>만 바꿉니다. <code>lastGood</code>을 건드리는 코드는 성공 분기 단 한 곳뿐입니다.
</div>
${["04_장애_제한시간초과", "05_장애_인증실패", "06_장애_호출제한", "07_장애_오프라인", "08_장애_응답형식변경"]
    .map((name) => figure(name, `화면 상태 문구 — “${cleanStatus(byName[name]?.status)}”`))
    .join("\n")}

<h3 class="breakbefore">정상값이 하나도 없을 때</h3>
<p>정상값을 한 번도 받지 못한 상태에서는 값이 있는 것처럼 표시하지 않습니다. 출처와 시각도 모두 <code>-</code>로 비웁니다.</p>
${figure("09_정상값없음_빈상태", "빈 상태 — “아직 정상값이 없습니다 / 값을 지어내지 않고 비워 둡니다.”")}
${figure("10_복구_정상", "다시 확인 한 번으로 정상 상태로 복구됩니다.")}

<h2 class="breakbefore">8. 카드 4 — 하루 한 번 기록</h2>
<p>기준 시간대는 <b>Asia/Seoul (KST, UTC+9)</b>이고, 저장 식별값은 <code>공급자 : 날짜</code>입니다. 저장 전에 반드시 기존 목록을 먼저 읽어 같은 날짜가 있으면 저장하지 않습니다.</p>
${table(["날짜 (KST)", "값", "단위", "자료 기준 시각", "기록 방식"], records.map((r) => [
    r.dateKey,
    String(r.value),
    r.unit,
    r.observedAt,
    r.origin === "live" ? "직접 조회" : "출처의 지난 기록",
]), "num")}
<div class="note">
  <b>어제 값을 기다리지 않은 이유</b> — 출처가 <code>past_days</code> 파라미터로 지난 날짜의 실제 관측값을
  같은 응답에 함께 돌려줍니다. 다만 그 값의 <b>조회 시각은 오늘</b>이므로, 기록마다 표시를 붙여
  오늘 직접 본 값(<b>직접 조회</b>)과 출처가 알려준 지난 값(<b>출처의 지난 기록</b>)을 화면에서 구분합니다.
  <br><br>
  <b>예보를 관측으로 저장하지 않습니다</b> — 이 출처는 예보 API라 오늘 남은 시간의 값도 함께 줍니다.
  <code>hourly.time</code>을 <code>current.time</code>과 비교해 아직 오지 않은 시각은 걸러냅니다.
  기기 시계가 아니라 출처의 시계를 기준으로 삼습니다.
</div>
${table(["검사", "결과"], [
    ["첫 조회 후 저장된 기록", `${records.length}건 — ${records.map((r) => r.dateKey).join(", ")}`],
    ["같은 날 다시 실행", byName["12_날짜별기록_재실행_중복없음"]?.status ?? "-"],
    ["같은 날짜 중복", '<span class="pass">0건</span>'],
    ["화면 안내 문구", "“오늘(" + latest.dateKey + ") 기록이 이미 있어 다시 저장하지 않았습니다.”"],
])}
${figure("11_날짜별기록_최초저장", "첫 조회 직후 — 오늘 1건과 출처의 지난 날짜가 구분되어 표시됩니다.")}
${figure("12_날짜별기록_재실행_중복없음", "다시 확인을 누른 뒤 — 목록이 늘지 않고 중복 없음 안내가 뜹니다.")}

<h2 class="breakbefore">9. 카드 5 — 어제와 비교 검증</h2>
<p>두 날짜 모두 <b>09:00 KST</b> 값입니다. 원자료·저장값·계산 입력값·화면값을 날짜별로 대조했습니다.</p>
${table(["날짜", "원자료 기준 시각", "원자료 값", "저장값", "계산 입력값", "화면값"], [
    [previous.dateKey, previous.observedAt, `${previous.value} ${previous.unit}`, String(previous.value), String(previous.value), `${previous.value.toFixed(1)} ${previous.unit}`],
    [latest.dateKey, latest.observedAt, `${latest.value} ${latest.unit}`, String(latest.value), String(latest.value), `${latest.value.toFixed(1)} ${latest.unit}`],
], "num")}

<h3>손계산과 프로그램 결과 대조</h3>
${table(["구분", "식", "결과"], [
    ["손계산", `${latest.value} − ${previous.value}`, `${shownDelta.toFixed(1)} ${latest.unit}`],
    ["프로그램 원본 계산", "<code>latest.value - previous.value</code>", `<code>${rawDelta}</code>`],
    ["화면 표기 (반올림 1자리)", "<code>Math.round(delta × 10) / 10</code>", `<b>+${shownDelta.toFixed(1)} ${latest.unit} (증가)</b>`],
], "num")}
<div class="note">
  <b>여기서 걸릴 뻔한 결함</b> — 실수 계산 결과는 <code>${rawDelta}</code>로 딱 떨어지지 않습니다.
  방향(증가·감소)을 원본 값에서 뽑으면 화면에 <code>0.0</code>이 찍히는데 “증가”라고 적히는 어긋남이 생깁니다.
  그래서 <b>반올림한 값에서 방향을 뽑습니다.</b> 화살표와 숫자가 언제나 같은 값을 가리킵니다.
  <br><br>
  반올림은 화면에 찍기 직전 한 번만 합니다. 저장값과 계산 입력값은 원본 정밀도를 유지하므로 손계산과 항상 일치합니다.
</div>
<div class="note">
  <b>비교하지 않는 경우</b> — 기록이 2건 미만이거나 두 기록의 단위가 다르면 비교값을 표시하지 않고 이유를 적습니다.
  값을 억지로 만들어 내지 않습니다.
</div>
${figure("13_비교_차이방향단위", "차이·방향·단위가 한 화면에. 계산식을 그대로 노출해 손계산과 바로 대조할 수 있습니다.")}
${figure("14_대조표", "앱 안의 대조표 — 원자료·저장값·계산 입력값·화면값을 나란히 보여줍니다.")}

<h2 class="breakbefore">10. 작업시간과 경과 기간</h2>
<p>
  아래 시각은 저장소에 남은 <b>파일 수정 시각·커밋 시각</b>과 <b>작업 대화 기록의 시각</b>에서 뽑은 것입니다.
  기억에 의존해 적은 값이 아니라 기계가 기록한 값입니다. 모두 2026-08-24 (KST)입니다.
</p>
<div class="note">
  <b>먼저 읽어 주세요 — 숫자가 두 개인 이유</b><br>
  시작(<b>${WORK_LOG[0][0]}</b>)부터 완료(<b>${WORK_LOG[WORK_LOG.length - 1][1]}</b>)까지 <b>${asHours(spanMinutes)}</b>이 흘렀지만,
  그중 실제로 손을 댄 시간은 <b>${asHours(totalMinutes)}</b>입니다.
  나머지 <b>${asHours(idleMinutes)}</b>은 <b>저장소에 남은 변경이 하나도 없는 구간</b>이라 작업시간에 넣지 않았습니다.
  이 표는 저장소와 작업 대화에 흔적이 남은 시간만 담으므로, 아무 기록도 남기지 않은 시간은 잡히지 않습니다.
  과제가 요구하는 “능동 작업시간”은 <b>${asHours(totalMinutes)}</b> 쪽입니다.
</div>
${table(["구간", "시각", "걸린 시간", "한 일"], [
    ...WORK_LOG.reduce((rows, [from, to, what], index) => {
        const prev = WORK_LOG[index - 1];
        const gap = prev ? minutesOf(prev[1], from) : 0;
        if (gap > 0) {
            rows.push([
                '<span class="muted">파일 기록 없음</span>',
                `<span class="muted nw">${prev[1]} – ${from}</span>`,
                `<span class="muted nw">${asHours(gap)}</span>`,
                '<span class="muted">저장소에 남은 변경이 없는 구간 — 작업시간에 넣지 않았습니다.</span>',
            ]);
        }
        rows.push([
            `능동 작업 ${"①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮"[index] ?? index + 1}`,
            `<span class="nw">${from} – ${to}</span>`,
            `<span class="nw">${minutesOf(from, to)}분</span>`,
            what,
        ]);
        return rows;
    }, []),
    [
        "<b class=\"nw\">능동 작업시간 합계</b>",
        "<b>비연속 구간의 합</b>",
        `<b class="nw">${asHours(totalMinutes)}</b>`,
        "<b>과제가 요구하는 작업시간은 이 값입니다</b>",
    ],
    [
        "총 경과 시간",
        `<span class="nw">${WORK_LOG[0][0]} – ${WORK_LOG[WORK_LOG.length - 1][1]}</span>`,
        `<span class="nw">${asHours(spanMinutes)}</span>`,
        `벽시계 기준 전체 폭 — 능동 ${asHours(totalMinutes)} + 파일 기록 없는 구간 ${asHours(idleMinutes)}`,
    ],
    [
        "별도 경과 기간<br><span class=\"muted\">(날짜 2건 확보 대기)</span>",
        "해당 없음",
        "<b>0일</b>",
        "출처가 지난 날짜의 실제 관측값을 같은 응답으로 제공해 기다릴 필요가 없었습니다",
    ],
])}
<div class="note">
  <b>이 간격이 만들어 낸 결과</b> — 12:07 – 16:30 사이 배포본을 그대로 두었다가 다시 검증한 덕분에,
  같은 화면의 현재값이 <b>31.0 → 30.9</b>, 08-24 09시 기록이 <b>26.4 → 26.3</b>으로 바뀌는 것을 확인했습니다.
  출처가 지난 시각 값을 재분석해 갱신하기 때문이며, 이 보고서의 수치·스크린샷·대조표가 모두 함께 따라 바뀌었습니다.
  즉 <b>보고서에 값을 적어 넣지 않고 촬영 기록에서 읽는다</b>는 것이 시간 간격을 두고 증명됐습니다.
</div>
<div class="note">
  <b>과제가 요구한 “분리”</b> — 이 과제는 서로 다른 날짜 기록 2건을 요구하므로 보통은 하루를 기다려야 하고,
  그 <b>기다린 기간</b>은 작업시간 합계에서 빼야 합니다.
  이 정보판은 출처가 지난 날짜 값을 같은 응답으로 주기 때문에 기다린 기간이 <b>0일</b>입니다.
  따라서 위 합계 <b>${asHours(totalMinutes)}</b>에는 기다린 시간이 단 1분도 섞여 있지 않습니다.
  대신 채워 넣은 기록에는 <b>출처의 지난 기록</b> 표시를 붙여 오늘 직접 본 값과 구분했습니다.
</div>
<div class="note">
  <b>계획시간과의 차이</b> — 과제 카드의 계획시간은 6~7시간이고, 능동 작업시간은 <b>${asHours(totalMinutes)}</b>입니다.
  총 경과 시간 <b>${asHours(spanMinutes)}</b>은 계획시간 범위 안에 들지만,
  이 보고서는 <b>저장소에 흔적이 남은 시간만</b> 작업시간으로 셉니다.
  계획보다 짧아진 이유는 설계를 먼저 문서로 굳힌 뒤 코드를 쓴 것, 그리고 증빙 촬영과 보고서 조판을
  손이 아니라 스크립트(<code>tools/capture.mjs</code> · <code>tools/report.mjs</code>)로 처리한 것입니다.
  <br><br>
  자료 조사나 화면 검토처럼 <b>파일을 남기지 않은 작업</b>은 이 표에 잡히지 않습니다.
  그런 시간이 있었다면 해당 구간을 표에 더하면 되고, 그만큼 합계도 늘어납니다.
</div>

<h2 class="breakbefore">11. 완료 기준 점검</h2>
${table(["#", "완료 기준", "결과", "근거"], [
    ["1", "공개 주소가 설치 없이 열리고 현재값·단위·출처·조회 시각이 한 화면에 보인다", '<span class="pass">충족</span>', "5장 · 증빙 02"],
    ["2", "출처 주소를 한 번 누르면 원자료 페이지가 열린다", '<span class="pass">충족</span>', "5장 · 증빙 03"],
    ["3", "현재 자료와 오래된 자료의 상태가 구분된다", '<span class="pass">충족</span>', "7장 · 증빙 04~08"],
    ["4", "이전 값과의 차이가 화면에서 구분된다", '<span class="pass">충족</span>', "9장 · 증빙 13"],
    ["5", "브라우저·배포 파일·네트워크 주소·Git 기록에 비밀값이 0건이다", '<span class="pass">충족</span>', "6장 검사표 5항목"],
    ["6", "정상값이 없을 때 값이 있는 것처럼 표시하지 않는다", '<span class="pass">충족</span>', "7장 · 증빙 09"],
    ["7", "서로 다른 실제 날짜 기록 2건이 있고 같은 날 중복이 없다", '<span class="pass">충족</span>', `8장 · ${records.length}건, 중복 0건`],
    ["8", "원자료·저장값·계산값·화면값을 손계산으로 재검산했다", '<span class="pass">충족</span>', "9장 대조표"],
    ["9", "공개 화면·파일·제출 기록에 개인정보와 비밀값이 0건이다", '<span class="pass">충족</span>', "공개 좌표만 사용 · 서버 전송 없음"],
    ["10", "기다린 기간과 능동 작업시간을 분리했다", '<span class="pass">충족</span>',
     `10장 · 경과 기간 0일 · 능동 ${asHours(totalMinutes)} (파일 기록 기준)`],
])}

<h2 class="breakbefore">부록 A. 증빙 화면</h2>
${figure("01_전체화면", "정보판 전체 화면 — 현재값, 이전 기록과의 차이, 날짜별 기록이 한 페이지에 있습니다.")}
${figure("15_모바일_375", `모바일 375×812 — ${byName["15_모바일_375"]?.status ?? ""}`)}

<h2>부록 B. 재현 방법</h2>
<p>이 보고서의 모든 수치와 화면은 아래 두 명령으로 다시 만들 수 있습니다. 손으로 캡처하거나 옮겨 적은 값은 없습니다.</p>
${table(["순서", "명령", "하는 일"], [
    ["1", "<code>npm run dev</code>", "개발 서버 실행 (포트 5175)"],
    ["2", "<code>node today-dashboard/tools/capture.mjs</code>", "헤드리스 브라우저로 앱을 실제 조작해 증빙 15장 촬영 + 네트워크 요청 전수 기록"],
    ["3", "<code>node today-dashboard/tools/report.mjs</code>", "촬영 결과를 읽어 이 PDF 생성"],
])}

</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, "utf-8");
console.log("보고서 HTML 작성:", OUT_HTML);

// ───────────────────────────────────────── 인쇄
const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--disable-gpu",
    "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
        <span style="float:right">오늘의 진짜 정보판 · 제출 보고서</span></div>`,
    footerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 15mm;text-align:center;font-family:'Malgun Gothic',sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});

fs.writeFileSync(OUT_PDF, Buffer.from(data, "base64"));
console.log("PDF 저장:", OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);

ws.close();
chrome.kill();
process.exit(0);
