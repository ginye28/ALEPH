/**
 * 제출 보고서 (8.md 대응) — "인증 구현 설명서" 여섯 항목 구조.
 *
 * 촬영 기록(과제8 증빙 화면/촬영 기록.json)과 검사 기록(검사 기록/portfolio-passkey-*.json)을
 * 읽어 하나의 PDF로 묶습니다. 숫자와 응답 문구를 손으로 옮겨 적지 않고 **도구가 남긴 값을
 * 그대로** 씁니다 — 보고서와 실제 동작이 어긋날 자리를 없애기 위해서입니다.
 *
 *   node portfolio-passkey/tools/report.mjs
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOT_DIR = path.join(ROOT, "과제8 증빙 화면");
const LOG_DIR = path.join(ROOT, "검사 기록");
const OUT_HTML = path.join(SHOT_DIR, "보고서.html");
const OUT_PDF = path.join(ROOT, "내 소개 페이지 패스키 제출 보고서.pdf");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9358;
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "pk-report-"));

const PUBLIC_URL = process.env.BOARD_URL ?? "https://aleph-passkey.vercel.app";
const SOURCE_URL = "https://github.com/ginye28/ALEPH/tree/main/portfolio-passkey";

/* ─────────────────────────────────────────────────────────────── 자료 읽기 */

const capture = JSON.parse(fs.readFileSync(path.join(SHOT_DIR, "촬영 기록.json"), "utf8"));

const latestCheck = fs
    .readdirSync(LOG_DIR)
    .filter((f) => f.startsWith("portfolio-passkey-") && f.endsWith(".json"))
    .sort()
    .at(-1);
const check = latestCheck
    ? JSON.parse(fs.readFileSync(path.join(LOG_DIR, latestCheck), "utf8"))
    : { results: [], passed: [], failed: [] };

const recordOf = (fragment) => capture.records.find((r) => r.title.includes(fragment)) ?? {};
const checkOf = (n) => check.results.find((r) => r.n === n);
const hasImg = (name) => fs.existsSync(path.join(SHOT_DIR, `${name}.png`));

const esc = (v) =>
    String(v ?? "").replace(
        /[&<>]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
    );

/* ───────────────────────────────────────────────────────────── 조각 만들기 */

const figure = (name, caption) =>
    hasImg(name)
        ? `<figure><img src="${name}.png" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`
        : `<p class="todo">사진 없음: ${esc(name)}.png</p>`;

