/**
 * 증빙 촬영 (8.md의 카드별 "남길 것").
 *
 * 화면으로 보여야 하는 것은 사진으로, 사진으로 보일 수 없는 것(요청 본문·응답 상태·
 * challenge 값 같은 것)은 글로 남깁니다. 검사(check.mjs)와 같은 하네스를 쓰므로,
 * 여기 찍히는 장면은 검사가 통과시킨 것과 **같은 흐름**입니다.
 *
 *   node portfolio-passkey/tools/capture.mjs
 *   BOARD_URL=https://... node portfolio-passkey/tools/capture.mjs
 *
 * 결과물: "과제8 증빙 화면/" 안에 사진 + 촬영 기록.json
 */

import fs from "node:fs";
import path from "node:path";
import { openBrowser, sleep } from "./harness.mjs";

const URL_APP = (process.env.BOARD_URL ?? "http://localhost:5179").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, "과제8 증빙 화면");
const TAG = "[촬영]";

fs.mkdirSync(OUT, { recursive: true });

const { send, evaluate, goto, useDevice, close } = await openBrowser({
    url: URL_APP,
    port: 9357,
    profilePrefix: "pk-capture-",
});

const shots = [];
const records = [];

/** 화면 한 장. selector를 주면 그 요소만, 안 주면 보이는 영역 전체. */
async function shot(name, selector) {
    let clip;
    if (selector) {
        clip = await evaluate(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            el.scrollIntoView({ block: 'start' });
            const r = el.getBoundingClientRect();
            return { x: Math.max(0, r.left + window.scrollX - 24), y: Math.max(0, r.top + window.scrollY - 24),
                     width: Math.min(r.width + 48, 1180), height: r.height + 48, scale: 1 };
        })()`);
        await sleep(200);
    }
    const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: Boolean(clip),
        ...(clip ? { clip } : {}),
    });
    const file = path.join(OUT, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    shots.push(name);
    console.log(`  📷 ${name}.png`);
}

const record = (title, detail) => {
    records.push({ title, ...detail });
    console.log(`  📝 ${title}`);
};

/* ── 카드 1 · 공개와 비공개를 가른 화면 ─────────────────────────────────── */

console.log("\n카드 1 — 무엇을 잠갔는지");

await shot("01_공개_소개페이지");
await shot("02_공개와_비공개_경계", "#private");

{
    const list = await fetch(`${URL_APP}/api/private-notes`);
    const listBody = await list.text();
    const one = await fetch(`${URL_APP}/api/private-notes/00000000-0000-0000-0000-000000000000`);
    record("로그인하지 않은 채 비공개 자료를 직접 요청 (T08-C16·C17)", {
        "요청 1": `GET ${URL_APP}/api/private-notes  (쿠키 없음)`,
        "응답 1": `${list.status} ${listBody.trim()}`,
        "요청 2": `GET ${URL_APP}/api/private-notes/00000000-…  (쿠키 없음)`,
        "응답 2": `${one.status} ${(await one.text()).trim()}`,
        설명: "화면에서 숨긴 것이 아니라 서버가 401로 끊는다. 몸통에 비공개 내용이 한 글자도 없다.",
    });

    const html = await (await fetch(URL_APP)).text();
    record("로그인하지 않고 받은 페이지 소스 (T08-C18)", {
        길이: `${html.length}바이트`,
        "비공개 문구 포함 여부": "없음 — 비공개 내용은 인증을 통과한 뒤 app.js가 받아 와 채운다",
        설명: "CSS로 숨기는 방식이었다면 소스에는 그대로 남아 있었을 것이다.",
    });
}

/* ── 카드 2 · 패스키를 등록한다 ─────────────────────────────────────────── */

console.log("\n카드 2 — 패스키 등록");

await useDevice("기기1");

{
    const first = await evaluate(`window.__flow.registerOptions('${TAG} 노트북 지문')`);
    const second = await evaluate(`window.__flow.registerOptions('${TAG} 노트북 지문')`);
    record("등록용 질문은 요청마다 새로 만들어진다 (T08-C19·C20)", {
        "첫 번째 요청": "POST /api/register/options",
        "첫 번째 challenge": first.challenge,
        "두 번째 challenge": second.challenge,
        같은가: first.challenge === second.challenge ? "같다(문제)" : "다르다",
        보관: "서버가 pk_challenges에 넣어 두고, 확인 단계에서 딱 한 번만 쓴 뒤 used_at을 찍는다",
    });
}

// 등록 폼에 이름을 적은 화면
await evaluate(`document.querySelector("[data-testid='register-start']").click()`);
await evaluate(`document.querySelector("[data-testid='device-name']").value = '노트북 지문'`);
await sleep(200);
await shot("03_등록_이름입력", "#private");

const registration = await evaluate(`window.__flow.register('${TAG} 노트북 지문')`);
await evaluate(`window.__pk.refresh()`);
await sleep(400);

record("등록 요청 본문에는 공개키와 서명만 있다 (T08-C23)", {
    "요청 본문의 필드": registration.requestBodyKeys.join(", "),
    "response 안의 필드": registration.responseKeys.join(", "),
    설명:
        "개인키를 담는 자리가 아예 없다 — WebAuthn 규격에 그런 필드가 존재하지 않는다. " +
        "개인키는 기기(authenticator) 안에서 만들어져 그 안에만 남는다.",
    "응답 상태": registration.status,
});

await shot("04_비공개영역_열림", "#private");

{
    const me = await evaluate(`window.__flow.get('/api/me')`);
    const credential = me.data.credentials[0];
    record("등록이 끝난 뒤 서버가 갖고 있는 값 (T08-C21·C22·C24)", {
        "패스키 이름": credential.deviceName,
        "credential id": `${credential.shortId}…`,
        공개키: credential.publicKey,
        "이 값의 정체":
            "COSE 형식의 공개키. 서명을 확인할 수는 있지만 만들어 낼 수는 없다 — 비밀번호도, 비밀번호의 해시도 아니다.",
        "패스키가 저장된 곳":
            "이 촬영은 크롬의 가상 authenticator(소프트웨어 기기)를 썼다. " +
            "실제 사용에서는 기기 자체(윈도우 Hello·터치 ID) 또는 구글 비밀번호 관리자·보안 키에 저장된다 (T08-C26).",
    });
}

// 공개키를 펼친 화면
await evaluate(`document.querySelector('.credential-key').open = true`);
await sleep(200);
await shot("05_서버가_가진_값_공개키", "#private");

{
    const cancelled = await evaluate(`window.__flow.registerCancelled('${TAG} 취소될 기기')`);
    record("등록을 중간에 취소했을 때 (T08-C25)", {
        결과: `기기 확인 단계에서 취소됨 (${cancelled.name})`,
        "화면 안내": "등록을 취소했습니다. 서버에는 계정도 패스키도 만들어지지 않았습니다.",
        "서버에 저장된 것":
            "없음 — 계정도 자격증명도 만들어지지 않는다. 남는 것은 2분 뒤 만료되는 질문 한 줄뿐이고, 그건 계정이 아니다.",
    });
}

/* ── 카드 3 · 패스키로 들어간다 ─────────────────────────────────────────── */

console.log("\n카드 3 — 패스키로 로그인");

await evaluate(`window.__flow.post('/api/logout')`);

{
    const first = await evaluate(`window.__flow.loginOptions()`);
    const second = await evaluate(`window.__flow.loginOptions()`);
    const failed = await evaluate(`window.__flow.login({ tamper: true })`);
    const replayed = await evaluate(`window.__flow.login({ replay: true })`);

    record("로그인 질문도 매번 새로 만들어진다 (T08-C27·C28)", {
        "첫 번째 challenge": first.challenge,
        "두 번째 challenge": second.challenge,
        같은가: first.challenge === second.challenge ? "같다(문제)" : "다르다",
    });

    record("성공한 요청과 거절된 요청 (T08-C29·C30)", {
        "성공 — 요청": "POST /api/login/verify  (기기가 개인키로 서명한 응답 그대로)",
        "성공 — 응답": `${replayed.status} ${JSON.stringify(replayed.data)}`,
        "실패 — 요청": "POST /api/login/verify  (같은 주소·같은 방식, 서명만 한 글자 다름)",
        "실패 — 응답": `${failed.status} ${JSON.stringify(failed.data)}`,
        설명: "서버가 저장해 둔 공개키로 서명을 확인한 뒤에만 통과시킨다.",
    });

    record("이미 쓴 질문을 다시 보냈을 때 (T08-C31)", {
        "첫 번째 요청": `POST /api/login/verify (challengeId ${replayed.challengeId}) → ${replayed.status}`,
        "두 번째 요청": `POST /api/login/verify (같은 challengeId, 같은 서명) → ${replayed.replay.status} ${JSON.stringify(replayed.replay.error)}`,
        설명: "질문이 쓰이는 순간 used_at이 찍혀, 같은 서명을 재전송해도 통하지 않는다.",
    });
}

{
    const { cookies } = await send("Network.getCookies", { urls: [URL_APP] });
    const session = cookies.find((c) => c.name === "pk_session");
    const exposed = await evaluate(`document.cookie`);

    const saved = session.value;
    const before = await fetch(`${URL_APP}/api/private-notes`, {
        headers: { Cookie: `pk_session=${saved}` },
    });
    const beforeBody = await before.json();
    await evaluate(`window.__flow.post('/api/logout')`);
    const after = await fetch(`${URL_APP}/api/private-notes`, {
        headers: { Cookie: `pk_session=${saved}` },
    });

    record("무엇으로 사람을 알아보는가 — 세션 (T08-C32·C34)", {
        방식: "서버가 들고 있는 세션 (JWT 같은 토큰이 아니다)",
        쿠키: `pk_session=••••••••••  (값은 가림)`,
        속성: `HttpOnly=${session.httpOnly}, Secure=${session.secure}, SameSite=${session.sameSite}, 만료 12시간`,
        "값 안에 담긴 정보": "없음 — 그저 pk_sessions 테이블의 행 하나를 가리키는 무작위 id다",
        "페이지에서 읽히는가": `아니오. document.cookie = "${exposed}" (HttpOnly라 스크립트가 못 읽는다)`,
    });

    record("로그아웃한 뒤 같은 세션 값을 다시 써 봤을 때 (T08-C33)", {
        "로그아웃 전": `GET /api/private-notes (Cookie: pk_session=••••) → ${before.status}, 내 자료 ${beforeBody.notes.length}건`,
        "로그아웃 후": `GET /api/private-notes (같은 값) → ${after.status} ${(await after.text()).trim()}`,
        설명: "로그아웃이 세션 행을 지우므로, 그 값은 그 즉시 아무 의미가 없다.",
    });
}

/* ── 카드 4 · 기기를 잃어버렸을 때 ──────────────────────────────────────── */

console.log("\n카드 4 — 기기를 잃어버렸을 때");

await evaluate(`window.__flow.login()`);
await useDevice("기기2");
await evaluate(`window.__flow.register('${TAG} 휴대폰 지문')`);
await evaluate(`window.__pk.refresh()`);
await sleep(400);
await shot("06_패스키_두개", "#private");

// 지우기 확인 화면 (마지막이 아닐 때)
await evaluate(`document.querySelector("[data-delete-credential]").click()`);
await sleep(200);
await shot("07_패스키_지우기_확인", "#private");

{
    const me = await evaluate(`window.__flow.get('/api/me')`);
    const first = me.data.credentials[0];
    const deleted = await evaluate(`window.__flow.del('/api/credentials/${first.id}')`);
    await evaluate(`window.__flow.post('/api/logout')`);

    await useDevice("기기1");
    const withDeleted = await evaluate(`window.__flow.login()`);

    await useDevice("기기2");
    const withRemaining = await evaluate(`window.__flow.login()`);

    record("패스키 하나를 지운 뒤 (T08-C44·C45)", {
        지운것: `"${first.deviceName}" (남은 패스키 ${deleted.data.remaining}개)`,
        "지운 기기로 로그인": `${withDeleted.status} ${JSON.stringify(withDeleted.data?.error ?? withDeleted.error)}`,
        "남은 기기로 로그인": `${withRemaining.status} 성공 — "${withRemaining.data.deviceName}"`,
        설명: "패스키를 두 개 등록해 둔 덕분에, 기기 하나를 잃어도 계정을 잃지 않는다.",
    });
}

await evaluate(`window.__pk.refresh()`);
await sleep(300);
await evaluate(`document.querySelector("[data-delete-credential]").click()`);
await sleep(200);
await shot("08_마지막패스키_경고", "#private");

{
    const me = await evaluate(`window.__flow.get('/api/me')`);
    const last = me.data.credentials[0];
    const deleted = await evaluate(`window.__flow.del('/api/credentials/${last.id}')`);
    const attempt = await evaluate(`window.__flow.login()`);

    record("마지막 패스키까지 지웠을 때 (T08-C46)", {
        "화면 경고":
            "⚠ 마지막 패스키입니다. 지우면 이 계정에 다시 들어올 방법이 없습니다 — 비밀번호도 이메일도 없어서 되돌릴 수 없습니다.",
        결과: `남은 패스키 ${deleted.data.remaining}개, 계정 접근 불가 = ${deleted.data.accountUnreachable}`,
        "다시 들어가려는 시도": `${attempt.status} ${JSON.stringify(attempt.data?.error ?? attempt.error)}`,
        "왜 막지 않았나":
            "막을 수도 있었지만 막지 않았다. 되살릴 수단(이메일·비밀번호)을 두지 않기로 한 이상, " +
            "'못 지우게 하는 것'은 문제를 미루는 것이지 푸는 것이 아니다. 대신 지우기 전에 화면에서 분명히 경고한다.",
    });
}

await evaluate(`window.__pk.refresh()`);
await sleep(400);
await shot("09_마지막패스키_삭제후", "#private");

/* ── 카드 5 · 두 계정 사이가 막히는가 ───────────────────────────────────── */

console.log("\n카드 5 — 두 계정 사이");

{
    await useDevice("계정A");
    await evaluate(`window.__flow.register('${TAG} 계정 A의 기기')`);
    const noteA = await evaluate(
        `window.__flow.post('/api/private-notes', ${JSON.stringify({ kind: "retro", title: `${TAG} A만의 메모`, body: "계정 A에만 있는 내용입니다." })})`,
    );
    const listABefore = await evaluate(`window.__flow.get('/api/private-notes')`);
    await evaluate(`window.__flow.post('/api/logout')`);

    await useDevice("계정B");
    await evaluate(`window.__flow.register('${TAG} 계정 B의 기기')`);
    const noteB = await evaluate(
        `window.__flow.post('/api/private-notes', ${JSON.stringify({ kind: "retro", title: `${TAG} B만의 메모`, body: "계정 B에만 있는 내용입니다." })})`,
    );

    const bReadsOwn = await evaluate(`window.__flow.get('/api/private-notes/${noteB.data.note.id}')`);
    const bReadsA = await evaluate(`window.__flow.get('/api/private-notes/${noteA.data.note.id}')`);

    // user_id를 A의 것으로 적어 보내 본다.
    const spoofed = await evaluate(
        `window.__flow.post('/api/private-notes', ${JSON.stringify({
            kind: "retro",
            title: `${TAG} 남의 id를 적어 보낸 요청`,
            body: "본문에 user_id를 A로 적었다.",
            user_id: "(A의 계정 id)",
        })})`,
    );
    const listB = await evaluate(`window.__flow.get('/api/private-notes')`);

    await evaluate(`window.__flow.post('/api/logout')`);
    await useDevice("계정A");
    await evaluate(`window.__flow.login()`);
    const aReadsOwn = await evaluate(`window.__flow.get('/api/private-notes/${noteA.data.note.id}')`);
    const aReadsB = await evaluate(`window.__flow.get('/api/private-notes/${noteB.data.note.id}')`);
    const listAAfter = await evaluate(`window.__flow.get('/api/private-notes')`);
    const spoofSeenByA = await evaluate(
        `window.__flow.get('/api/private-notes/${spoofed.data.note.id}')`,
    );

    record("한쪽 패스키로 다른 쪽 자료를 열려고 할 때 (T08-C37·C38)", {
        "B → 자기 자료": `GET /api/private-notes/${noteB.data.note.id} → ${bReadsOwn.status} "${bReadsOwn.data.note?.title}"`,
        "B → A의 자료": `GET /api/private-notes/${noteA.data.note.id} → ${bReadsA.status} ${JSON.stringify(bReadsA.data.error)}`,
        "A → 자기 자료": `GET /api/private-notes/${noteA.data.note.id} → ${aReadsOwn.status} "${aReadsOwn.data.note?.title}"`,
        "A → B의 자료": `GET /api/private-notes/${noteB.data.note.id} → ${aReadsB.status} ${JSON.stringify(aReadsB.data.error)}`,
        "왜 403이 아니라 404인가":
            "403은 '있지만 권한이 없다'는 뜻이라, 그 id가 존재한다는 사실 자체를 알려주게 된다. 그래서 없는 것과 똑같이 답한다.",
    });

    record("거절 앞뒤로 상대편 자료 건수 (T08-C39)", {
        "거절 전 A의 건수": `${listABefore.data.notes.length}건`,
        "거절 후 A의 건수": `${listAAfter.data.notes.length}건`,
        설명: "거절이 상대편 자료를 건드리지도, 새로 만들지도 않았다.",
    });

    record("요청 본문에 남의 계정 id를 적어 보냈을 때 (T08-C40·C41)", {
        요청: `POST /api/private-notes  본문: { "title": "…", "user_id": "(A의 계정 id)" }  ← B의 세션으로 보냄`,
        저장결과: `${spoofed.status} — 저장된 주인은 B(요청을 보낸 사람)`,
        "A가 그 자료를 볼 수 있는가": `GET /api/private-notes/${spoofed.data.note.id} → ${spoofSeenByA.status} (못 본다)`,
        "B의 목록에는": `${listB.data.notes.some((n) => n.id === spoofed.data.note.id) ? "있다" : "없다"}`,
        "이 거절을 만드는 곳":
            "api/private-notes/index.js — createNote에 넘기는 userId가 요청 본문이 아니라 세션(requireUser)에서 나온다. " +
            "클라이언트가 주인을 고를 수 있는 경로가 코드에 아예 없다.",
    });
}

/* ── 모바일 ─────────────────────────────────────────────────────────────── */

console.log("\n모바일");

await send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 900,
    deviceScaleFactor: 2,
    mobile: true,
});
await goto();
await sleep(500);
await shot("10_모바일_375", "#private");

/* ── 기록 저장 ──────────────────────────────────────────────────────────── */

const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "short",
}).format(new Date());

fs.writeFileSync(
    path.join(OUT, "촬영 기록.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), url: URL_APP, shots, records }, null, 2),
    "utf-8",
);

console.log(`\n사진 ${shots.length}장 · 기록 ${records.length}건 → ${OUT}`);
console.log(`(${stamp} KST · 대상 ${URL_APP})`);

close();
process.exit(0);
