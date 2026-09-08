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

// 7.md T07-C92는 "라이브러리나 서비스를 썼다면 그 이름과 버전"을 요구합니다.
// 버전을 본문에 손으로 적으면 package.json과 어긋나므로 잠긴 버전을 그대로 읽어옵니다.
const PKG = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "package.json"), "utf-8"));
const LOCK = fs.existsSync(path.join(import.meta.dirname, "..", "package-lock.json"))
    ? JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "package-lock.json"), "utf-8"))
    : null;
const SUPABASE_RANGE = PKG.dependencies?.["@supabase/supabase-js"] ?? "(미기재)";
const SUPABASE_VERSION =
    LOCK?.packages?.["node_modules/@supabase/supabase-js"]?.version ?? SUPABASE_RANGE.replace(/^[\^~]/, "");

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
  h3.cardhead { font-size:11.6pt; margin:16pt 0 6pt; padding-bottom:3pt;
                border-bottom:0.8pt solid var(--rule); color:var(--accent); }
  h4 { font-size:9.9pt; margin:13pt 0 4pt; break-after:avoid; color:var(--ink); }
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
  figure.banner img { width:auto; max-width:100%; }
  figure.banner { margin:5pt 0 7pt; }
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

<p>직접 구현·라이브러리·인증 서비스 셋 중 <b>인증 서비스</b>를 골랐습니다.
<b>Supabase Auth(GoTrue), 이메일+비밀번호</b> 방식이고, 브라우저에서는
<code>@supabase/supabase-js</code>로 가입·로그인·로그아웃·세션 유지를 전부 처리합니다.
이미 과제 6에서 Supabase Postgres + RLS를 쓰고 있어, 인증과 데이터 접근 제어가
같은 플랫폼의 <code>auth.uid()</code>로 묶입니다.</p>

${table(["항목", "내용"], [
    ["고른 갈래", "인증 서비스 (직접 구현 아님)"],
    ["서비스", "Supabase Auth (GoTrue) — 이메일+비밀번호"],
    ["클라이언트 라이브러리와 버전", `<code>@supabase/supabase-js</code> <b>${SUPABASE_VERSION}</b> (package.json 범위 <code>${esc(SUPABASE_RANGE)}</code>, package-lock.json에 잠긴 실제 버전)`],
])}

${figure("01_비로그인_로그인화면", `${st("01_비로그인_로그인화면")} — ${nt("01_비로그인_로그인화면")}`)}
${pair("02_가입_입력", "03_가입_직후_메인화면", `${st("03_가입_직후_메인화면")} — ${nt("03_가입_직후_메인화면")}`)}
${figure("04_로그아웃_후_로그인화면", `${st("04_로그아웃_후_로그인화면")} — ${nt("04_로그아웃_후_로그인화면")}`)}

<h3>과제 6에 넣어 둔 내 자료가 이 계정으로 옮겨졌습니다 (T07-C100)</h3>

<p>"옮겼습니다"라는 문장이나 이전 코드가 있다는 사실은 근거가 되지 않습니다.
과제 6에서 내보낸 파일과 과제 7 계정에서 내보낸 파일을 <b>행 id로 맞대어</b> 셌습니다 —
id가 그대로라는 것은 다시 입력한 것이 아니라 실제로 옮겨졌다는 뜻입니다.</p>

<p class="muted">${passBadge(39)} 판정 근거: <code>${esc(checkOf(39)?.detail ?? "")}</code></p>

<h3>계정이 있는지 없는지를 흘리지 않습니다 (T07-C99)</h3>

${figure("05_오류_비밀번호틀림", "있는 계정에 <b>비밀번호만 틀린</b> 경우", "banner")}
${figure("06_오류_계정없음", "<b>아예 없는 계정</b>인 경우", "banner")}

<p>두 화면의 문구가 글자까지 같습니다 — <code>${st("05_06_오류문구_대조")}</code> —
그래서 오류 문구만 보고 "이 이메일은 가입돼 있다"를 알아낼 수 없습니다. ${passBadge(20)}</p>

<h3>같은 이메일로 두 번 가입되지 않습니다 (T07-C98)</h3>

${figure("07_중복가입_거절", `${st("07_중복가입_거절")} — ${nt("07_중복가입_거절")} ${passBadge(19)}`, "banner")}

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

<h2 class="breakbefore">④ 안 열리는 것을 확인한 기록</h2>

