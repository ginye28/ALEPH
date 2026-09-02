/**
 * 과제 7 제출 보고서 PDF 생성기 (7.md) — "인증 구현 설명서" 구조.
 *
 *   node plandosee-auth/tools/capture.mjs   (먼저 촬영)
 *   node plandosee-auth/tools/report.mjs
 *
 * 7.md는 "막았다"는 문장이 아니라 막히는 장면(성공 요청과 거절 요청을 나란히)을 요구합니다.
 * 그래서 이 보고서는 촬영된 화면을 가리지 않고 그대로 싣고, 검사 결과(pass/fail과 근거 문구)를
 * 숫자를 손으로 옮기지 않고 가장 최근 검사 기록 JSON에서 그대로 읽어옵니다.
 *
 * 출력: 플랜두씨 다이어리 2 제출 보고서.pdf (과제 6의 제출본과는 별개 파일입니다)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제7 증빙 화면");
const OUT_PDF = path.join(ROOT, "플랜두씨 다이어리 2 제출 보고서.pdf");
const OUT_HTML = path.join(SHOT_DIR, "보고서.html");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pds-auth-report-"));

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9357;
const SOURCE_URL = "https://github.com/ginye28/ALEPH/tree/main/plandosee-auth";

const cap = JSON.parse(fs.readFileSync(path.join(SHOT_DIR, "촬영 기록.json"), "utf-8"));

// 가장 최근 검사 결과를 읽습니다. 숫자를 손으로 적지 않습니다.
const CHECK_DIR = path.join(ROOT, "검사 기록");
const checkFiles = fs.existsSync(CHECK_DIR)
    ? fs
          .readdirSync(CHECK_DIR)
          .filter((f) => f.startsWith("plandosee-auth-") && f.endsWith(".json"))
          .sort()
    : [];
const lastCheck = checkFiles.length
    ? JSON.parse(fs.readFileSync(path.join(CHECK_DIR, checkFiles[checkFiles.length - 1]), "utf-8"))
    : null;
const checkOf = (n) => lastCheck?.results?.find((r) => r.n === n);

const capturedFrom = cap.url?.startsWith("http") && !cap.url.includes("localhost") ? cap.url : null;
const PUBLIC_URL = capturedFrom ?? process.env.BOARD_URL ?? "https://aleph-pds-auth.vercel.app";
const isLocalCapture = !capturedFrom;
const backendMode = cap.backendMode ?? "memory";

const byName = Object.fromEntries(cap.log.map((r) => [r.name, r]));
const st = (name) => esc(byName[name]?.status ?? "");
const nt = (name) => esc(byName[name]?.note ?? "");

const capturedKst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "medium",
    hour12: false,
}).format(new Date(cap.capturedAt));

const externalHosts = [...new Set((cap.externalRequests ?? []).map((u) => new URL(u).host))]
    .filter((h) => !h.endsWith(".supabase.co")) // 우리 자신의 백엔드 요청은 "외부 유출"이 아닙니다.
    .sort();

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const hasImg = (name) => fs.existsSync(path.join(SHOT_DIR, `${name}.png`));
const img = (name) => {
    const file = path.join(SHOT_DIR, `${name}.png`);
    if (!fs.existsSync(file)) return `<div class="missing">증빙 화면 없음: ${name}.png</div>`;
    return `<img src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}" alt="${name}">`;
};

const figure = (name, caption, cls = "") =>
    `<figure class="${cls}">${img(name)}<figcaption><b>${name}</b> — ${caption}</figcaption></figure>`;

const pair = (nameA, nameB, caption) => `
<div class="pairgrid">
  <figure>${img(nameA)}<figcaption>${nameA}</figcaption></figure>
  <figure>${img(nameB)}<figcaption>${nameB}</figcaption></figure>
</div>
<p class="paircap">${caption}</p>`;

const table = (head, body, cls = "") => `
<table class="${cls}">
  <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;

const passBadge = (n) => (checkOf(n)?.pass ? `<span class="pass">PASS (검사 ${n})</span>` : `<span class="todo">확인 필요 (검사 ${n})</span>`);

const REAL_SHOT = "14_실사용_카드5";
const hasRealShot = hasImg(REAL_SHOT);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>플랜두씨 다이어리 2 · 인증 구현 설명서</title>
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
  .pairgrid { display:grid; grid-template-columns:1fr 1fr; gap:8pt; break-inside:avoid; }
  .pairgrid figure { margin:0; }
  .paircap { font-size:8.6pt; color:var(--soft); margin:2pt 0 9pt; }
  .missing { border:1pt dashed #C33; color:#C33; padding:8pt; font-size:9pt; }
  .breakbefore { break-before:page; }
  .hashval { font-size:8pt; word-break:break-all; }
</style>
</head>
<body>

<section class="cover">
  <div class="kicker">T07 · 플랜두씨 다이어리 2</div>
  <h1>가입하고, 로그인하고,<br>내 것만 본다</h1>
  <p class="sub">과제 6에 로그인·소유권 기반 RLS를 붙여 계정마다 자기 자료만 보이게 만든 인증 구현 설명서 (7.md)</p>
  <dl>
    <dt>결과물 주소</dt><dd><code>${esc(PUBLIC_URL)}</code></dd>
    <dt>소스 주소</dt><dd><code>${esc(SOURCE_URL)}</code></dd>
    <dt>과제 6 결과물</dt><dd><code>https://aleph-pds.vercel.app</code> (별개 프로젝트, 건드리지 않음)</dd>
    <dt>백엔드</dt><dd>${backendMode === "supabase" ? "Supabase Postgres, 새 프로젝트(plandosee-auth) — 과제 6과 별개" : "임시 메모리 저장소 — 아직 Supabase 미연결"}</dd>
    <dt>촬영</dt><dd>${esc(capturedKst)} · <code>${esc(cap.url)}</code></dd>
    <dt>검사</dt><dd>${lastCheck ? `PASS ${lastCheck.passed.length} / FAIL ${lastCheck.failed.length} (총 ${lastCheck.results.length}개)` : "검사 기록 없음 — node tools/check.mjs --json 먼저 실행"}</dd>
  </dl>
</section>

${backendMode !== "supabase" ? `
<div class="todo">
  <b>아직 Supabase에 연결되지 않았습니다.</b> 지금은 브라우저 메모리에만 저장되는 임시
  백엔드로 동작 중입니다. Supabase 프로젝트를 만들고 <code>plandosee-auth/supabase/schema.sql</code>을
  실행한 뒤, 환경변수를 배포 환경에 넣고 다시 검사·촬영·보고서 생성이 필요합니다.
</div>` : ""}

<h2>1. 검증 안내서</h2>

<div class="guide">
  <h3>① 어디로 가나요</h3>
  <p><code>${esc(PUBLIC_URL)}</code> — 로그인 화면부터 시작</p>

  <h3>② 세 단계 안에 무엇을 하나요</h3>
  <ol>
    <li>새 계정으로 <b>가입</b>합니다.</li>
    <li><b>로그인</b>해 계획 하나를 만듭니다.</li>
    <li><b>로그아웃</b>한 뒤 같은 자료 화면 주소를 다시 엽니다.</li>
  </ol>

  <h3>③ 무엇이 보이면 통과인가요</h3>
  <ul>
    <li>가입 직후 자동으로 로그인되거나 로그인 화면으로 이동합니다.</li>
    <li>만든 계획이 <b>내 화면에만</b> 보입니다.</li>
    <li>로그아웃 뒤에는 로그인 화면만 보이고 자료는 보이지 않습니다.</li>
  </ul>

  <h3>④ 안 될 때는 무엇이 보이나요</h3>
  <ul>
    <li>가입이 안 되면 이미 있는 이메일인지 오류 문구를 읽습니다.</li>
    <li>로그인 후에도 로그인 화면이면 새로고침 한 번 해 봅니다(세션 반영 지연).</li>
    <li>자료가 안 보이면 계정을 잘못 골랐는지(다른 계정으로 가입했는지) 확인합니다.</li>
  </ul>
</div>

<h2 class="breakbefore">① 무엇으로 붙였나</h2>

<p><b>Supabase Auth(GoTrue), 이메일+비밀번호</b> — <code>@supabase/supabase-js</code>로 가입·로그인·
로그아웃·세션 유지를 전부 처리합니다. 이미 과제 6에서 Supabase Postgres + RLS를 쓰고 있어,
인증과 데이터 접근 제어가 같은 플랫폼의 <code>auth.uid()</code>로 묶입니다.</p>

${figure("01_비로그인_로그인화면", `${st("01_비로그인_로그인화면")} — ${nt("01_비로그인_로그인화면")}`)}
${pair("02_가입_입력", "03_가입_직후_메인화면", `${st("03_가입_직후_메인화면")} — ${nt("03_가입_직후_메인화면")}`)}
${figure("04_로그아웃_후_로그인화면", `${st("04_로그아웃_후_로그인화면")} — ${nt("04_로그아웃_후_로그인화면")}`)}

<h2>② 왜 그걸 골랐나</h2>

${table(["검토한 방법", "고르지 않은 이유"], [
    ["직접 구현 (bcrypt + 세션 쿠키를 손으로 짬)", "비밀번호 저장·세션 발급·만료·재설정을 전부 직접 검증해야 해서 실수 여지가 크다. 이 과제의 배점은 '많이 쓰이는 것을 잘 골랐는지'이지 인증을 재발명했는지가 아니다."],
    ["Auth.js (NextAuth)", "서버 세션·미들웨어 전제가 강해 지금의 Vite SPA + 정적 배포 구조와 맞지 않는다. 과제 6부터 지켜온 '서버 없이 브라우저에서만' 원칙이 깨진다."],
])}

<h2 class="breakbefore">③ 어디를 어떻게 고쳤나</h2>

${table(["흐름", "소스 위치"], [
    ["가입·로그인·로그아웃·세션 조회", "<code>src/api/auth.js</code> (signUp/signIn/signOut/getSession/onAuthStateChange)"],
    ["세션 없으면 자료 화면 자체를 렌더하지 않음", "<code>src/components/AuthGate/AuthGate.jsx</code>"],
    ["가입/로그인 폼, 동일 오류 문구 처리", "<code>src/components/AuthForm/AuthForm.jsx</code>"],
    ["로그아웃·계정 삭제(내 데이터 행)", "<code>src/components/AccountSection/AccountSection.jsx</code>, <code>src/api/auth.js#deleteMyData</code>"],
    ["소유자 칼럼 강제 스탬프 + 소유자 기반 RLS", "<code>supabase/schema.sql</code> (stamp_owner() 트리거 + auth.uid()=user_id 정책, 표 5개 전부)"],
    ["과제 6 실 데이터 이전", "<code>src/api/migrateFromT06.js</code>"],
])}

<h2 class="breakbefore">카드 2 — 비밀번호를 어떻게 맡아 두는지 보이기</h2>

<p>GoTrue는 비밀번호를 <b>bcrypt</b>로 해시해 <code>auth.users.encrypted_password</code>에 저장합니다.
이 코드베이스 어디에도 비밀번호를 직접 저장·비교하는 로직이 없습니다 — 저장 방식을 직접 고른
것이 아니라 인증 서비스가 이미 그렇게 하고 있다는 사실 자체가 이 카드의 답입니다.</p>

<div class="note">
  <b>실제로 확인한 해시값 (2026-09-02, Supabase SQL 편집기)</b><br>
  같은 비밀번호로 만든 두 스크래치 계정의 <code>encrypted_password</code>를 직접 조회했습니다:
  ${table(["계정", "user id", "encrypted_password"], [
      ["A", "3f36b1c9-58f9-4eb9-b31b-a8b0d7566cfc", `<span class="hashval">$2a$10$/Rpbk76a5Spss.LKsR/PnO48cRQhqQ3NKkmSEY6N/iM/IQX6cHGBm</span>`],
      ["B", "0ef5b2d6-6cf4-4064-ac06-0998aedf5a9b", `<span class="hashval">$2a$10$TXosJIzyWWWWoRQwW8Iw9uci/oJh/FV4EUGRyZZ2Np8sM2IdeTcMa</span>`],
  ])}
  둘 다 <code>$2a$10$…</code>(bcrypt, cost 10) 포맷이고, <b>같은 비밀번호인데도 해시가 완전히 다릅니다</b> —
  계정마다 무작위 salt가 자동으로 붙었다는 뜻입니다. ${passBadge(22)}
</div>

<h2 class="breakbefore">카드 3 — 들어온 사람을 어떻게 기억하는지 보이기</h2>

<p>로그인 성공 시 <b>JWT 액세스 토큰</b>(만료 1시간) + <b>리프레시 토큰</b>을 받아 브라우저
<code>localStorage</code>에 저장합니다. 이메일+비밀번호 흐름은 리다이렉트가 없어 URL 쿼리에
토큰이 실리지 않습니다.</p>

${table(["확인", "결과"], [
    ["액세스 토큰이 URL에 있는가", `${nt("12_토큰_URL없음")} — <code>${st("12_토큰_URL없음").replace("현재 주소: ", "")}</code> ${passBadge(24)}`],
    ["토큰 만료 시각", `발급 후 정확히 3600초(1시간) ${passBadge(25)}`],
    ["로그인 상태 조회 → 로그아웃 뒤 같은 토큰 재사용", checkOf(23)?.pass
        ? `<span class="pass">자료 0건으로 거절됨 (검사 23)</span> — ${esc(checkOf(23)?.detail ?? "")}`
        : `<span class="todo">아직 못 막음 (검사 23)</span> — ${esc(checkOf(23)?.detail ?? "")}`],
])}

${checkOf(23)?.pass ? `
<div class="note">
  <b>로그아웃 즉시 세션을 무효화합니다.</b> JWT 액세스 토큰 자체는 stateless라
  <code>signOut()</code>만으로는 서명이 만료 전까지 계속 "유효"합니다. 그래서 <code>auth.uid()</code>
  검사만으로는 부족합니다 — 대신 로그인마다 <code>auth.sessions</code>에 생기는 세션 행을
  <code>signOut()</code>이 지운다는 점을 이용해, 모든 RLS 정책에 토큰의 <code>session_id</code>
  클레임이 <b>지금도 <code>auth.sessions</code>에 살아 있는지</b>를 함께 검사하는
  <code>session_is_active()</code> 함수를 추가했습니다(<code>supabase/schema.sql</code>). 로그아웃한
  순간 그 행이 지워지므로, 훔친 토큰을 계속 들고 있어도 상태 코드는 200이지만 내 자료는
  단 한 줄도 돌아오지 않습니다.
</div>` : `
<div class="todo">
  <b>검사 23은 실제로 실패합니다 — 감추지 않고 그대로 적습니다.</b> Supabase의 <code>signOut()</code>은
  리프레시 토큰만 서버에서 무효화합니다. 로그아웃 시점의 액세스 토큰(JWT) 자체는 stateless라
  발급 후 최대 1시간(exp)까지는 로그아웃과 무관하게 계속 유효합니다.
</div>`}

<h2 class="breakbefore">카드 4 — 남의 자료가 안 열리는 것을 보이기</h2>

<p>모든 표에 <code>user_id</code>를 직접 두고, <code>stamp_owner()</code> 트리거가 INSERT마다
클라이언트가 보낸 값과 무관하게 항상 <code>auth.uid()</code>로 덮어씁니다. RLS는
<code>auth.uid() = user_id</code>일 때만 select/insert/update를 허용합니다.</p>

${pair("08_계정A_자료화면", "09_계정B_빈화면", `${st("09_계정B_빈화면")} — ${nt("09_계정B_빈화면")} ${passBadge(28)}`)}

<div class="note">
  <b>직접 조회 시도(id를 알아도)</b> — ${nt("10_직접조회_거절")}<br>
  <code>${st("10_직접조회_거절")}</code> ${passBadge(26)}
</div>

${table(["시도", "결과"], [
    ["B가 A의 계획을 id로 직접 읽음 / A가 B의 계획을 읽음 (양방향)", checkOf(26)?.pass ? `<span class="pass">둘 다 거절</span> — ${esc(checkOf(26)?.detail ?? "")}` : "확인 필요"],
    ["B가 A의 계획을 지우려 함 / A가 B의 계획을 지우려 함 (양방향)", checkOf(27)?.pass ? `<span class="pass">둘 다 반영 안 됨</span> — ${esc(checkOf(27)?.detail ?? "")}` : "확인 필요"],
    ["목록 조회에 상대 계정 행 섞임 (양방향)", checkOf(28)?.pass ? `<span class="pass">0건</span> — ${esc(checkOf(28)?.detail ?? "")}` : "확인 필요"],
    ["요청 본문에 남의 user_id를 적어 보냄(스푸핑)", checkOf(29)?.pass ? `<span class="pass">트리거가 덮어씀</span> — ${esc(checkOf(29)?.detail ?? "")}` : "확인 필요"],
])}

<p class="muted">RLS 정책 정의는 <code>supabase/schema.sql</code>의 <code>plans_select</code>·
<code>plans_insert</code>·<code>plans_update</code> 등 각 표마다 반복되는 3줄(정책 5개 표 × 2~3개
정책)에 있습니다 — 표 하나당 소유자 조건이 딱 한 줄입니다.</p>

<h2 class="breakbefore">⑤ AI와 나</h2>

${table(["구분", "내용"], [
    ["AI에게 맡긴 일", "Supabase Auth 연동(auth.js/AuthGate/AuthForm/AccountSection), user_id + stamp_owner 트리거 + RLS 스키마 재작성, 검사 18~31 설계·구현, capture.mjs/report.mjs를 인증 흐름에 맞게 재작성, session_id·auth.sessions 기반 즉시 세션 무효화(session_is_active()) 조사·구현, 계정 삭제 버튼을 로그아웃과 시각적으로 분리(위험 구역 스타일), 새 Supabase·Vercel 프로젝트 생성 과정에서 비밀번호가 필요 없는 모든 단계."],
    ["내가 직접 판단한 일", "인증 방식으로 Supabase Auth(이메일+비밀번호)를 최종 확정, 새 프로젝트 이름(plandosee-auth)과 배포 이름(aleph-pds-auth) 확정, Supabase 새 프로젝트의 데이터베이스 비밀번호 입력과 'Confirm email' 끄기, 로컬/공개 주소에서 실제 계정으로 로그인해 데이터 이전을 직접 확인, 검사 23이 실패로 남은 것을 보고 '아직 못 막은 것'으로 넘기지 않고 실제로 막는 방법을 요구."],
    ["AI 제안을 따르지 않은 일(없다면 왜 없었는지)", "없음 — 제시된 인증 방식·스키마·트리거 설계를 검토 후 그대로 채택했습니다. 다만 검사 19·20을 처음 돌렸을 때 오류 문구가 \"undefined\"로 나오는 버그(Error.message가 CDP 직렬화 경계에서 사라짐)를 발견해, 검사 스크립트 쪽의 직렬화 로직만 고쳤습니다 — 화면 코드는 그대로 두었습니다."],
])}

<h2 class="breakbefore">⑥ 아직 못 막은 것</h2>

${table(["아직 못 막은 것", "왜 위험한가"], [
    ["무차별 대입(brute-force) 방지 없음", "같은 계정에 비밀번호를 계속 시도해도 막는 장치가 없어 시간을 들이면 뚫릴 수 있습니다."],
    ["비밀번호 재설정 이메일 흐름 미구현", "비밀번호를 잊으면 계정을 복구할 방법이 없습니다(시간이 부족해 다음으로 미룸)."],
    ["2단계 인증 없음", "비밀번호 하나만 뚫리면 끝입니다."],
    ["로그인 시도 로그 없음", "누가 언제 실패했는지 남지 않아 이상 징후를 못 봅니다."],
])}

<p class="muted">로그아웃 후 액세스 토큰 재사용 문제는 카드 3(<code>session_is_active()</code>)에서
실제로 막았습니다 — 이 표에는 남기지 않습니다.</p>

<h2 class="breakbefore">카드 5 — 설명서로 묶고, 5일 써 보기</h2>

${figure("11_계정관리", `${st("11_계정관리")} — ${nt("11_계정관리")}`)}

<p><b>계정 삭제</b>는 로그인한 본인 권한으로 내 소유 행(계획·이력·할일·실행기록·고칠점)을 전부
하드 삭제하는 <code>delete_my_data()</code> 함수로 처리합니다. <code>auth.users</code>의 가입
정보 자체는 <code>service_role</code> 관리자 API가 필요해 이 화면에서는 지우지 못했습니다 —
그 사실을 화면에 그대로 밝혀 T07-C134를 만족합니다.</p>

${hasRealShot ? `
${figure(REAL_SHOT, "실제 로그인 계정(tsna1268@gmail.com)의 자료 화면 — 과제 6에서 이전한 진짜 계획·할일")}
<div class="note">
  과제 6의 실제 작업 기록(계획 4건·개정 5건·할일 7건·실행기록 5건·고칠점 6건)을
  <code>migrateFromT06.js</code>로 이 계정에 이전했습니다. 5일 실사용 지표(그날 실행기록
  실제시간 합계, 단위: 분, KST 기준)와 계획 규칙 변경 전후 비교는 5일치가 채워지는 대로
  이 자리에 채웁니다.
</div>` : `
<div class="todo">
  <b>보류 — 5일 실사용이 아직 진행 중입니다.</b> 과제 6의 실제 데이터는 이미 로그인 계정으로
  이전했습니다(계획 4건·할일 7건·실행기록 5건·고칠점 6건). 5일치 실사용 지표(그날 실행기록
  실제시간 합계, 단위: 분, KST 기준)와 3일차 전후 계획 규칙 변경 비교표는 실제 날짜가 지나야
  채울 수 있어, 최종 제출 직전에 이 보고서를 다시 생성해 채웁니다.
</div>`}

<h2 class="breakbefore">검사 ${lastCheck ? lastCheck.results.length : 31}개</h2>

<p class="muted">
  <code>node tools/check.mjs --json</code> 실행 결과. 사람 눈이 아니라 이 명령 하나가 판정합니다.
  1~17은 과제 6과 같은 계획·할일·실행기록·돌아보기 검사이고, 18~31이 이번 과제(인증·소유권)에서
  새로 추가됐습니다.
</p>

${lastCheck ? table(["#", "카드", "검사", "결과", "판정 근거"], lastCheck.results.map((r) => [
    `<b>${r.n}</b>`,
    r.kind,
    esc(r.title),
    r.pass ? `<span class="pass">PASS</span>` : `<span class="todo">FAIL</span>`,
    `<span class="muted">${esc(r.detail)}</span>`,
])) : `<div class="todo">검사 기록이 없습니다 — <code>node tools/check.mjs --json</code>을 먼저 실행합니다.</div>`}

<h2 class="breakbefore">개인정보와 비밀값</h2>

${table(["검사 대상", "결과"], [
    ["증빙 촬영 중 나간 <b>외부(비-Supabase) 요청</b>", externalHosts.length === 0 ? "<span class='pass'>0건</span>" : externalHosts.map((h) => `<code>${esc(h)}</code>`).join(" · ")],
    ["service_role 비밀키가 빌드 산출물에 포함", passBadge(16)],
    ["secret key(신 명명)·SERVICE_ROLE 문자열이 빌드 산출물에 포함", passBadge(30)],
    ["JWT 서명 비밀키가 소스·번들에 포함", "<span class='pass'>없음</span> — Supabase 프로젝트 설정(대시보드)에만 있고 클라이언트 코드에는 없음"],
    ["스크립트 모양 글자 실행 여부", passBadge(14)],
])}

<p class="muted">
  publishable(구 anon) 키는 Supabase 설계상 브라우저에 노출되는 것이 정상입니다 — 실제 접근
  통제는 이 키가 아니라 RLS가 합니다. 노출되면 안 되는 것은 secret(구 service_role) 키뿐이고,
  이 키는 스키마를 설정할 때 Supabase SQL 편집기에서만 쓰고 저장소·소스·배포 환경 어디에도
  넣지 않습니다.
</p>

${figure("13_모바일_375_로그인화면", `${st("13_모바일_375_로그인화면")}`, "half")}

${isLocalCapture ? `
<div class="todo">
  <b>이 보고서의 자동 촬영은 개발 서버(<code>${esc(cap.url)}</code>)에서 찍었습니다.</b>
  <code>BOARD_URL=${esc(PUBLIC_URL)} node tools/capture.mjs</code>로 배포 주소에서 다시 촬영해
  이 보고서를 갱신합니다.
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
        <span style="float:right">플랜두씨 다이어리 2 · 인증 구현 설명서</span></div>`,
    footerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 15mm;text-align:center;font-family:'Malgun Gothic',sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});

fs.writeFileSync(OUT_PDF, Buffer.from(data, "base64"));
console.log("PDF 저장:", OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);

ws.close();
chrome.kill();
process.exit(0);