const table = (head, body, cls = "") => `
<table class="${cls}">
  <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;

/** 촬영 기록 한 건을 그대로 표로 펼친다. */
const recordTable = (fragment) => {
    const record = recordOf(fragment);
    const rows = Object.entries(record)
        .filter(([k]) => k !== "title")
        .map(([k, v]) => [`<b>${esc(k)}</b>`, `<code>${esc(v)}</code>`]);
    if (rows.length === 0) return `<p class="todo">기록 없음: ${esc(fragment)}</p>`;
    return table(["", "기록된 값"], rows, "record");
};

const badge = (n) => {
    const row = checkOf(n);
    if (!row) return `<span class="todo">검사 ${n} 기록 없음</span>`;
    return row.pass
        ? `<span class="pass">PASS · 검사 ${n} (${row.code})</span>`
        : `<span class="todo">확인 필요 · 검사 ${n} (${row.code})</span>`;
};

const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
}).format(new Date());

/* ────────────────────────────────────────────────────────────────── 본문 */

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>내 소개 페이지 패스키 · 인증 구현 설명서</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  :root {
    --ink:#17191C; --soft:#5A6169; --faint:#878E96; --rule:#C9CFD5; --hair:#E4E8EC;
    --head:#EEF2F5; --accent:#0E5A86; --ok:#0F6B45; --ok-bg:#EAF5EF;
    --todo:#8A5A00; --todo-bg:#FDF4E3; --warn:#8A2C1A; --warn-bg:#FBF1EF;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; font-family:"Malgun Gothic","맑은 고딕","Noto Sans KR",sans-serif;
         font-size:9.6pt; line-height:1.62; color:var(--ink); }
  h1 { font-size:20pt; line-height:1.25; margin:0 0 4pt; letter-spacing:-0.02em; }
  h2 { font-size:13pt; margin:20pt 0 7pt; padding-bottom:4pt;
       border-bottom:1.6pt solid var(--accent); letter-spacing:-0.01em; break-after:avoid; }
  h3 { font-size:10.6pt; margin:13pt 0 4pt; break-after:avoid; }
  p { margin:0 0 5pt; }
  ul, ol { margin:0 0 6pt; padding-left:15pt; }
  li { margin-bottom:2.5pt; }
  code { font-family:Consolas,"D2Coding",monospace; font-size:8.4pt;
         word-break:break-all; }

  .cover { padding-top:40mm; break-after:page; }
  .cover .kicker { color:var(--accent); font-weight:700; font-size:10pt; letter-spacing:0.06em; }
  .cover .sub { color:var(--soft); font-size:11pt; margin-top:6pt; }
  .cover dl { margin-top:26pt; display:grid; grid-template-columns:34mm 1fr; gap:5pt 0;
              font-size:9.4pt; border-top:1pt solid var(--rule); padding-top:12pt; }
  .cover dt { color:var(--soft); }
  .cover dd { margin:0; word-break:break-all; }

  table { width:100%; border-collapse:collapse; margin:5pt 0 9pt; font-size:8.9pt; }
  th, td { border:0.6pt solid var(--hair); padding:4.2pt 5.5pt; text-align:left; vertical-align:top; }
  thead th { background:var(--head); font-weight:700; }
  tr { break-inside:avoid; }
  table.record th:first-child, table.record td:first-child { width:34mm; }
  table.checks td:nth-child(1) { width:9mm; text-align:right; }
  table.checks td:nth-child(2) { width:17mm; white-space:nowrap; }
  table.checks td:nth-child(3) { width:12mm; }

  .pass { color:var(--ok); font-weight:700; }
  .fail { color:var(--warn); font-weight:700; }
  .muted { color:#6B7280; }
  .note { background:var(--ok-bg); border-left:2.4pt solid var(--ok); padding:6pt 9pt; margin:7pt 0; font-size:9pt; }
  .todo { background:var(--todo-bg); border-left:2.4pt solid var(--todo); padding:6pt 9pt;
          margin:7pt 0; font-size:9pt; color:var(--todo); }
  .warn { background:var(--warn-bg); border-left:2.4pt solid var(--warn); padding:6pt 9pt;
          margin:7pt 0; font-size:9pt; }
  .guide { border:1pt solid var(--rule); padding:9pt 12pt; margin:6pt 0 10pt; }
  .guide h3 { margin-top:9pt; color:var(--accent); font-size:10pt; }
  .guide h3:first-child { margin-top:0; }

  figure { margin:7pt 0 10pt; break-inside:avoid; }
  figure img { width:100%; border:0.6pt solid var(--rule); }
  figcaption { font-size:8.4pt; color:var(--soft); margin-top:3pt; }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:8pt; }
  .section { break-before:page; }
</style>
</head>
<body>

<section class="cover">
  <p class="kicker">과제 8 · 제출 보고서</p>
  <h1>내 소개 페이지에 패스키 달기<br>— 비밀번호 없이 나만 들어가기</h1>
  <p class="sub">공개 소개는 그대로 두고, 새로 만든 “나만 보는 자리”만 패스키로 잠갔습니다.<br>
     막았다는 문장 대신 <b>막히는 장면</b>(성공한 요청과 거절된 요청)으로 보입니다.</p>
  <dl>
    <dt>결과물 주소</dt><dd>${esc(PUBLIC_URL)}</dd>
    <dt>소스 주소</dt><dd>${esc(SOURCE_URL)}</dd>
    <dt>붙인 방식</dt><dd>WebAuthn (FIDO2 패스키) · 비밀번호 없음</dd>
    <dt>검사</dt><dd>${check.passed.length}개 통과 / ${check.failed.length}개 미통과 (총 ${check.results.length}개)</dd>
    <dt>증빙 촬영</dt><dd>사진 ${capture.shots.length}장 · 기록 ${capture.records.length}건</dd>
    <dt>작성일</dt><dd>${stamp}</dd>
  </dl>
</section>

<h2>짧은 확인 방법</h2>
<div class="guide">
  <h3>어디로 가나요</h3>
  <p>${esc(PUBLIC_URL)} — 첫 화면은 누구나 볼 수 있는 공개 소개 페이지입니다. 계정을 만들 필요도, 로그인할 필요도 없습니다.</p>
  <h3>세 단계 안에 무엇을 하나요</h3>
  <p>① 페이지 맨 아래 <b>🔒 나만 보는 자리</b>에서 “패스키 새로 등록하기”를 눌러 기기의 지문·얼굴·PIN으로 등록합니다.
     ② 열린 자리에 메모를 한 줄 남깁니다. ③ “로그아웃”을 누른 뒤 같은 자리를 다시 봅니다.</p>
  <h3>무엇이 보이면 통과인가요</h3>
  <p>①·② 뒤에는 잠금 배지가 <b>열림</b>으로 바뀌고 비공개 항목이 보입니다.
     ③ 뒤에는 다시 <b>잠김</b>으로 돌아가고 내용이 사라집니다. 이때 브라우저에서 페이지 소스를 열어 봐도 비공개 내용은 없습니다.</p>
  <h3>안 될 때는 무엇이 보이나요</h3>
  <p>패스키를 지원하지 않는 브라우저면 “이 브라우저는 패스키를 지원하지 않습니다”라는 안내가 뜨고 버튼이 꺼집니다.
     등록 도중 지문 창을 닫으면 “등록을 취소했습니다. 서버에는 계정도 패스키도 만들어지지 않았습니다”가 뜹니다.
     기기에 패스키가 하나도 없는 상태에서 “패스키로 들어가기”를 누르면 브라우저가 고를 것이 없다고 알려 줍니다.</p>
</div>

<h2>인증 구현 설명서 — ① 무엇으로 붙였나</h2>
<p><b>WebAuthn(FIDO2) 표준을 씁니다. 비밀번호는 아예 만들지 않았습니다.</b>
   직접 구현한 것이 아니라 아래 조각들을 골라 썼습니다.</p>
${table(
    ["자리", "쓴 것", "무엇을 맡겼나"],
    [
        ["브라우저", "<code>navigator.credentials.create() / .get()</code> (브라우저·OS 내장)", "키 쌍 생성, 개인키 보관, 지문·얼굴·PIN 확인, 서명"],
        ["서버 검증", "<code>@simplewebauthn/server</code> 13.3.3 (MIT)", "질문(challenge) 생성, 서명·origin·rpID 검증, 서명 횟수 확인"],
        ["서버 실행", "Vercel 서버리스 함수 (Node)", "<code>api/</code> 폴더의 파일 하나가 주소 하나"],
        ["저장소", "Supabase Postgres (service_role, 서버에서만)", "공개키·질문·세션·비공개 자료"],
        ["브라우저 쪽 연결 코드", "<b>직접 작성</b> (<code>app.js</code> 약 40줄)", "base64url ↔ ArrayBuffer 형식 변환만. 보안 판단은 한 줄도 없음"],
    ],
)}
<div class="note">브라우저 쪽 40줄을 직접 쓴 이유 — 하는 일이 <b>자료 형식 변환뿐</b>이라 라이브러리를 하나 더 끌어올 만큼의
일이 아니었습니다. 반대로 <b>서명이 맞는지 판단하는 쪽</b>은 실수가 곧 구멍이 되는 자리라 검증된 표준 라이브러리에 그대로 맡겼습니다.</div>

<h2>② 검토했지만 고르지 않은 것</h2>
${table(
    ["후보", "고르지 않은 이유"],
    [
        [
            "CBOR·COSE 파싱을 손으로 구현",
            "WebAuthn 규격이 이미 재생 공격 방지·origin 묶기·서명 확인을 다 정의해 두었습니다. 이 과제의 배점은 표준을 이해하고 잘 고르는 것이지 바이트 파서를 다시 만드는 것이 아닙니다.",
        ],
        [
            "Firebase Auth · Auth0 등 SaaS의 패스키 기능",
            "질문 생성과 검증이 통째로 남의 상자 안으로 들어가, 카드 2·3이 요구하는 “서버가 질문을 어떻게 만들고 어떻게 확인하는지”를 설명할 수 없게 됩니다.",
        ],
        [
            "아이디·비밀번호를 예비 수단으로 남기기",
            "비밀번호를 하나라도 남기면 “비밀번호를 쓰지 않는다”가 사실이 아니게 됩니다. 잠금이 가장 약한 곳의 세기로 정해지기 때문입니다.",
        ],
        [
            "JWT 같은 서명된 토큰으로 세션 만들기",
            "서명만으로 판단하면 로그아웃해도 만료 전까지 그 토큰이 살아 있습니다. 서버가 세션 행을 직접 들고 있으면 로그아웃이 곧 삭제라 그 즉시 끊깁니다.",
        ],
    ],
)}

<h2 class="section">③ 비밀번호를 어떻게 맡아 두나</h2>
<p><b>맡아 두지 않습니다. 비밀번호가 처음부터 없습니다.</b>
   화면 어디에도 비밀번호를 입력하는 칸이 없고, 소스 전체에도 <code>type="password"</code>가 없습니다. ${badge(8)}</p>
<p>대신 서버가 갖고 있는 것은 <b>공개키</b> 하나입니다. 등록할 때 기기가 열쇠 한 쌍을 만들어
   공개키만 보내고, 서명을 만드는 개인키는 기기 밖으로 나오지 않습니다.</p>
${recordTable("서버가 갖고 있는 값")}
<p>${badge(13)} ${badge(14)}</p>
<div class="note">이 값이 비밀번호가 아니라는 확인 — 저장된 문자열을 COSE 형식으로 해독하면 키 종류와 서명 알고리즘이
그대로 나옵니다(검사 14가 매번 해독해 확인합니다). <b>공개키로는 서명을 확인만 할 수 있고 만들어 낼 수 없습니다.</b>
비밀번호나 그 해시였다면 애초에 이 형식으로 해독되지 않습니다.</div>
${figure("05_서버가_가진_값_공개키", "화면에서도 서버가 가진 값을 그대로 펼쳐 보여준다 — 공개키뿐이다")}
${recordTable("등록 요청 본문에는")}
<p>${badge(15)}</p>

<div class="note">
<b>실제 기기로 확인한 저장 위치 (T08-C26, 2026-09-03)</b> — 위 캡처는 자동 검사용 가상
authenticator로 만든 것이고, 실제 사람이 실제 기기로 등록하면 어디에 남는지는 따로
확인했다. 공개 주소(<code>aleph-passkey.vercel.app</code>)에서 아이폰 Face ID로 직접
패스키를 등록하자 <b>Apple 자체 저장소(iCloud 키체인)</b>에 저장됐다 — 같은 Apple 계정을
쓰는 다른 기기에서도 이 패스키로 로그인할 수 있다는 뜻이다. 등록된 뒤 같은 계정에 두
번째 패스키를 추가하려 하자 브라우저가 "이 기기에는 이미 패스키가 등록되어 있습니다"로
거절했는데, iCloud 키체인이 기기가 달라도 같은 패스키를 동기화해 쓰기 때문이다.
</div>

<h2>④ 들어온 사람을 어떻게 기억하나</h2>
${recordTable("무엇으로 사람을 알아보는가")}
<p>${badge(23)} ${badge(24)}</p>
<p><b>세션입니다. 토큰이 아닙니다.</b> 쿠키에 실려 오가는 값은 <code>pk_sessions</code> 테이블의 행 하나를 가리키는
   무작위 id일 뿐이고, 값 자체에는 아무 정보도 담겨 있지 않습니다. 그래서 로그아웃은 그 행을 지우는 것이고,
   지우는 순간 같은 값으로는 아무것도 열리지 않습니다.</p>
${recordTable("로그아웃한 뒤 같은 세션 값")}
<p>${badge(25)}</p>

<h2 class="section">⑤ 등록·로그인·응답·비공개 조회가 소스 어디를 지나는가</h2>
${table(
    ["흐름", "지나는 자리", "하는 일"],
    [
        [
            "<b>등록</b>",
            "<code>app.js</code> registerPasskey<br>→ <code>api/register/options.js</code><br>→ 기기<br>→ <code>api/register/verify.js</code><br>→ <code>lib/store.js</code>",
            "질문 발급·보관 → 기기가 키 쌍 생성 → 서명·origin 검증 → 공개키 저장 → 세션 발급",
        ],
        [
            "<b>로그인</b>",
            "<code>app.js</code> loginWithPasskey<br>→ <code>api/login/options.js</code><br>→ 기기<br>→ <code>api/login/verify.js</code>",
            "새 질문 발급 → 기기가 개인키로 서명 → 저장된 공개키로 확인 → 질문 소진 → 세션 발급",
        ],
        [
            "<b>응답(누구인지)</b>",
            "<code>lib/session.js</code> currentUser / requireUser<br>← <code>api/me.js</code>",
            "쿠키의 세션 id로 <code>pk_sessions</code> 조회. 없으면 401",
        ],
        [
            "<b>비공개 조회</b>",
            "<code>api/private-notes/index.js</code><br><code>api/private-notes/[id].js</code>",
            "requireUser 통과 뒤, <b>세션이 가리키는 계정의 자료만</b> 읽고 씀. 남의 것이면 404",
        ],
    ],
)}

<h3>확인 네 가지 — 성공한 요청과 거절된 요청을 나란히</h3>

<h3>확인 1. 로그인하지 않고 비공개 자료를 열어 본다</h3>
${recordTable("로그인하지 않은 채 비공개 자료를")}
<p>${badge(6)} ${badge(7)}</p>
${recordTable("로그인하지 않고 받은 페이지 소스")}
<p>${badge(5)}</p>

<h3>확인 2. 남의 패스키로 다른 계정의 자료를 열어 본다</h3>
${recordTable("한쪽 패스키로 다른 쪽 자료를")}
<p>${badge(31)} ${badge(32)}</p>
${recordTable("거절 앞뒤로 상대편 자료 건수")}
<p>${badge(33)}</p>
${recordTable("요청 본문에 남의 계정 id를")}
<p>${badge(34)}</p>

<h3 class="section">확인 3. 이미 쓴 질문을 다시 보낸다</h3>
${recordTable("이미 쓴 질문을 다시 보냈을 때")}
<p>${badge(22)}</p>
${recordTable("성공한 요청과 거절된 요청")}
<p>${badge(20)} ${badge(21)}</p>

<h3>확인 4. 패스키를 지운 뒤 그 패스키로 들어가 본다</h3>
${recordTable("패스키 하나를 지운 뒤")}
<p>${badge(28)} ${badge(29)}</p>
${figure("06_패스키_두개", "한 계정에 패스키 두 개 — 기기를 잃어버렸을 때를 위해")}
${recordTable("마지막 패스키까지 지웠을 때")}
<p>${badge(35)}</p>
${figure("08_마지막패스키_경고", "마지막 패스키를 지우기 전, 화면이 되돌릴 수 없음을 먼저 말한다")}

<h2 class="section">⑥ 아직 못 막은 것</h2>
<p>확인 네 가지를 모두 통과했지만, <b>다 막았다고 적지 않겠습니다.</b> 만들면서 실제로 확인한 한계는 아래와 같습니다.</p>
<div class="warn">
  <p><b>1. 잠금이 풀린 기기를 그대로 쓰는 사람은 막지 못합니다.</b>
     이 사이트는 <code>userVerification: "preferred"</code>로 두었습니다. PIN이 없는 보안 키도 쓸 수 있게 하려는 선택인데,
     그 대가로 <b>기기가 이미 잠금 해제되어 있으면 지문 확인 없이도 패스키가 응답할 수 있습니다.</b>
     남이 내 잠금 해제된 노트북 앞에 앉으면 그대로 열립니다. <code>"required"</code>로 바꾸면 막히지만, 그러면 일부 보안 키를 쓸 수 없습니다.</p>

  <p><b>2. 세션이 12시간 살아 있고, 그동안 다시 확인하지 않습니다.</b>
     로그인한 뒤에는 비공개 자료를 보거나 지울 때 패스키를 다시 요구하지 않습니다.
     로그아웃하지 않은 채 자리를 뜨면 그 시간 동안은 열려 있습니다. 민감한 동작(패스키 삭제)에는 재확인을 넣는 게 맞지만 아직 넣지 못했습니다.</p>

  <p><b>3. 비공개 자료는 서버에 그냥 저장됩니다.</b>
     자료 자체를 암호화하지 않았기 때문에, <b>서버의 <code>SUPABASE_SERVICE_ROLE_KEY</code>가 새면 전부 읽힙니다.</b>
     패스키가 막는 것은 “바깥에서 들어오는 길”이지 “서버 안에서 보는 눈”이 아닙니다.</p>

  <p><b>4. 계정을 되살릴 방법이 전혀 없습니다.</b>
     기기를 전부 잃거나 마지막 패스키를 지우면 그 계정은 영원히 닫힙니다(검사 35). 일부러 그렇게 두었고 화면에서 경고도 하지만,
     실제 서비스라면 복구 코드 같은 예비 수단이 필요합니다.</p>

  <p><b>5. 다 쓴 질문 기록을 청소하지 않습니다.</b>
     <code>pk_challenges</code>는 만료돼도 지워지지 않고 계속 쌓입니다. 동작에는 문제가 없지만(만료·사용 여부를 매번 확인합니다) 관리 작업이 빠져 있습니다.</p>
</div>

<h2 class="section">카드 1 — 무엇을 잠갔는가</h2>
<p>공개 영역은 과제 1에서 만든 소개 페이지 그대로입니다. 문장 하나 바꾸지 않았고, 검사 2가 원본 커밋(<code>cb23773</code>)에서
   글자를 뽑아 지금 페이지와 한 줄씩 대조합니다. ${badge(2)}</p>
<p>그 아래에 <b>🔒 나만 보는 자리</b>를 새로 만들었습니다. 배경색과 테두리를 달리해 어디까지가 공개이고
   어디부터가 비공개인지 한눈에 보이게 했고, 지금 잠겨 있는지 열려 있는지도 배지로 밝힙니다. ${badge(3)} ${badge(1)}</p>
${figure("01_공개_소개페이지", "첫 화면 — 아무것도 등록하지 않아도 열리는 공개 소개 페이지")}
${figure("02_공개와_비공개_경계", "잠긴 상태 — 무엇이 있는지도 보이지 않는다")}
${figure("04_비공개영역_열림", "열린 상태 — 프로젝트 메모·지원 목록·회고 세 항목 (전부 지어낸 내용)")}
<p>${badge(4)} ${badge(17)} ${badge(9)}</p>
<div class="note">비공개 내용이 <b>소스에 아예 없는</b> 이유 — 화면의 비공개 자리는 처음에 빈 칸으로만 그려집니다.
인증을 통과해야 <code>app.js</code>가 서버에서 내용을 받아 채웁니다. CSS로 숨겼다면 페이지 소스에는 그대로 남았을 것입니다.</div>

<h2>카드 2 — 패스키를 등록한다</h2>
${recordTable("등록용 질문은 요청마다")}
<p>${badge(10)} ${badge(11)}</p>
${figure("03_등록_이름입력", "패스키마다 사람이 알아볼 이름을 붙인다")}
<p>${badge(16)}</p>
${recordTable("등록을 중간에 취소했을 때")}
<p>${badge(12)}</p>

<h2>카드 3 — 패스키로 들어간다</h2>
${recordTable("로그인 질문도 매번")}
<p>${badge(18)} ${badge(19)}</p>

<h2 class="section">카드 4 — 기기를 잃어버렸을 때</h2>
<p>패스키는 기기에 매여 있습니다. 하나뿐이면 그 기기를 잃는 순간 계정도 잃습니다.
   그래서 <b>패스키를 두 개 등록</b>해 두고, 하나를 지운 뒤에도 남은 하나로 들어갈 수 있는지 실제로 확인했습니다.</p>
<p>${badge(26)} ${badge(27)}</p>
${figure("07_패스키_지우기_확인", "지우기는 두 단계 — 무엇이 사라지는지 먼저 말한다")}
${figure("09_마지막패스키_삭제후", "마지막 패스키를 지운 뒤 — 다시 잠기고, 되돌릴 수 없다고 알린다")}

<div class="warn">
<b>실제 기기 두 대로는 시연하지 못한 부분</b> — 위 자동 검사(26~29·35)는 가상
authenticator 두 개로 "패스키 하나를 잃고 다른 하나로 들어가는" 과정을 재현한 것이다.
실제 기기 두 대(아이폰 Face ID + 다른 기기)로 같은 것을 해 보려 했으나, 두 번째 기기로
쓸 수 있었던 윈도우 PC가 <b>공용 PC라 로그인 PIN을 새로 만들 수 없었고</b>(Windows
Hello가 아예 없어 물리 보안 키를 요구함), <b>블루투스도 켜지지 않아</b> 휴대폰을 거쳐
로그인하는 방법(QR)도 쓸 수 없었다. 공용 PC에 새 자격 증명을 만드는 것 자체가 부적절한
일이라 시도를 접었다. 그래서 이 흐름은 실제 기기 두 대가 아니라 자동화된 가상
authenticator 검사로만 확인됐다 — 그 검사는 공개 배포 주소(<code>aleph-passkey.vercel.app</code>)를
대상으로 돌았다.
</div>

<h2>모바일</h2>
${figure("10_모바일_375", "가로 375px에서도 공개·비공개 경계와 잠금 상태가 그대로 보인다")}

<h2 class="section">검사 ${check.results.length}개</h2>
<p>사람 눈이 아니라 명령 하나가 판정합니다. 패스키는 원래 지문이나 보안 키가 있어야 시험할 수 있지만,
   크롬 개발자 프로토콜의 <b>가상 authenticator</b>를 붙이면 실제 기기와 똑같이 키 쌍을 만들고 서명하게 할 수 있어
   등록·로그인·기기 분실·계정 격리를 전부 자동으로 재현했습니다.</p>
<p class="muted">검사 대상: <code>${esc(check.url ?? "")}</code> · 기록: <code>${esc(latestCheck ?? "없음")}</code></p>
${table(
    ["#", "코드", "카드", "검사", "결과"],
    check.results.map((r) => [
        String(r.n),
        `<code>${esc(r.code)}</code>`,
        esc(r.kind),
        esc(r.title),
        r.pass ? '<span class="pass">PASS</span>' : '<span class="fail">FAIL</span>',
    ]),
    "checks",
)}

<h2>AI와 내 판단</h2>
<h3>AI에게 맡긴 일</h3>
<p>WebAuthn 등록·로그인 흐름의 구현(서버 API와 브라우저 연결 코드), 저장소 스키마, 그리고 가상 authenticator를 쓰는
   검사·촬영 도구 작성을 맡겼습니다. 표준 규격을 정확히 옮기는 일과, 손으로는 재현하기 번거로운
   “기기를 바꿔 끼우는” 시나리오를 자동화하는 일이었습니다.</p>
<h3>내가 직접 판단한 일</h3>
<p>어떤 인증 수단을 쓸지 — 지문·Face ID 같은 기기 내장 방식을 기본으로 하고, 기기 분실 대비 두 번째 패스키는
   다른 기기나 USB 보안 키로 두기로 정했습니다. 무엇을 공개하고 무엇을 비공개로 둘지(프로젝트 메모·지원 목록·회고),
   그리고 비공개 자리에 <b>실제 개인정보를 넣지 않고 전부 지어낸 내용만 쓰기로</b> 한 것도 제 판단입니다.</p>
<h3>AI 제안을 따르지 않은 일</h3>
<p>처음 설계안은 브라우저 쪽도 <code>@simplewebauthn/browser</code>를 외부 CDN에서 불러다 쓰자는 것이었습니다.
   따르지 않았습니다 — 브라우저 쪽이 하는 일은 자료 형식 변환 40줄이 전부인데, 그것 때문에 페이지가 외부 CDN에
   의존하게 되는 것이 맞지 않다고 봤습니다. 정작 중요한 <b>서명 검증</b>은 그대로 표준 라이브러리에 맡겼습니다.</p>

</body>
</html>`;

fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.writeFileSync(OUT_HTML, html, "utf-8");
console.log("보고서 HTML 저장:", OUT_HTML);

/* ─────────────────────────────────────────────────────────────── PDF 인쇄 */

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
        <span style="float:right">내 소개 페이지 패스키 · 인증 구현 설명서</span></div>`,
    footerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 15mm;text-align:center;font-family:'Malgun Gothic',sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});

fs.writeFileSync(OUT_PDF, Buffer.from(data, "base64"));
console.log("PDF 저장:", OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);

ws.close();
chrome.kill();
process.exit(0);
