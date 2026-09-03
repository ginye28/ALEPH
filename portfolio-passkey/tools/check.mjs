/**
 * 검사 (8.md 대응).
 *
 * 통과·실패를 사람 눈이 아니라 이 명령 하나가 판정합니다.
 *
 * 패스키는 보통 지문이나 보안 키가 있어야 시험할 수 있지만, 크롬의 개발자 프로토콜(CDP)에는
 * **가상 authenticator**를 붙이는 기능이 있습니다(WebAuthn 도메인). 실제 기기와 똑같이
 * 키 쌍을 만들고 서명하되 전부 소프트웨어로 돌아가므로, 등록·로그인·기기 분실·계정 격리를
 * 사람 손 없이 그대로 재현할 수 있습니다. 저장된 자격증명을 꺼내고(getCredentials) 다시
 * 심을 수 있어(addCredential), "이 기기를 잃어버렸다 / 저 기기로 바꿨다"도 재현됩니다.
 *
 *   node portfolio-passkey/tools/check.mjs
 *   node portfolio-passkey/tools/check.mjs --json     # 결과를 "검사 기록/"에 남깁니다
 *
 * 공개 주소를 검사하려면 앞에 BOARD_URL을 붙입니다.
 * 주지 않으면 개발 서버(http://localhost:5179)에서 검사합니다.
 *
 * 이 검사가 만드는 계정·패스키·메모는 전부 스크래치입니다. 메모 제목에는 항상 "[검사]"를 붙여
 * 실제 기록과 섞이지 않게 합니다.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { decodeCredentialPublicKey } from "@simplewebauthn/server/helpers";
import { SEED_NOTES } from "../lib/seed.js";
import { openBrowser } from "./harness.mjs";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5179").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PROJECT = path.resolve(import.meta.dirname, "..");
const LOG_DIR = path.join(ROOT, "검사 기록");
const WRITE_JSON = process.argv.includes("--json");
const TAG = "[검사]";

const { send, evaluate, useDevice, activeCredentials, close } = await openBrowser({
    url: URL_APP,
    port: 9356,
    profilePrefix: "pk-check-",
});

/* ────────────────────────────────────────────────────────────────── 검사 목록 */