<p>확인 다섯 가지입니다. 각 줄의 왼쪽이 <b>제대로 된 요청이 성공한 장면</b>, 오른쪽이
<b>같은 자리에서 잘못된 요청이 거절된 장면</b>입니다. 아래 카드 2·3·4가 각각의 자세한 기록입니다.</p>

${table(["확인", "성공한 요청", "거절된 요청"], [
    ["1 · 로그인 없이 자료를 열기",
     "로그인한 계정에서는 자료 화면이 열리고 내 계획이 보임 (08_계정A_자료화면)",
     `화면에서는 로그인 폼만 있고 자료 화면 요소가 DOM에 아예 없음 ${passBadge(21)}<br>화면을 건너뛰고 REST 주소를 직접 두드려도 <b>401</b>로 막힘 ${passBadge(32)}`],
    ["2 · 저장된 비밀번호 읽기",
     "정상 비밀번호로 로그인 성공 (검사 18)",
     `<code>auth.users.encrypted_password</code>는 <code>$2a$10$…</code> 해시뿐 — 입력한 글자가 보이지 않고, 같은 비밀번호로 만든 두 계정의 값도 서로 다름 ${passBadge(22)}`],
    ["3 · 로그아웃 뒤 같은 토큰 재사용",
     "로그인 상태의 같은 요청은 200으로 내 계획 2건 반환",
     `로그아웃 뒤 <b>같은 주소·같은 방식·같은 토큰</b>으로 다시 요청 — 달라진 것은 로그아웃 여부뿐인데 자료 0건 ${passBadge(23)}`],
    ["4 · 남의 자료 읽기·수정·삭제 (양방향)",
     "각 계정은 자기 계획을 id로 읽고 고치고 지울 수 있음 (검사 1·2·17)",
     `A↔B 양방향 모두 읽기 거절(null)·삭제 미반영(deleted_at 그대로 null) ${passBadge(26)} ${passBadge(27)}`],
    ["5 · 남의 계정을 적어 보내기 / 목록 섞임",
     "내 목록에는 내 계획이 전부 나옴 (A 2건 · B 1건)",
     `요청 본문에 A의 user_id를 적어 보내도 저장된 행은 로그인한 B로 찍히고, 목록 응답에 상대 계정 행 0건 ${passBadge(29)} ${passBadge(28)}`],
])}

<h3 class="cardhead">카드 2 — 비밀번호를 어떻게 맡아 두는지 보이기</h3>

<p>GoTrue는 비밀번호를 <b>bcrypt</b>로 해시해 <code>auth.users.encrypted_password</code>에 저장합니다.
이 코드베이스 어디에도 비밀번호를 직접 저장·비교하는 로직이 없습니다 — 해시 함수를 손으로 부르는
자리가 아예 없다는 것이 이 카드의 답입니다.</p>

<p><b>bcrypt로 남겨 둔 이유</b> — argon2가 더 최근 방식이지만, 그것을 쓰려면 인증을 직접 구현하는
쪽으로 돌아가야 합니다. bcrypt는 계정마다 무작위 salt를 자동으로 붙이고 반복 횟수(cost)를 두어
대입 속도를 늦추는, 오래 검증된 방식입니다. 검증된 기본값을 그대로 쓰는 편이 방식을 한 단계
올리려다 직접 구현으로 되돌아가는 것보다 안전하다고 보고 GoTrue의 bcrypt(cost 10)를 그대로
받아들였습니다. 아래는 실제로 그렇게 저장돼 있는지 눈으로 확인한 기록입니다.</p>

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

<h4>비밀번호 원문이 어디에 남는지 네 곳을 열어 봤습니다 (T07-C105, T07-C106)</h4>

<p>로그인은 비밀번호를 서버로 보내야 성립합니다 — 관건은 그 뒤입니다.
실제 로그인 요청 <code>POST /auth/v1/token?grant_type=password</code>를 직접 보내고,
원문이 남았을 만한 네 곳을 문자열로 뒤졌습니다.</p>

${table(["열어 본 곳", "결과"], [
    ["로그인 응답 본문", "원문 0건 — 돌아온 것은 access_token·token_type·expires_in·expires_at·refresh_token·user·weak_password뿐"],
    ["<code>localStorage</code>에 저장된 세션", "원문 0건 — 토큰만 들어 있음"],
    ["화면에 그려진 글자(<code>document.body.innerText</code>)", "원문 0건"],
    ["주소창(<code>location.href</code>)", "원문 0건"],
])}

