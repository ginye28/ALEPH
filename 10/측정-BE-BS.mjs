/**
 * 논문 실험 A — 백업 상태(BS) 전이가 RP에게 관측되는가.
 *
 * 8번 과제(portfolio-passkey)의 검사 하네스를 재사용한다. 크롬 개발자 프로토콜(CDP)의
 * 가상 authenticator는 BE(Backup Eligibility)·BS(Backup State) 플래그를 직접 지정할 수 있고
 * (defaultBackupEligibility / defaultBackupState), 생성된 뒤에도 setCredentialProperties로
 * 백업 상태를 바꿀 수 있다. 실제 아이폰·보안키 없이 세 경우를 그대로 재현한다.
 *
 *   시나리오 1  BE=1 BS=1        동기화 패스키(클라우드에 백업된 상태)
 *   시나리오 2  BE=0 BS=0        하드웨어 바운드 패스키(기기를 벗어나지 않음)
 *   시나리오 3  BE=1 BS=0 → 1    등록 뒤에 동기화가 켜진 경우  ← 핵심
 *
 * 시나리오 3에서 전이 전후의 서버 응답과 저장 상태가 같은지가 이 실험의 판정 대상이다.
 * 설계는 10/실험설계.md에 수집 착수 전에 고정해 두었다.
 *
 * 사용법:
 *   node 10/측정-BE-BS.mjs                      로컬 개발 서버, 10회 반복 (기본)
 *   node 10/측정-BE-BS.mjs <주소> <반복횟수>     대상과 반복 횟수 지정
 *
 * 로컬로 돌릴 때는 먼저 다른 창에서 개발 서버를 띄운다:
 *   cd 8/portfolio-passkey && npm run dev
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "../8/portfolio-passkey/tools/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_APP = (process.argv[2] ?? "http://localhost:5179").replace(/\/$/, "");
const REPEATS = Number(process.argv[3] ?? 10);

/** 로컬 개발 서버의 파일 저장소. 반복마다 지워 매 회차를 같은 상태에서 시작한다. */
const DEV_STORE = path.join(HERE, "..", "8", "portfolio-passkey", ".dev-store", "store.json");
const isLocal = URL_APP.includes("localhost") || URL_APP.includes("127.0.0.1");

/** 가상 기기의 고정 성질 — 8번 과제 하네스와 같게 맞춘다(지문 통과·discoverable). */
const BASE = {
    protocol: "ctap2",
    transport: "internal",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
};

/**
 * 브라우저 안에서 base64url authenticatorData의 플래그 바이트를 직접 뜯어본다.
 * 서버가 무엇을 받았는지가 아니라 **기기가 무엇을 보냈는지**를 보는 자리다.
 * 비트 자리는 W3C WebAuthn Level 3 §6.1 그대로다.
 */
const DECODE_FLAGS = `
window.__flags = (b64url) => {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
    const f = raw.charCodeAt(32);           // rpIdHash 32바이트 다음이 flags 1바이트
    return {
        flagsInt: f,
        flagsHex: '0x' + f.toString(16).padStart(2, '0'),
        flagsBin: f.toString(2).padStart(8, '0'),
        UP: !!(f & (1 << 0)), UV: !!(f & (1 << 2)),
        BE: !!(f & (1 << 3)), BS: !!(f & (1 << 4)),
        AT: !!(f & (1 << 6)), ED: !!(f & (1 << 7)),
    };
};
`;

/** 로그인 한 번 — 기기가 보낸 플래그와 서버 응답을 함께 돌려준다. */
const LOGIN_ONCE = `(async () => {
    const start = await window.__pk.api('/api/login/options', { method: 'POST' });
    const c = await navigator.credentials.get({ publicKey: window.__pk.toRequestOptions(start.data.options) });
    const body = window.__pk.serializeAuthentication(c);
    const done = await window.__pk.api('/api/login/verify', { method: 'POST', body: { challengeId: start.data.challengeId, response: body } });
    return { 보낸플래그: window.__flags(body.response.authenticatorData), 응답상태: done.status, 응답본문: done.data };
})()`;

const results = {
    대상: URL_APP,
    측정시각: new Date().toISOString(),
    반복횟수: REPEATS,
    설계: "10/실험설계.md (수집 착수 전 확정)",
    회차: [],
};

const browser = await openBrowser({ url: URL_APP, port: 9333, profilePrefix: "paper-bebs-" });
let authenticatorId = null;

/** 회차를 같은 상태에서 시작하도록 저장소와 쿠키를 비우고 새 가상 기기를 끼운다. */
async function 새기기(be, bs) {
    if (authenticatorId) {
        await browser.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
        authenticatorId = null;
    }
    if (isLocal && fs.existsSync(DEV_STORE)) fs.rmSync(DEV_STORE);
    await browser.send("Network.clearBrowserCookies");
    await browser.goto();
    await browser.evaluate(DECODE_FLAGS);
    const added = await browser.send("WebAuthn.addVirtualAuthenticator", {
        options: { ...BASE, defaultBackupEligibility: be, defaultBackupState: bs },
    });
    authenticatorId = added.authenticatorId;
    return authenticatorId;
}

async function 등록(이름) {
    const r = await browser.evaluate(`window.__flow.register(${JSON.stringify(이름)})`);
    if (!r?.ok) throw new Error(`등록 실패: ${JSON.stringify(r)}`);
    return r;
}

const 로그인 = () => browser.evaluate(LOGIN_ONCE);
const 서버보관상태 = async () => (await browser.evaluate(`window.__flow.get('/api/me')`)).data;