const CHECKS = [
    { n: 1, code: "T08-C10", kind: "카드5", title: "첫 화면이 공개 소개 페이지이고, 아무것도 등록하지 않아도 열린다" },
    { n: 2, code: "T08-C11", kind: "카드5", title: "과제 1의 공개 내용이 한 줄도 빠짐없이 그대로 남아 있다" },
    { n: 3, code: "T08-C13", kind: "카드1", title: "공개 영역과 비공개 영역이 화면에서 구분되어 보인다" },
    { n: 4, code: "T08-C15", kind: "카드1", title: "패스키로 들어가지 않은 상태에서는 비공개 내용이 화면에 없다" },
    { n: 5, code: "T08-C18", kind: "카드1", title: "로그인하지 않은 채 받은 페이지 소스 어디에도 비공개 내용이 없다" },
    { n: 6, code: "T08-C16", kind: "카드1", title: "비공개 자료를 서버에 직접 요청하면 거절된다" },
    { n: 7, code: "T08-C17", kind: "카드1", title: "그 거절이 401 또는 403으로 이루어진다" },
    { n: 8, code: "T08-C35", kind: "카드3", title: "제출물 어디에도 비밀번호를 입력하는 칸이 없다" },
    { n: 9, code: "T08-C12", kind: "카드5", title: "제출물에 실제 연락처·신분증 번호 같은 개인정보가 없다" },
    { n: 10, code: "T08-C19", kind: "카드2", title: "서버가 등록용 질문을 만들어 보내고, 확인할 때까지 보관한다" },
    { n: 11, code: "T08-C20", kind: "카드2", title: "등록 요청마다 질문 값이 서로 다르다" },
    { n: 12, code: "T08-C25", kind: "카드2", title: "등록을 중간에 취소하면 계정도 패스키도 만들어지지 않는다" },
    { n: 13, code: "T08-C21", kind: "카드2", title: "등록이 끝나면 서버에 공개키가 저장된다" },
    { n: 14, code: "T08-C22", kind: "카드2", title: "저장된 값이 공개키다 — 비밀번호가 아니다" },
    { n: 15, code: "T08-C23", kind: "카드2", title: "등록 요청 본문에 개인키가 실려 있지 않다" },
    { n: 16, code: "T08-C24", kind: "카드2", title: "등록한 패스키에 사람이 알아볼 수 있는 이름이 붙는다" },
    { n: 17, code: "T08-C14", kind: "카드1", title: "비공개 영역에 들어간 항목이 세 개 이상이다" },
    { n: 18, code: "T08-C27", kind: "카드3", title: "로그인할 때도 서버가 매번 새 질문을 만들어 보낸다" },
    { n: 19, code: "T08-C28", kind: "카드3", title: "로그인 요청마다 질문 값이 서로 다르다" },
    { n: 20, code: "T08-C29", kind: "카드3", title: "서버가 저장해 둔 공개키로 서명을 확인한 뒤에만 통과시킨다" },
    { n: 21, code: "T08-C30", kind: "카드3", title: "서명이 한 글자만 달라도 거절된다 (성공 요청과 나란히)" },
    { n: 22, code: "T08-C31", kind: "카드3", title: "이미 한 번 쓴 질문으로 다시 로그인하려 하면 거절된다" },
    { n: 23, code: "T08-C32", kind: "카드3", title: "로그인 뒤 사람을 알아보는 것은 세션이다 (서버가 들고 있는 값)" },
    { n: 24, code: "T08-C34", kind: "카드3", title: "세션 값이 페이지의 자바스크립트에 노출되지 않는다" },
    { n: 25, code: "T08-C33", kind: "카드3", title: "로그아웃한 뒤 같은 세션 값으로 다시 요청하면 거절된다" },
    { n: 26, code: "T08-C42", kind: "카드4", title: "한 계정에 패스키가 두 개 등록되어 있다" },
    { n: 27, code: "T08-C43", kind: "카드4", title: "패스키 목록에 각각의 이름과 등록한 날짜가 보인다" },
    { n: 28, code: "T08-C44", kind: "카드4", title: "패스키 하나를 지운 뒤 남은 하나로 들어갈 수 있다" },
    { n: 29, code: "T08-C45", kind: "카드4", title: "지운 패스키로는 더 이상 들어갈 수 없다" },
    { n: 30, code: "T08-C36", kind: "카드5", title: "패스키를 등록한 계정이 두 개이고, 각각 서로 다른 비공개 내용이 있다" },
    { n: 31, code: "T08-C37", kind: "카드5", title: "한쪽 패스키로 다른 쪽 비공개 자료를 읽으려는 요청이 거절된다" },
    { n: 32, code: "T08-C38", kind: "카드5", title: "반대 방향(다른 쪽에서 첫 쪽으로)의 요청도 똑같이 거절된다" },
    { n: 33, code: "T08-C39", kind: "카드5", title: "거절 앞뒤로 반대편의 자료 건수가 같다" },
    { n: 34, code: "T08-C40", kind: "카드5", title: "요청 본문에 남의 계정 id를 적어 보내도 내 자료로만 저장된다" },
    { n: 35, code: "T08-C46", kind: "카드4", title: "마지막 패스키를 지우면 그 계정은 더 이상 열 수 없다" },
];

const results = new Map();
const pass = (n, detail) => results.set(n, { pass: true, detail });
const fail = (n, detail) => results.set(n, { pass: false, detail });

const guard = async (n, body) => {
    try {
        await body();
    } catch (error) {
        if (!results.has(n)) fail(n, `검사 중 오류 — ${String(error.message).split("\n")[0]}`);
    }
};


/* ── 1단계 · 잠긴 상태에서 (아무 기기도 없이) ───────────────────────────── */

await guard(1, async () => {
    const view = await evaluate(`({
        title: document.title,
        hero: document.querySelector('.hero h1')?.textContent.replace(/\\s+/g,' ').trim(),
        publicSections: [...document.querySelectorAll('main > section')].map(s => s.id || 'hero'),
        gateCount: document.querySelectorAll('input[type=password], form[action*=login]').length,
    })`);
    const hasPublic = ["about", "range", "strengths", "proof"].every((id) =>
        view.publicSections.includes(id),
    );
    if (hasPublic && view.hero?.includes("JIN") && view.gateCount === 0) {
        pass(
            1,
            `로그인 화면이 아니라 소개 페이지가 먼저 열림 — 제목 "${view.title}", 공개 섹션 ${view.publicSections.join("/")}`,
        );
    } else {
        fail(1, `첫 화면: ${JSON.stringify(view)}`);
    }
});

await guard(2, async () => {
    // 과제 1의 원본(커밋 cb23773)에서 눈에 보이는 글자를 뽑아, 지금 화면에 다 있는지 본다.
    const original = execFileSync("git", ["show", "cb23773:index.html"], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
    });
    const visibleText = (html) =>
        html
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<[^>]+>/g, "\n")
            .replace(/&[a-z]+;/gi, " ")
            .split("\n")
            .map((s) => s.replace(/\s+/g, " ").trim())
            .filter((s) => s.length >= 8);

    // 지금 배포된 HTML을 같은 방식으로 훑어 비교한다. 화면 글자(innerText)가 아니라 소스를
    // 보는 이유는 CSS(text-transform 같은 것)가 글자를 바꿔 보여주기 때문이다.
    const served = await (await fetch(URL_APP)).text();
    const currentLines = new Set(visibleText(served));
    const originalLines = visibleText(original);
    const missing = originalLines.filter((line) => !currentLines.has(line));

    if (missing.length === 0) {
        pass(2, `과제 1 원본(cb23773)의 문장 ${originalLines.length}개가 한 줄도 빠짐없이 그대로 남아 있음`);
    } else {
        fail(2, `빠진 문장 ${missing.length}개: ${missing.slice(0, 3).join(" / ")}`);
    }
});