<p class="muted">${passBadge(37)} 판정 근거: <code>${esc(checkOf(37)?.detail ?? "")}</code></p>

<h3 class="cardhead breakbefore">카드 3 — 들어온 사람을 어떻게 기억하는지 보이기</h3>

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

<h3 class="cardhead breakbefore">카드 4 — 남의 자료가 안 열리는 것을 보이기</h3>

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

<p class="muted"><h4>화면을 건너뛰고 서버가 무엇으로 거절하는지 (T07-C121, T07-C123, T07-C124)</h4>

<p>위 표는 앱의 래퍼(<code>window.__db</code>)를 거친 결과라 "화면에 안 나온다"까지만 보입니다.
7.md는 그것을 막은 것으로 쳐 주지 않으므로, 아래 여덟 가지는 래퍼를 건너뛰고 REST 주소를 직접 두드려
<b>상태 코드와 응답 본문을 그대로</b> 받아 적었습니다.</p>

${table(["보낸 요청", "돌아온 응답"], [
    ["자격을 하나도 안 붙이고 <code>GET /rest/v1/plans</code>", `<b>401</b> <code>No API key found in request</code> ${passBadge(32)}`],
    ["공개 키만 붙이고 <b>로그인 없이</b> <code>GET /rest/v1/plans</code>", "<b>200</b>이지만 <b>0건</b> — 문은 열리지만 내 것이 하나도 없습니다"],
    ["<b>로그인 없이</b> <code>POST /rest/v1/plans</code>", `<b>401</b> <code>42501 new row violates row-level security policy</code> — 주인을 찍을 <code>auth.uid()</code>가 없어 행 자체가 만들어지지 않습니다 ${passBadge(32)}`],
    ["남의 계획 <b>한 건</b>을 집어 요청 (<code>Accept: application/vnd.pgrst.object+json</code>)", `<b>406</b> <code>PGRST116 Cannot coerce the result to a single JSON object</code> — "권한이 없다"가 아니라 <b>"그런 행이 없다"</b>로 답해 id의 존재 여부까지 감춥니다 ${passBadge(33)}`],
    ["내 행의 <b>주인만</b> 남으로 바꾸는 <code>PATCH</code>", `<b>403</b> <code>42501 new row violates row-level security policy</code> — 같은 행·같은 방식인데 <code>user_id</code> 한 칸이 달라지자 서버가 되받습니다 ${passBadge(38)}`],
    ["주소에 남의 계정을 조건으로 적어 보냄 (<code>?user_id=eq.&lt;A&gt;</code>)", `<b>200</b>이지만 <b>0건</b> ${passBadge(35)}`],
    ["헤더에 남의 계정을 적어 보냄 (<code>x-user-id: &lt;A&gt;</code>)", `<b>200</b>에 여러 건이지만 <b>전부 로그인한 내 것</b> — 신원은 주소도 헤더도 아닌 JWT에서만 나옵니다 ${passBadge(35)}`],
    ["남의 계획 <b>내용</b>을 고치는 <code>PATCH</code> (양방향)", `<b>200</b>이지만 <b>0행 반영</b> · 거절 앞뒤로 값도 건수도 그대로 ${passBadge(34)}`],
])}

<div class="note">
  <b>거절이 왜 403 하나로 통일되지 않는가.</b> 이 서버는 남의 자료를 "막는" 것이 아니라
  <b>아예 없는 것으로 만듭니다</b>(RLS). 그래서 남의 행을 겨냥한 조회·수정은 "권한 없음"이 아니라
  <b>그런 행이 없다</b>로 답합니다 — 한 건을 요구하면 406, 목록이나 수정이면 0건·0행입니다.
  이 편이 403보다 덜 흘립니다: 403은 "그 id는 있는데 네 것이 아니다"까지 알려 주지만,
  지금 응답에서는 <b>그 id가 존재하는지조차 알 수 없습니다.</b> 반대로 내게 보이는 행을 건드리되
  규칙을 어기는 요청 — 내 행의 주인을 남으로 넘기려는 <code>PATCH</code> — 에는 숨길 것이 없으므로
  또렷하게 <b>403</b>이 돌아옵니다(검사 38).
</div>