try {
    for (let 회 = 1; 회 <= REPEATS; 회 += 1) {
        const 이번회차 = { 회차: 회 };

        /* 시나리오 1 — 동기화 패스키 */
        await 새기기(true, true);
        {
            const 등 = await 등록(`[측정 ${회}] 동기화`);
            const 로 = await 로그인();
            이번회차.시나리오1 = {
                설정: { BE: 1, BS: 1 },
                등록응답: { credentialDeviceType: 등.data.credentialDeviceType, backedUp: 등.data.backedUp },
                로그인: 로,
            };
        }

        /* 시나리오 2 — 하드웨어 바운드 패스키 */
        await 새기기(false, false);
        {
            const 등 = await 등록(`[측정 ${회}] 기기전용`);
            const 로 = await 로그인();
            이번회차.시나리오2 = {
                설정: { BE: 0, BS: 0 },
                등록응답: { credentialDeviceType: 등.data.credentialDeviceType, backedUp: 등.data.backedUp },
                로그인: 로,
            };
        }

        /* 시나리오 3 — 등록 뒤 동기화가 켜짐 (핵심) */
        const id3 = await 새기기(true, false);
        {
            const 등 = await 등록(`[측정 ${회}] 나중에동기화`);
            const 전 = await 로그인();
            const 전보관 = await 서버보관상태();

            const { credentials } = await browser.send("WebAuthn.getCredentials", { authenticatorId: id3 });
            let 전환 = { 성공: true, 오류: null };
            try {
                await browser.send("WebAuthn.setCredentialProperties", {
                    authenticatorId: id3,
                    credentialId: credentials[0].credentialId,
                    backupState: true,
                });
            } catch (e) {
                전환 = { 성공: false, 오류: String(e.message ?? e) };
            }

            const 후 = await 로그인();
            const 후보관 = await 서버보관상태();

            // 판정: 전이 전후로 서버 쪽에 달라진 것이 있는가.
            // signCount는 로그인 횟수라 당연히 늘어나므로 비교에서 제외한다 —
            // 우리가 묻는 것은 "백업 상태 변화가 기록되는가"이지 "로그인을 세는가"가 아니다.
            const 보관비교 = (s) =>
                JSON.stringify((s?.credentials ?? []).map(({ signCount, ...나머지 }) => 나머지));

            이번회차.시나리오3 = {
                설정: { BE: 1, BS: 0 },
                등록응답: { credentialDeviceType: 등.data.credentialDeviceType, backedUp: 등.data.backedUp },
                전환: 전환,
                전이전_로그인: 전,
                전이후_로그인: 후,
                전이전_보관상태: 전보관,
                전이후_보관상태: 후보관,
                판정: {
                    플래그가_실제로_바뀌었나:
                        전.보낸플래그.flagsHex !== 후.보낸플래그.flagsHex &&
                        전.보낸플래그.BS === false &&
                        후.보낸플래그.BS === true,
                    응답본문이_같은가:
                        JSON.stringify(전.응답본문) === JSON.stringify(후.응답본문),
                    보관상태가_같은가: 보관비교(전보관) === 보관비교(후보관),
                },
            };
        }

        results.회차.push(이번회차);
        console.log(`  ${회}/${REPEATS} 회차 완료`);
    }
} finally {
    browser.close();
}

/* ── 집계 ────────────────────────────────────────────────────────────── */

const s3 = results.회차.map((r) => r.시나리오3);
const 집계 = {
    총회차: results.회차.length,
    시나리오1_multiDevice_backedUp:
        results.회차.filter(
            (r) => r.시나리오1.등록응답.credentialDeviceType === "multiDevice" && r.시나리오1.등록응답.backedUp === true,
        ).length,
    시나리오2_singleDevice_notBackedUp:
        results.회차.filter(
            (r) => r.시나리오2.등록응답.credentialDeviceType === "singleDevice" && r.시나리오2.등록응답.backedUp === false,
        ).length,
    시나리오3_전환성공: s3.filter((r) => r.전환.성공).length,
    시나리오3_플래그가_실제로_바뀐_회차: s3.filter((r) => r.판정.플래그가_실제로_바뀌었나).length,
    시나리오3_응답본문이_같은_회차: s3.filter((r) => r.판정.응답본문이_같은가).length,
    시나리오3_보관상태가_같은_회차: s3.filter((r) => r.판정.보관상태가_같은가).length,
};
results.집계 = 집계;

const 저장경로 = path.join(HERE, "측정결과-BE-BS.json");
fs.writeFileSync(저장경로, JSON.stringify(results, null, 2), "utf-8");

console.log(`\n${"─".repeat(74)}`);
console.log(`대상 ${URL_APP} · ${REPEATS}회 반복 · ${results.측정시각}`);
console.log("─".repeat(74));
console.log(`시나리오 1 (BE=1 BS=1) multiDevice·backedUp=true 로 판정된 회차   ${집계.시나리오1_multiDevice_backedUp}/${집계.총회차}`);
console.log(`시나리오 2 (BE=0 BS=0) singleDevice·backedUp=false 로 판정된 회차  ${집계.시나리오2_singleDevice_notBackedUp}/${집계.총회차}`);
console.log(`시나리오 3 BS 전환에 성공한 회차                                   ${집계.시나리오3_전환성공}/${집계.총회차}`);
console.log(`시나리오 3 전송 플래그가 실제로 BS 0→1 로 바뀐 회차                ${집계.시나리오3_플래그가_실제로_바뀐_회차}/${집계.총회차}`);
console.log(`시나리오 3 그럼에도 로그인 응답이 완전히 같았던 회차               ${집계.시나리오3_응답본문이_같은_회차}/${집계.총회차}`);
console.log(`시나리오 3 그럼에도 서버 보관 상태가 같았던 회차                   ${집계.시나리오3_보관상태가_같은_회차}/${집계.총회차}`);
console.log("─".repeat(74));
console.log(`원자료 저장: ${저장경로}\n`);