await guard(3, async () => {
    const view = await evaluate(`({
        hasPrivateSection: Boolean(document.querySelector('#private')),
        heading: document.querySelector('#private h2')?.textContent.trim(),
        badge: document.querySelector("[data-testid='private-state']")?.textContent.trim(),
        badgeState: document.querySelector("[data-testid='private-state']")?.dataset.state,
        navLink: [...document.querySelectorAll('nav a')].some(a => a.getAttribute('href') === '#private'),
        differentBackground: getComputedStyle(document.querySelector('#private')).backgroundColor
            !== getComputedStyle(document.querySelector('#proof')).backgroundColor,
    })`);
    if (view.hasPrivateSection && view.badgeState === "locked" && view.navLink && view.differentBackground) {
        pass(
            3,
            `"${view.heading}" 구역이 따로 있고 배경색도 공개 구역과 다름 · 상태 배지 "${view.badge}" · 메뉴에도 링크 있음`,
        );
    } else {
        fail(3, JSON.stringify(view));
    }
});

await guard(4, async () => {
    const view = await evaluate(`({
        notesHtml: document.querySelector("[data-testid='notes']")?.innerHTML.trim(),
        unlockedHidden: document.querySelector('#unlocked-view').hidden,
        bodyText: document.body.innerText,
    })`);
    const leaked = SEED_NOTES.filter((note) => view.bodyText.includes(note.body.slice(0, 20)));
    if (view.unlockedHidden && view.notesHtml === "" && leaked.length === 0) {
        pass(4, `비공개 영역이 화면에 그려지지 않음(unlocked-view hidden, 목록 비어 있음) · 본문에 비공개 문구 0건`);
    } else {
        fail(4, `유출 ${leaked.length}건 · unlockedHidden=${view.unlockedHidden}`);
    }
});

await guard(5, async () => {
    const html = await (await fetch(URL_APP, { headers: { "Cache-Control": "no-cache" } })).text();
    const leaked = SEED_NOTES.filter(
        (note) => html.includes(note.body.slice(0, 20)) || html.includes(note.title),
    );
    if (leaked.length === 0) {
        pass(
            5,
            `쿠키 없이 받은 HTML ${html.length}바이트 안에 비공개 문구 0건 — 내용은 인증 뒤 app.js가 받아 채우므로 소스에 아예 없음`,
        );
    } else {
        fail(5, `소스에 그대로 들어 있는 항목: ${leaked.map((n) => n.title).join(", ")}`);
    }
});

let unauthList;
let unauthOne;
await guard(6, async () => {
    unauthList = await fetch(`${URL_APP}/api/private-notes`);
    const body = await unauthList.text();
    unauthOne = await fetch(`${URL_APP}/api/private-notes/00000000-0000-0000-0000-000000000000`);
    const oneBody = await unauthOne.text();
    const leaked = SEED_NOTES.some((n) => body.includes(n.title) || oneBody.includes(n.title));
    if (!unauthList.ok && !unauthOne.ok && !leaked) {
        pass(
            6,
            `GET /api/private-notes → ${unauthList.status} ${body.trim()} · GET /api/private-notes/:id → ${unauthOne.status} (몸통에 비공개 내용 0건)`,
        );
    } else {
        fail(6, `목록 ${unauthList.status} · 단건 ${unauthOne.status} · 유출 ${leaked}`);
    }
});

await guard(7, async () => {
    if ([401, 403].includes(unauthList.status) && [401, 403].includes(unauthOne.status)) {
        pass(7, `두 요청 모두 ${unauthList.status} — 화면에서 숨긴 게 아니라 서버가 끊음`);
    } else {
        fail(7, `상태 코드가 401/403이 아님: ${unauthList.status}, ${unauthOne.status}`);
    }
});