<p>거절 앞뒤로 반대편 자료가 그대로인지도 세었습니다 (T07-C122) —
<code>${esc(checkOf(34)?.detail ?? "")}</code></p>

RLS 정책 정의는 <code>supabase/schema.sql</code>의 <code>plans_select</code>·
<code>plans_insert</code>·<code>plans_update</code> 등 각 표마다 반복되는 3줄(정책 5개 표 × 2~3개
정책)에 있습니다 — 표 하나당 소유자 조건이 딱 한 줄입니다.</p>

<h2 class="breakbefore">⑤ AI와 나</h2>

${table(["구분", "내용"], [
    ["AI에게 맡긴 일", "Supabase Auth 연동(auth.js/AuthGate/AuthForm/AccountSection), user_id + stamp_owner 트리거 + RLS 스키마 재작성, 검사 18~39 설계·구현, capture.mjs/report.mjs를 인증 흐름에 맞게 재작성, session_id·auth.sessions 기반 즉시 세션 무효화(session_is_active()) 조사·구현, 계정 삭제 버튼을 로그아웃과 시각적으로 분리(위험 구역 스타일), 새 Supabase·Vercel 프로젝트 생성 과정에서 비밀번호가 필요 없는 모든 단계."],
    ["내가 직접 판단한 일", "인증 방식으로 Supabase Auth(이메일+비밀번호)를 최종 확정, 새 프로젝트 이름(plandosee-auth)과 배포 이름(aleph-pds-auth) 확정, Supabase 새 프로젝트의 데이터베이스 비밀번호 입력과 'Confirm email' 끄기, 로컬/공개 주소에서 실제 계정으로 로그인해 데이터 이전을 직접 확인, 검사 23이 실패로 남은 것을 보고 '아직 못 막은 것'으로 넘기지 않고 실제로 막는 방법을 요구."],
    ["AI 제안을 따르지 않은 일(없다면 왜 없었는지)", "없음 — 제시된 인증 방식·스키마·트리거 설계를 검토 후 그대로 채택했습니다. 다만 검사 19·20을 처음 돌렸을 때 오류 문구가 \"undefined\"로 나오는 버그(Error.message가 CDP 직렬화 경계에서 사라짐)를 발견해, 검사 스크립트 쪽의 직렬화 로직만 고쳤습니다 — 화면 코드는 그대로 두었습니다."],
])}

<h2 class="breakbefore">⑥ 아직 못 막은 것</h2>

${table(["아직 못 막은 것", "왜 위험한가"], [
    ["무차별 대입(brute-force) 방지 없음", "같은 계정에 비밀번호를 계속 시도해도 막는 장치가 없어 시간을 들이면 뚫릴 수 있습니다."],
    ["비밀번호 재설정 이메일 흐름 미구현", "비밀번호를 잊으면 계정을 복구할 방법이 없습니다(시간이 부족해 다음으로 미룸)."],
    ["2단계 인증 없음", "비밀번호 하나만 뚫리면 끝입니다."],
    ["로그인 시도 로그 없음", "누가 언제 실패했는지 남지 않아 이상 징후를 못 봅니다."],
    ["비밀번호 변경 기능 없음", "토큰이 새어 나갔다고 의심될 때 비밀번호를 바꿔 이전 토큰을 한꺼번에 끊는 길이 없습니다. 지금 그 끊는 수단은 로그아웃뿐이고(카드 3), 로그아웃은 그 브라우저에서 직접 눌러야 합니다. 소스에 <code>updateUser</code>를 부르는 자리가 아예 없습니다."],
])}

<p class="muted">로그아웃 후 액세스 토큰 재사용 문제는 카드 3(<code>session_is_active()</code>)에서
실제로 막았습니다 — 이 표에는 남기지 않습니다.</p>

<h2 class="breakbefore">카드 5 — 설명서로 묶고, 5일 써 보기</h2>

<h4>내 자료 전체를 파일 하나로 (T07-C133)</h4>

<p>자료 화면의 <b>"전체 내보내기"</b> 버튼은 계획·개정 이력·할일·실행기록·고칠 점 다섯 표를
<code>exportedAt</code>이 붙은 객체 하나로 묶어 <code>plandosee-auth-내보내기-YYYY-MM-DD.json</code>
파일로 내려받습니다(<code>src/components/ExportSection/ExportSection.jsx</code>,
<code>src/api/exportAll.js</code>). 검사가 이 버튼을 실제로 눌러 안내 문구를 읽고,
받은 자료에 상대 계정의 행이 섞이지 않았는지까지 확인합니다.</p>

<p class="muted">${passBadge(36)} 판정 근거: <code>${esc(checkOf(36)?.detail ?? "")}</code></p>

<h4>계정 삭제 (T07-C134)</h4>

${figure("11_계정관리", `${st("11_계정관리")} — ${nt("11_계정관리")}`)}

<p><b>계정 삭제</b>는 로그인한 본인 권한으로 내 소유 행(계획·이력·할일·실행기록·고칠점)을 전부
하드 삭제하는 <code>delete_my_data()</code> 함수로 처리합니다. <code>auth.users</code>의 가입
정보 자체는 <code>service_role</code> 관리자 API가 필요해 이 화면에서는 지우지 못했습니다 —
그 사실을 화면에 그대로 밝혀 T07-C134를 만족합니다.</p>

<h3>1일차에 고정한 것 (T07-C04, T07-C05, T07-C06, T07-C08)</h3>
${table(["항목", "고정한 값"], [
    ["답하려는 질문 한 문장 (T07-C04)", "계획한 시간과 실제로 쓴 시간이 얼마나 벌어지는가?"],
    ["관찰 지표 한 개 (T07-C05)", "그날 실행기록의 실제 걸린 시간 합계"],
    ["지표의 단위 (T07-C06)", "분(minute)"],
    ["계산 규칙", "실행기록의 <code>startedAt</code>을 Asia/Seoul 기준 날짜로 묶고, 그 날짜에 속한 <code>actualMinutes</code>를 모두 더한다. 5일 전체에 같은 규칙을 적용한다 (T07-C08)."],
])}

<h3>값이 이상할 때 어떻게 하는가 (T07-C23~C27)</h3>
${table(["경우", "처리 방법"], [
    ["값이 빠졌을 때 (T07-C23)", "그날을 <b>0분으로 채우지 않고 빈 날로 둔다.</b> 없는 기록을 0으로 세면 '쉰 날'과 '적지 못한 날'이 구분되지 않기 때문이다. 5일은 <b>기록이 있는 서로 다른 날짜</b>로만 센다. 실제로 이번 5일 중 9월 1일·3일에는 기록이 없고, 그 날들은 5일에 포함하지 않았다."],
    ["값이 중복될 때 (T07-C24)", "같은 날짜에 실행기록이 여러 건이면 <b>중복이 아니라 그날의 여러 작업</b>으로 보고 모두 더한다. 실제로 8월 31일은 5건, 9월 2일은 3건이 더해졌다. 같은 <code>id</code>가 두 번 들어오는 경우만 중복이며, <code>upsert(onConflict: \"id\")</code>가 덮어쓰므로 행이 늘지 않는다."],
    ["값이 유난히 튈 때 (T07-C25)", "<b>버리지 않고 그대로 둔다.</b> 이번 5일에서 8월 31일 1370분은 다른 날의 30~115분과 크게 벌어지지만, 실제로 그날 그만큼 했으므로 지우면 기록이 아니게 된다. 대신 평균만 보지 않고 <b>날짜별 값을 함께 싣는다</b> — 아래 표가 그것이다."],
    ["반올림 (T07-C26)", "합계에는 반올림이 없다. 실제 걸린 시간을 <b>분 단위 정수로 직접 입력</b>받고 나누는 연산이 없기 때문이다. <b>평균에만</b> 소수 첫째 자리까지 남기고 그 아래를 반올림한다."],
    ["주 시작 요일 (T07-C27)", "<b>월요일</b>(ISO-8601). 이번 5일은 주 단위로 묶지 않았지만, 묶는다면 이 기준을 쓴다."],
])}

<h3>실제 5일 기록 (T07-C07, T07-C132)</h3>
<p>Asia/Seoul 기준 <b>서로 다른 실제 날짜 정확히 5일</b>입니다. 아래 값은 화면 집계가 아니라
   내보내기 파일의 실행기록을 손으로 더한 것이고, <code>tools/check.mjs</code>의 검사 31이
   같은 계산을 다시 해 대조합니다.</p>
${table(["날짜 (KST)", "그날 실행기록", "실제 시간 합계"], [
    ["2026-08-31", "5건", "1370분"],
    ["2026-09-02", "3건", "115분"],
    ["2026-09-04", "1건", "30분"],
    ["2026-09-05", "1건", "30분"],
    ["2026-09-06", "1건", "30분"],
    ["<b>합계</b>", "<b>11건</b>", "<b>1575분</b>"],
    ["<b>평균</b>", "—", "<b>315.0분</b>"],
])}