await guard(8, async () => {
    const domCount = await evaluate(`document.querySelectorAll('input[type=password]').length`);
    const files = sourceFiles();
    const offenders = files.filter((f) => /type\s*=\s*["']password["']/i.test(fs.readFileSync(f, "utf8")));
    if (domCount === 0 && offenders.length === 0) {
        pass(8, `화면에 비밀번호 입력란 0개 · 소스 ${files.length}개 파일에도 password 입력란 없음`);
    } else {
        fail(8, `화면 ${domCount}개 · 소스 ${offenders.map((f) => path.basename(f)).join(", ")}`);
    }
});

await guard(9, async () => {
    const patterns = [
        { name: "휴대전화", re: /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/ },
        { name: "주민등록번호", re: /\b\d{6}[-\s]?[1-4]\d{6}\b/ },
        { name: "이메일", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
    ];
    const hits = [];
    for (const file of sourceFiles()) {
        const text = fs.readFileSync(file, "utf8");
        for (const p of patterns) {
            const m = text.match(p.re);
            if (m) hits.push(`${path.basename(file)}: ${p.name} "${m[0]}"`);
        }
    }
    if (hits.length === 0) {
        pass(9, `소스·화면 전체에서 연락처·신분증 번호 형태 0건 — 비공개 자리 내용도 전부 지어낸 것`);
    } else {
        fail(9, hits.join(" / "));
    }
});

/* ── 2단계 · 계정 A 등록 (기기 1) ───────────────────────────────────────── */

await useDevice("기기1");

await guard(10, async () => {
    const first = await evaluate(`window.__flow.registerOptions('${TAG} 기기1')`);
    if (first.status === 200 && first.challengeId && first.challenge?.length >= 20) {
        pass(
            10,
            `등록 질문 발급 200 · challengeId ${first.challengeId} · challenge ${first.challenge.slice(0, 16)}… (${first.challenge.length}자) — 서버가 DB에 보관하고 확인 때 한 번만 쓴다`,
        );
    } else {
        fail(10, JSON.stringify(first));
    }
});

await guard(11, async () => {
    const a = await evaluate(`window.__flow.registerOptions('${TAG} 기기1')`);
    const b = await evaluate(`window.__flow.registerOptions('${TAG} 기기1')`);
    if (a.challenge && b.challenge && a.challenge !== b.challenge) {
        pass(11, `두 번 요청한 질문이 서로 다름 — ${a.challenge.slice(0, 12)}… vs ${b.challenge.slice(0, 12)}…`);
    } else {
        fail(11, `같은 질문이 두 번 나옴: ${a.challenge}`);
    }
});

await guard(12, async () => {
    const cancelled = await evaluate(`window.__flow.registerCancelled('${TAG} 취소될 기기')`);
    const me = await evaluate(`window.__flow.get('/api/me')`);
    const onDevice = await activeCredentials();
    if (cancelled.cancelled && me.status === 401 && onDevice.length === 0) {
        pass(
            12,
            `기기 확인 단계에서 취소(${cancelled.name}) → /api/me 여전히 401, 기기에도 자격증명 0개, 계정 생성 안 됨 ` +
                `(서버에 남는 건 2분 뒤 만료되는 질문 한 줄뿐이고 그건 계정이 아니다)`,
        );
    } else {
        fail(12, `취소=${cancelled.cancelled} · me=${me.status} · 기기 자격증명 ${onDevice.length}개`);
    }
});

let accountA = null;
let registrationA = null;

await guard(13, async () => {
    registrationA = await evaluate(`window.__flow.register('${TAG} 기기1')`);
    if (!registrationA.ok) return fail(13, `등록 실패: ${JSON.stringify(registrationA)}`);

    const me = await evaluate(`window.__flow.get('/api/me')`);
    accountA = me.data;
    const credential = accountA?.credentials?.[0];
    if (me.status === 200 && credential?.publicKey) {
        pass(
            13,
            `등록 확인 200 → 서버에 공개키 저장됨 (credential ${credential.shortId}…, 공개키 ${credential.publicKey.length}자 base64url)`,
        );
    } else {
        fail(13, `me=${me.status} ${JSON.stringify(me.data).slice(0, 200)}`);
    }
});

await guard(14, async () => {
    const stored = accountA.credentials[0].publicKey;
    const decoded = decodeCredentialPublicKey(new Uint8Array(Buffer.from(stored, "base64url")));
    // COSE 키 라벨 — 1번이 키 종류, 3번이 서명 알고리즘.
    const KTY = { 1: "OKP(에드워즈 곡선)", 2: "EC2(타원곡선)", 3: "RSA" };
    const ALG = { "-8": "EdDSA(Ed25519)", "-7": "ES256(P-256)", "-257": "RS256" };
    const kty = decoded.get(1);
    const alg = decoded.get(3);
    const looksLikeHash = /^\$2[aby]\$/.test(stored); // bcrypt 해시 모양

    if (KTY[kty] && ALG[String(alg)] && !looksLikeHash) {
        pass(
            14,
            `저장된 값이 COSE 공개키로 그대로 해독됨 — 키 종류 ${KTY[kty]}(kty=${kty}), 서명 알고리즘 ${ALG[String(alg)]}(alg=${alg}). ` +
                `비밀번호도 그 해시도 아니다: 이 값으로는 서명을 확인만 할 수 있고 만들어 낼 수 없다`,
        );
    } else {
        fail(14, `해독 결과가 공개키 모양이 아님: kty=${kty} alg=${alg}`);
    }
});

await guard(15, async () => {
    const body = registrationA.requestBody;
    const inner = registrationA.responseKeys;
    const flat = JSON.stringify(body).toLowerCase();
    const suspicious = ["privatekey", "private_key", "secret", "password", "seed"].filter((k) =>
        flat.includes(k),
    );
    if (suspicious.length === 0) {
        pass(
            15,
            `등록 요청 본문의 필드는 ${registrationA.requestBodyKeys.join("/")} 뿐이고 response 안은 ${inner.join("/")} — ` +
                `개인키를 담는 자리가 아예 없다(WebAuthn 규격상 존재하지 않는다). 서버로 간 건 공개키와 서명뿐`,
        );
    } else {
        fail(15, `의심스러운 필드: ${suspicious.join(", ")}`);
    }
});

await guard(16, async () => {
    const credential = accountA.credentials[0];
    if (credential.deviceName === `${TAG} 기기1`) {
        pass(16, `등록할 때 붙인 이름 "${credential.deviceName}"이 서버에 저장되고 목록에 그대로 보임`);
    } else {
        fail(16, `이름: ${credential.deviceName}`);
    }
});

let notesA = [];
await guard(17, async () => {
    const notes = await evaluate(`window.__flow.get('/api/private-notes')`);
    notesA = notes.data.notes ?? [];
    const kinds = [...new Set(notesA.map((n) => n.kind))];
    if (notesA.length >= 3 && kinds.length >= 3) {
        pass(17, `비공개 항목 ${notesA.length}개 (${notesA.map((n) => n.title).join(" / ")})`);
    } else {
        fail(17, `${notesA.length}개 · 종류 ${kinds.length}가지`);
    }
});

/* ── 3단계 · 로그인 (카드 3) ────────────────────────────────────────────── */

await evaluate(`window.__flow.post('/api/logout')`);

await guard(18, async () => {
    const options = await evaluate(`window.__flow.loginOptions()`);
    if (options.status === 200 && options.challenge?.length >= 20) {
        pass(18, `로그인 질문 발급 200 · challenge ${options.challenge.slice(0, 16)}… (${options.challenge.length}자)`);
    } else {
        fail(18, JSON.stringify(options));
    }
});

await guard(19, async () => {
    const a = await evaluate(`window.__flow.loginOptions()`);
    const b = await evaluate(`window.__flow.loginOptions()`);
    if (a.challenge !== b.challenge) {
        pass(19, `두 번 요청한 로그인 질문이 서로 다름 — ${a.challenge.slice(0, 12)}… vs ${b.challenge.slice(0, 12)}…`);
    } else {
        fail(19, `같은 질문이 두 번 나옴`);
    }
});

await guard(21, async () => {
    const tampered = await evaluate(`window.__flow.login({ tamper: true })`);
    if (!tampered.ok && tampered.status === 401) {
        pass(
            21,
            `서명 한 글자만 바꿔 보냄 → ${tampered.status} "${tampered.data.error}" (아래 검사 20의 성공 요청과 같은 주소·같은 방식, 다른 건 서명 한 글자뿐)`,
        );
    } else {
        fail(21, `틀린 서명이 통과함: ${JSON.stringify(tampered)}`);
    }
});

await guard(20, async () => {
    const login = await evaluate(`window.__flow.login()`);
    const me = await evaluate(`window.__flow.get('/api/me')`);
    if (login.ok && me.status === 200) {
        pass(
            20,
            `제대로 된 서명 → 200 (패스키 "${login.data.deviceName}"로 들어감), 이어서 /api/me 200 — ` +
                `서버가 저장해 둔 공개키로 확인이 됐을 때만 통과`,
        );
    } else {
        fail(20, JSON.stringify(login));
    }
});

await guard(22, async () => {
    const replayed = await evaluate(`window.__flow.login({ replay: true })`);
    if (replayed.ok && replayed.replay && !replayed.replay.ok) {
        pass(
            22,
            `같은 질문·같은 서명을 한 번 더 보냄 → 첫 번째 ${replayed.status} / 두 번째 ${replayed.replay.status} "${replayed.replay.error}" ` +
                `— 질문이 쓰이는 순간 used_at이 찍혀 재사용이 막힌다`,
        );
    } else {
        fail(22, JSON.stringify(replayed));
    }
});

let sessionCookie = null;
await guard(23, async () => {
    const { cookies } = await send("Network.getCookies", { urls: [URL_APP] });
    sessionCookie = cookies.find((c) => c.name === "pk_session");
    const me = await evaluate(`window.__flow.get('/api/me')`);
    if (sessionCookie && me.status === 200) {
        pass(
            23,
            `세션 방식 — 쿠키 pk_session(HttpOnly=${sessionCookie.httpOnly}, SameSite=${sessionCookie.sameSite}) 하나만 오가고, ` +
                `값 자체엔 아무 정보도 없다(JWT 아님). 진짜 판단은 서버의 pk_sessions 행이 있는지로 한다`,
        );
    } else {
        fail(23, `쿠키 ${Boolean(sessionCookie)} · me ${me.status}`);
    }
});

await guard(24, async () => {
    const exposed = await evaluate(`document.cookie`);
    if (!exposed.includes("pk_session") && sessionCookie?.httpOnly) {
        pass(
            24,
            `document.cookie에 세션 값이 보이지 않음(HttpOnly) — 화면 스크립트가 읽을 수 없으니 캡처에도 값이 남지 않는다. document.cookie = "${exposed}"`,
        );
    } else {
        fail(24, `document.cookie = "${exposed}"`);
    }
});

await guard(25, async () => {
    // 로그아웃 전에 쿠키 값을 따로 적어 두었다가, 로그아웃 뒤 그 값 그대로 다시 보낸다.
    const savedValue = sessionCookie.value;
    const before = await fetch(`${URL_APP}/api/private-notes`, {
        headers: { Cookie: `pk_session=${savedValue}` },
    });
    const beforeBody = await before.json();

    await evaluate(`window.__flow.post('/api/logout')`);

    const after = await fetch(`${URL_APP}/api/private-notes`, {
        headers: { Cookie: `pk_session=${savedValue}` },
    });
    const afterBody = await after.text();

    if (before.status === 200 && (beforeBody.notes?.length ?? 0) > 0 && after.status === 401) {
        pass(
            25,
            `같은 세션 값으로 같은 주소에 두 번 — 로그아웃 전 ${before.status}(내 자료 ${beforeBody.notes.length}건) / 로그아웃 뒤 ${after.status} ${afterBody.trim()}. ` +
                `세션 행을 지웠으니 그 값은 그 즉시 아무 의미가 없다`,
        );
    } else {
        fail(25, `전 ${before.status}(${beforeBody.notes?.length}건) · 후 ${after.status}`);
    }
});

/* ── 4단계 · 기기를 잃어버렸을 때 (카드 4) ──────────────────────────────── */

await guard(26, async () => {
    await evaluate(`window.__flow.login()`); // 기기1로 다시 들어감

    // 기기2를 붙이고(기기1은 떼어 둔다) 같은 계정에 패스키를 하나 더 등록한다.
    await useDevice("기기2");
    const second = await evaluate(`window.__flow.register('${TAG} 기기2')`);
    const me = await evaluate(`window.__flow.get('/api/me')`);

    if (second.ok && me.data.credentials.length === 2) {
        pass(
            26,
            `기기2에서 패스키 추가 → 한 계정에 ${me.data.credentials.length}개: ` +
                me.data.credentials.map((c) => `"${c.deviceName}"`).join(", "),
        );
    } else {
        fail(26, `등록 ${second.ok} · 개수 ${me.data.credentials?.length}`);
    }
});

await guard(27, async () => {
    const view = await evaluate(`window.__pk.refresh().then(() => ({
        count: document.querySelector("[data-testid='credential-count']").textContent,
        rows: [...document.querySelectorAll("[data-testid='credentials'] .credential")].map(li => ({
            name: li.querySelector('strong').textContent.trim(),
            meta: li.querySelector('.credential-meta').textContent.trim(),
        })),
    }))`);
    const allHaveDate = view.rows.every((r) => /\d{4}\.\s?\d{1,2}\.\s?\d{1,2}/.test(r.meta));
    if (view.rows.length === 2 && allHaveDate) {
        pass(
            27,
            `목록에 ${view.count}개 — ` + view.rows.map((r) => `${r.name} (${r.meta})`).join(" · "),
        );
    } else {
        fail(27, JSON.stringify(view));
    }
});

let deletedCredentialId = null;
await guard(29, async () => {
    const me = await evaluate(`window.__flow.get('/api/me')`);
    const first = me.data.credentials.find((c) => c.deviceName === `${TAG} 기기1`);
    deletedCredentialId = first.id;

    const deleted = await evaluate(`window.__flow.del('/api/credentials/${first.id}')`);
    await evaluate(`window.__flow.post('/api/logout')`);

    // 지운 패스키가 들어 있는 기기1로 바꿔 끼우고 들어가려 해 본다.
    await useDevice("기기1");
    const attempt = await evaluate(`window.__flow.login()`);

    if (deleted.ok && deleted.data.remaining === 1 && !attempt.ok) {
        pass(
            29,
            `기기1의 패스키를 지움(남은 ${deleted.data.remaining}개) → 그 기기로 로그인 시도 ${attempt.status} "${attempt.data?.error ?? attempt.error}" ` +
                `— 서버에 그 자격증명이 없으니 서명을 확인할 대상 자체가 없다`,
        );
    } else {
        fail(29, `삭제 ${JSON.stringify(deleted.data)} · 로그인 시도 ${JSON.stringify(attempt)}`);
    }
});

await guard(28, async () => {
    // 남아 있는 기기2로 바꿔 끼운다.
    await useDevice("기기2");
    const attempt = await evaluate(`window.__flow.login()`);
    const me = await evaluate(`window.__flow.get('/api/me')`);

    if (attempt.ok && me.status === 200) {
        pass(
            28,
            `기기1을 잃어버린 셈 치고 기기2로 로그인 → ${attempt.status} 성공("${attempt.data.deviceName}"), 비공개 자리 다시 열림. ` +
                `패스키를 두 개 등록해 둔 덕에 계정을 잃지 않았다`,
        );
    } else {
        fail(28, JSON.stringify(attempt));
    }
});

/* ── 5단계 · 두 계정 사이 격리 (카드 5) ────────────────────────────────── */

let accountBNoteId = null;
let accountANoteId = null;

await guard(30, async () => {
    accountANoteId = notesA[0].id;
    await evaluate(`window.__flow.post('/api/private-notes', ${JSON.stringify({ kind: "retro", title: `${TAG} A만의 메모`, body: "계정 A에만 있는 내용입니다." })})`);
    const listA = await evaluate(`window.__flow.get('/api/private-notes')`);

    // 계정 B — 새 기기, 새 계정
    await evaluate(`window.__flow.post('/api/logout')`);
    await useDevice("기기3");
    const registered = await evaluate(`window.__flow.register('${TAG} 기기3')`);
    await evaluate(`window.__flow.post('/api/private-notes', ${JSON.stringify({ kind: "retro", title: `${TAG} B만의 메모`, body: "계정 B에만 있는 내용입니다." })})`);
    const listB = await evaluate(`window.__flow.get('/api/private-notes')`);
    accountBNoteId = listB.data.notes.find((n) => n.title === `${TAG} B만의 메모`).id;

    const meB = await evaluate(`window.__flow.get('/api/me')`);
    const titlesA = listA.data.notes.map((n) => n.title);
    const titlesB = listB.data.notes.map((n) => n.title);
    const overlap = titlesA.filter((t) => t.includes("A만의")).some((t) => titlesB.includes(t));

    if (registered.ok && meB.data.account.id !== accountA.account.id && !overlap) {
        pass(
            30,
            `계정 2개 — A(${accountA.account.id.slice(0, 8)}…)에 "${TAG} A만의 메모", B(${meB.data.account.id.slice(0, 8)}…)에 "${TAG} B만의 메모". ` +
                `서로의 목록에 상대 항목이 0건`,
        );
    } else {
        fail(30, `같은 계정이거나 내용이 겹침`);
    }
});

await guard(31, async () => {
    // 지금 세션은 B. A의 자료 id를 직접 넣어 열어 본다.
    const mine = await evaluate(`window.__flow.get('/api/private-notes/${accountBNoteId}')`);
    const theirs = await evaluate(`window.__flow.get('/api/private-notes/${accountANoteId}')`);
    if (mine.status === 200 && theirs.status === 404) {
        pass(
            31,
            `B 세션 · 같은 주소 형태로 두 번 — 내 자료 ${mine.status}("${mine.data.note.title}") / A의 자료 ${theirs.status} "${theirs.data.error}". ` +
                `403이 아니라 404인 것은 그 id가 있다는 사실조차 알려주지 않기 위해서다`,
        );
    } else {
        fail(31, `내 것 ${mine.status} · 남의 것 ${theirs.status}`);
    }
});

await guard(33, async () => {
    // 거절 앞뒤로 A의 자료 건수가 그대로인지 — A로 돌아가 세어 본다.
    await evaluate(`window.__flow.post('/api/logout')`);
    await useDevice("기기2");
    await evaluate(`window.__flow.login()`);
    const after = await evaluate(`window.__flow.get('/api/private-notes')`);
    const expected = notesA.length + 1; // 씨앗 3개 + 위에서 넣은 "A만의 메모"
    if (after.data.notes.length === expected) {
        pass(
            33,
            `B가 A의 자료를 열려다 거절당한 앞뒤로 A의 건수 ${expected}건 그대로 — 거절이 자료를 건드리지도, 새로 만들지도 않았다`,
        );
    } else {
        fail(33, `기대 ${expected}건 · 실제 ${after.data.notes.length}건`);
    }
});

await guard(32, async () => {
    // 지금 세션은 A. 반대 방향으로 B의 자료를 열어 본다.
    const mine = await evaluate(`window.__flow.get('/api/private-notes/${accountANoteId}')`);
    const theirs = await evaluate(`window.__flow.get('/api/private-notes/${accountBNoteId}')`);
    if (mine.status === 200 && theirs.status === 404) {
        pass(
            32,
            `반대 방향도 같음 — A 세션에서 내 자료 ${mine.status}("${mine.data.note.title}") / B의 자료 ${theirs.status} "${theirs.data.error}"`,
        );
    } else {
        fail(32, `내 것 ${mine.status} · 남의 것 ${theirs.status}`);
    }
});

await guard(34, async () => {
    const spoof = {
        kind: "retro",
        title: `${TAG} 남의 id를 적어 보낸 요청`,
        body: "user_id를 B로 적어 보냈다.",
        user_id: "00000000-0000-0000-0000-0000000000bb",
        userId: "00000000-0000-0000-0000-0000000000bb",
    };
    const created = await evaluate(`window.__flow.post('/api/private-notes', ${JSON.stringify(spoof)})`);
    if (created.status !== 201) return fail(34, `저장 실패: ${JSON.stringify(created)}`);
    const newId = created.data.note.id;
    const readBack = await evaluate(`window.__flow.get('/api/private-notes/${newId}')`);

    // B로 돌아가 그 자료가 B에게 보이는지 확인한다 — 보이면 안 된다.
    await evaluate(`window.__flow.post('/api/logout')`);
    await useDevice("기기3");
    await evaluate(`window.__flow.login()`);
    const fromB = await evaluate(`window.__flow.get('/api/private-notes/${newId}')`);
    const listB = await evaluate(`window.__flow.get('/api/private-notes')`);
    const showedUpInB = listB.data.notes.some((n) => n.id === newId);

    if (readBack.status === 200 && fromB.status === 404 && !showedUpInB) {
        pass(
            34,
            `본문에 user_id를 남의 것으로 적어 보냈지만 저장된 주인은 나(A) — A에서 읽으면 ${readBack.status}, B에서 같은 id를 열면 ${fromB.status}, B 목록에도 안 뜸. ` +
                `주인은 세션에서만 정해진다(api/private-notes/index.js)`,
        );
    } else {
        fail(34, `생성 ${created.status} · A ${readBack.status} · B ${fromB.status} · B목록노출 ${showedUpInB}`);
    }
});

/* ── 6단계 · 마지막 패스키를 지우면 (카드 4의 나머지) ──────────────────── */

await guard(35, async () => {
    // 지금 세션은 B, 기기3 하나뿐이다.
    const me = await evaluate(`window.__flow.get('/api/me')`);
    const only = me.data.credentials[0];
    const deleted = await evaluate(`window.__flow.del('/api/credentials/${only.id}')`);
    const afterMe = await evaluate(`window.__flow.get('/api/me')`);
    const attempt = await evaluate(`window.__flow.login()`);

    if (
        me.data.credentials.length === 1 &&
        deleted.data.remaining === 0 &&
        deleted.data.accountUnreachable === true &&
        afterMe.status === 401 &&
        !attempt.ok
    ) {
        pass(
            35,
            `마지막 하나를 지움 → 남은 패스키 0개, 세션도 함께 끊겨 /api/me ${afterMe.status}, 다시 들어가려는 시도도 ${attempt.status}. ` +
                `이메일도 비밀번호도 없으니 이 계정은 되살릴 방법이 없다 — 막지 않고 화면에서 경고만 한다`,
        );
    } else {
        fail(
            35,
            `삭제 ${JSON.stringify(deleted.data)} · me ${afterMe.status} · 재로그인 ${JSON.stringify(attempt).slice(0, 120)}`,
        );
    }
});

/* ─────────────────────────────────────────────────────────────────── 출력 */

function sourceFiles() {
    const roots = ["index.html", "app.js", "po.md"].map((f) => path.join(PROJECT, f));
    const walk = (dir) =>
        fs.existsSync(dir)
            ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
                  const full = path.join(dir, entry.name);
                  return entry.isDirectory() ? walk(full) : [full];
              })
            : [];
    return [...roots, ...walk(path.join(PROJECT, "api")), ...walk(path.join(PROJECT, "lib"))].filter(
        (f) => fs.existsSync(f),
    );
}

const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "short",
}).format(new Date());

console.log(`\n검사 대상 ${URL_APP}\n`);

const rows = CHECKS.map((check) => {
    const result = results.get(check.n) ?? { pass: false, detail: "실행되지 않았습니다" };
    console.log(
        `${String(check.n).padStart(2)}  ${result.pass ? "PASS" : "FAIL"}  [${check.kind} ${check.code}] ${check.title}`,
    );
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
    const file = path.join(LOG_DIR, `portfolio-passkey-${stamp.replace(/[: ]/g, "-")}.json`);
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

close();
process.exit(0);