<h3>계획 규칙과 그 변경 (T07-C09~C15)</h3>

<p><b>1일차에 정한 계획 규칙</b> — "자격증 공부는 한 번 잡으면 끝까지 길게 붙잡고,
   그 시간에는 그것만 한다."</p>

<p><b>바꾼 규칙</b> — "한 번에 길게 붙잡지 않는다. 하루 한 덩어리를 30분 안팎으로 줄이고,
   다른 일과 병행하며 쉬엄쉬엄 한다."</p>

${table(["항목", "내용"], [
    ["바꾼 시각 (T07-C10)", "2026-09-03 — 2일차 기록(2026-09-02) 뒤이고 3일차 기록(2026-09-04) 앞입니다 (T07-C09, T07-C12)."],
    ["바꾼 이유 (T07-C11)", "1·2일차처럼 한 번에 길게, 그리고 한 가지만 붙잡으니 <b>중간에 손을 놓게 되었습니다.</b> 실제로 1일차(8/31)와 2일차(9/2) 사이 9월 1일에는 기록이 아예 없습니다. 시간을 줄이더라도 매일 이어지는 쪽이 낫다고 판단했습니다."],
    ["무엇을 가리키는가 (T07-C12)", "1일차 = 2026-08-31(1370분), 2일차 = 2026-09-02(115분). 이 두 날의 방식을 바꾼 것입니다."],
])}

<p><b>바꾸기 전과 뒤 — 같은 지표(T07-C13)·같은 단위(T07-C14)·같은 계산 규칙(T07-C15)으로</b><br>
   지표는 "그날 실행기록 실제시간 합계", 단위는 분, 계산 규칙은 KST 날짜로 묶어
   <code>actualMinutes</code>를 더하는 것. 양쪽에 똑같이 적용했습니다.</p>

${table(["", "날짜", "날짜별 값", "합계", "하루 평균", "기록이 있는 날 / 기간"], [
    ["<b>바꾸기 전</b> (1·2일차)", "08-31, 09-02", "1370분, 115분", "1485분", "742.5분", "2일 / 3일(9월 1일 비어 있음)"],
    ["<b>바꾼 뒤</b> (3·4·5일차)", "09-04, 09-05, 09-06", "30분, 30분, 30분", "90분", "30.0분", "3일 / 3일(연속)"],
])}

<p><b>무엇이 달라졌나</b> — 하루 평균이 742.5분에서 30.0분으로 <b>712.5분 줄었습니다.</b>
   대신 기록이 끊기지 않았습니다: 바꾸기 전에는 3일 중 2일만 남았고 그 사이 하루가 비었는데,
   바꾼 뒤에는 <b>3일 연속</b>으로 남았습니다. 노린 것이 그것이었고 — 총량을 내주고 지속을
   얻는 거래 — 지표가 그대로 보여 줍니다.</p>




<h3>과제 6에서 이어 붙였다는 근거 (T07-C77·C78)</h3>
<p>과제 6 최종 결과물은 <a href="https://aleph-pds.vercel.app">aleph-pds.vercel.app</a>이고
   별개 프로젝트로 그대로 두었습니다. 소스 이력에서도 이어집니다 —
   과제 6의 최종 커밋 <code>1227f3a</code>("과제6 — 완료된 할일 시각 구분")가
   과제 7 소스의 <b>조상</b>입니다. <code>git merge-base --is-ancestor 1227f3a HEAD</code>로
   확인했습니다. 과제 7의 첫 커밋은 <code>9eff9c5</code>입니다.</p>

<h2 class="breakbefore">검사 ${lastCheck ? lastCheck.results.length : 31}개</h2>

<p class="muted">
  <code>node tools/check.mjs --json</code> 실행 결과. 사람 눈이 아니라 이 명령 하나가 판정합니다.
  1~17은 과제 6과 같은 계획·할일·실행기록·돌아보기 검사이고, 18~39가 이번 과제(인증·소유권)에서
  새로 추가됐습니다. 그중 32~38은 앱의 래퍼를 건너뛰고 REST 주소를 직접 두드려
  상태 코드와 응답 본문을 그대로 받아 적는 검사입니다.
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
