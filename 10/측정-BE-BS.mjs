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
 *   시나리오 4  BE=1 BS=1 → 0    등록 뒤에 동기화가 꺼진 경우          ← 확장(--역전이)
 *   시나리오 5  BE=1 BS 0→1→0→1→0  동기화를 껐다 켰다 반복한 경우      ← 확장(--상태변화)
 *   시나리오 6  한 계정에 보안키 + 플랫폼 패스키, 후자만 전이           ← 확장(--상태변화)
 *
 * 시나리오 6의 기기 구성은 크롬의 제약에서 나왔다 — 가상 authenticator는 internal(플랫폼)
 * 기기를 환경당 하나만 허용하므로, 두 자격증명을 한 계정에 두려면 하나는 다른 transport여야
 * 한다. 마침 그것이 현실의 흔한 구성이다: 하드웨어 보안키 하나와 폰의 패스키 하나.
 *
 * 시나리오 3에서 전이 전후의 서버 응답과 저장 상태가 같은지가 이 실험의 판정 대상이다.
 * 설계는 10/실험설계.md에 수집 착수 전에 고정해 두었다.
 *
 * 시나리오 4는 데이터 수집이 끝난 뒤에 덧붙인 확장이며, 기본 실행에는 **포함되지 않는다**.
 * 논문 본문의 결과를 그대로 재현하려면 --역전이 없이 돌려야 하고, 그때의 출력 여섯 줄은
 * 확장 추가 이전과 완전히 같다. 경위는 10/실험설계.md §5와 논문 3.5절에 적어 두었다.
 *
 * 사용법:
 *   node 10/측정-BE-BS.mjs                          로컬 개발 서버, 10회 반복 (기본, 시나리오 1~3)
 *   node 10/측정-BE-BS.mjs <주소> <반복횟수>         대상과 반복 횟수 지정
 *   node 10/측정-BE-BS.mjs <주소> <반복횟수> --역전이  시나리오 4를 함께 측정
 *
 * 로컬로 돌릴 때는 먼저 다른 창에서 개발 서버를 띄운다:
 *   cd 8/portfolio-passkey && npm run dev
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "../8/portfolio-passkey/tools/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARGV = process.argv.slice(2);
const 역전이도 = ARGV.includes("--역전이");
const 상태변화도 = ARGV.includes("--상태변화");
const 위치인자 = ARGV.filter((a) => !a.startsWith("--"));
const URL_APP = (위치인자[0] ?? "http://localhost:5179").replace(/\/$/, "");
const REPEATS = Number(위치인자[1] ?? 10);

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

/**
 * 로그인 한 번 — 서버가 주는 옵션 그대로 쓰되, **어느 자격증명이 답했는지**까지 기록한다.
 * 시나리오 6에서 기기를 한 번에 하나만 꽂아 두고 쓰므로 답하는 쪽이 결정된다.
 * (allowCredentials로 지목하는 방법은 쓰지 않는다 — 예비 시험에서 internal 기기가
 *  NotAllowedError로 응답하지 않는 것을 확인했다.)
 */
const LOGIN_기록 = `(async () => {
    const start = await window.__pk.api('/api/login/options', { method: 'POST' });
    const c = await navigator.credentials.get({ publicKey: window.__pk.toRequestOptions(start.data.options) });
    const body = window.__pk.serializeAuthentication(c);
    const done = await window.__pk.api('/api/login/verify', { method: 'POST', body: { challengeId: start.data.challengeId, response: body } });
    return { 사용한자격증명: body.id, 보낸플래그: window.__flags(body.response.authenticatorData), 응답상태: done.status, 응답본문: done.data };
})()`;

const results = {
    대상: URL_APP,
    측정시각: new Date().toISOString(),
    반복횟수: REPEATS,
    설계: "10/실험설계.md (수집 착수 전 확정)",
    시나리오4_역전이_포함: 역전이도,
    시나리오5_6_상태변화_포함: 상태변화도,
    회차: [],
};

const browser = await openBrowser({ url: URL_APP, port: 9333, profilePrefix: "paper-bebs-" });
let authenticatorId = null;
let 추가기기 = []; // 시나리오 6처럼 기기를 둘 이상 붙일 때 쓴다

/** 회차를 같은 상태에서 시작하도록 저장소와 쿠키를 비우고 새 가상 기기를 끼운다. */
async function 새기기(be, bs, transport = "internal") {
    for (const id of 추가기기) {
        await browser.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId: id });
    }
    추가기기 = [];
    if (authenticatorId) {
        await browser.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
        authenticatorId = null;
    }
    if (isLocal && fs.existsSync(DEV_STORE)) fs.rmSync(DEV_STORE);
    await browser.send("Network.clearBrowserCookies");
    await browser.goto();
    await browser.evaluate(DECODE_FLAGS);
    const added = await browser.send("WebAuthn.addVirtualAuthenticator", {
        options: { ...BASE, transport, defaultBackupEligibility: be, defaultBackupState: bs },
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

/** 지금 붙어 있는 기기 위에 기기를 하나 더 끼운다(저장소·쿠키는 건드리지 않는다). */
async function 기기더하기(be, bs, transport = "internal") {
    const { authenticatorId: id } = await browser.send("WebAuthn.addVirtualAuthenticator", {
        options: { ...BASE, transport, defaultBackupEligibility: be, defaultBackupState: bs },
    });
    추가기기.push(id);
    return id;
}

/**
 * 자격증명을 그대로 지닌 채 기기를 잠시 빼 둔다.
 * 반환 객체를 **통째로** 보관한다 — `backupEligibility`·`backupState`·`userName` 같은 필드를
 * 빠뜨리면 다시 꽂았을 때 로그인이 NotAllowedError로 실패한다(예비 시험에서 확인).
 */
async function 기기빼기(id) {
    const { credentials } = await browser.send("WebAuthn.getCredentials", { authenticatorId: id });
    const 보관 = credentials.map((c) => ({ ...c }));
    await browser.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId: id });
    추가기기 = 추가기기.filter((x) => x !== id);
    if (authenticatorId === id) authenticatorId = null;
    return 보관;
}

/** 빼 두었던 기기를 자격증명째로 다시 꽂는다. */
async function 기기꽂기(보관, be, bs, transport) {
    const id = await 기기더하기(be, bs, transport);
    for (const credential of 보관) {
        await browser.send("WebAuthn.addCredential", { authenticatorId: id, credential });
    }
    return id;
}

/** 그 기기의 자격증명 하나의 백업 상태를 바꾼다. */
async function BS바꾸기(id, 목표) {
    const { credentials } = await browser.send("WebAuthn.getCredentials", { authenticatorId: id });
    try {
        await browser.send("WebAuthn.setCredentialProperties", {
            authenticatorId: id,
            credentialId: credentials[0].credentialId,
            backupState: 목표,
        });
        return { 성공: true, 오류: null };
    } catch (e) {
        return { 성공: false, 오류: String(e.message ?? e) };
    }
}
const 서버보관상태 = async () => (await browser.evaluate(`window.__flow.get('/api/me')`)).data;

/**
 * 전이 전후로 서버 쪽에 달라진 것이 있는지 비교할 때 쓰는 정규화.
 * signCount는 로그인 횟수라 당연히 늘어나므로 비교에서 제외한다 —
 * 우리가 묻는 것은 "백업 상태 변화가 기록되는가"이지 "로그인을 세는가"가 아니다.
 */
const 보관비교 = (s) =>
    JSON.stringify((s?.credentials ?? []).map(({ signCount, ...나머지 }) => 나머지));

/**
 * 등록 → 로그인 → BS 전환 → 로그인 을 한 번 수행하고 전후를 비교한다.
 * 시나리오 3(0→1)과 시나리오 4(1→0)가 방향만 다르고 절차가 같으므로 함께 쓴다.
 */
async function 전이측정({ 이름, BE, 시작BS, 목표BS }) {
    const aid = await 새기기(BE, 시작BS);
    const 등 = await 등록(이름);
    const 전 = await 로그인();
    const 전보관 = await 서버보관상태();

    const { credentials } = await browser.send("WebAuthn.getCredentials", { authenticatorId: aid });
    let 전환 = { 성공: true, 오류: null };
    try {
        await browser.send("WebAuthn.setCredentialProperties", {
            authenticatorId: aid,
            credentialId: credentials[0].credentialId,
            backupState: 목표BS,
        });
    } catch (e) {
        전환 = { 성공: false, 오류: String(e.message ?? e) };
    }

    const 후 = await 로그인();
    const 후보관 = await 서버보관상태();

    return {
        설정: { BE: BE ? 1 : 0, BS: 시작BS ? 1 : 0 },
        목표BS: 목표BS ? 1 : 0,
        등록응답: { credentialDeviceType: 등.data.credentialDeviceType, backedUp: 등.data.backedUp },
        전환,
        전이전_로그인: 전,
        전이후_로그인: 후,
        전이전_보관상태: 전보관,
        전이후_보관상태: 후보관,
        판정: {
            플래그가_실제로_바뀌었나:
                전.보낸플래그.flagsHex !== 후.보낸플래그.flagsHex &&
                전.보낸플래그.BS === !목표BS &&
                후.보낸플래그.BS === 목표BS,
            // BE는 규격상 불변이므로, 역전이에서도 1로 유지되어야 한다.
            BE가_유지되었나: 전.보낸플래그.BE === 후.보낸플래그.BE,
            응답본문이_같은가: JSON.stringify(전.응답본문) === JSON.stringify(후.응답본문),
            보관상태가_같은가: 보관비교(전보관) === 보관비교(후보관),
        },
    };
}

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
        이번회차.시나리오3 = await 전이측정({
            이름: `[측정 ${회}] 나중에동기화`,
            BE: true,
            시작BS: false,
            목표BS: true,
        });

        /* 시나리오 4 — 등록 뒤 동기화가 꺼짐 (확장, --역전이 일 때만) */
        if (역전이도) {
            이번회차.시나리오4 = await 전이측정({
                이름: `[측정 ${회}] 나중에동기화해제`,
                BE: true,
                시작BS: true,
                목표BS: false,
            });
        }

        /* 시나리오 5 — 동기화를 껐다 켰다 반복 (확장, --상태변화) */
        if (상태변화도) {
            const id5 = await 새기기(true, false);
            const 등 = await 등록(`[측정 ${회}] 반복전이`);
            const 단계 = [];
            단계.push({ 단계: "등록 직후", 전환: null, 로그인: await 로그인(), 보관: await 서버보관상태() });
            for (const 목표 of [true, false, true, false]) {
                const 전환 = await BS바꾸기(id5, 목표);
                단계.push({ 단계: `BS→${목표 ? 1 : 0}`, 전환, 로그인: await 로그인(), 보관: await 서버보관상태() });
            }
            const 바이트열 = 단계.map((d) => d.로그인.보낸플래그.flagsHex);
            const 본문들 = 단계.map((d) => JSON.stringify(d.로그인.응답본문));
            이번회차.시나리오5 = {
                설정: { BE: 1, BS: 0 },
                전이순서: "0 → 1 → 0 → 1 → 0",
                등록응답: { credentialDeviceType: 등.data.credentialDeviceType, backedUp: 등.data.backedUp },
                단계,
                판정: {
                    전환이_모두_성공했나: 단계.slice(1).every((d) => d.전환.성공),
                    바이트열이_지정대로인가:
                        JSON.stringify(바이트열) === JSON.stringify(["0x0d", "0x1d", "0x0d", "0x1d", "0x0d"]),
                    모든_응답본문이_같은가: 본문들.every((b) => b === 본문들[0]),
                    // 네 번 오간 뒤의 보관 상태가 한 번도 오가지 않은 처음과 같은가
                    최종보관이_최초와_같은가: 보관비교(단계[0].보관) === 보관비교(단계[단계.length - 1].보관),
                    // 왕복을 마친 자격증명이 내보내는 바이트가 "한 번도 백업된 적 없음"과 같은가
                    최종바이트가_최초와_같은가: 바이트열[바이트열.length - 1] === 바이트열[0],
                },
                바이트열,
            };
        }

        /* 시나리오 6 — 한 계정의 보안키 + 플랫폼 패스키, 후자만 전이 (확장, --상태변화) */
        if (상태변화도) {
            const 로그인기록 = () => browser.evaluate(LOGIN_기록);

            // A = 하드웨어 보안키(기기를 벗어나지 않음). 이 기기가 계정을 만든다.
            const idA = await 새기기(false, false, "usb");
            const 등A = await 등록(`[측정 ${회}] 보안키`);
            const 전A = await 로그인기록();

            // 보안키를 빼 둔 채 폰 패스키를 등록한다. 실제 사용자도 두 기기를 동시에 들고
            // 등록하지 않으며, A가 꽂혀 있으면 서버가 보낸 excludeCredentials에 걸려
            // InvalidStateError가 난다(등록 흐름이 의도대로 작동한다는 확인이기도 하다).
            const A보관 = await 기기빼기(idA);

            // B = 플랫폼 패스키(백업 적격이나 아직 백업 안 됨). 로그인 상태라 같은 계정에 붙는다.
            const idB = await 기기더하기(true, false, "internal");
            const 등B = await 등록(`[측정 ${회}] 폰패스키`);
            const 전B = await 로그인기록();
            const 전보관 = await 서버보관상태();

            const 전환 = await BS바꾸기(idB, true); // 폰 패스키만 클라우드로 들어간다
            const 후B = await 로그인기록();

            // 폰을 내려놓고 보안키를 다시 꽂는다.
            await 기기빼기(idB);
            await 기기꽂기(A보관, false, false, "usb");
            const 후A = await 로그인기록();
            const 후보관 = await 서버보관상태();

            // 보관된 레코드에서 자격증명 고유값을 뺀 나머지 — 백업 관련 필드가 있다면 여기 남는다
            const 백업관련필드 = (st) =>
                (st?.credentials ?? []).map((c) =>
                    Object.fromEntries(
                        Object.entries(c).filter(
                            ([k]) => !["id", "shortId", "publicKey", "signCount", "createdAt", "deviceName", "isCurrentSession"].includes(k),
                        ),
                    ),
                );

            이번회차.시나리오6 = {
                구성: { A: "하드웨어 보안키 BE=0 BS=0 (usb)", B: "플랫폼 패스키 BE=1 BS=0→1 (internal)" },
                등록응답: {
                    A: { credentialDeviceType: 등A.data.credentialDeviceType, backedUp: 등A.data.backedUp },
                    B: { credentialDeviceType: 등B.data.credentialDeviceType, backedUp: 등B.data.backedUp },
                },
                전환,
                전이전: { A: 전A, B: 전B, 보관: 전보관 },
                전이후: { A: 후A, B: 후B, 보관: 후보관 },
                보관레코드_고유값제외: 백업관련필드(후보관),
                판정: {
                    자격증명이_둘_등록되었나: (후보관?.credentials ?? []).length === 2,
                    서로_다른_자격증명이_답했나: 전A.사용한자격증명 !== 전B.사용한자격증명,
                    // 보안키는 끝까지 기기 전용으로 보고하는가
                    보안키가_계속_기기전용이었나:
                        전A.보낸플래그.flagsHex === "0x05" && 후A.보낸플래그.flagsHex === "0x05",
                    // 폰 패스키만 전이했는가
                    폰패스키만_전이했나:
                        전B.보낸플래그.flagsHex === "0x0d" && 후B.보낸플래그.flagsHex === "0x1d",
                    // 그럼에도 보관된 레코드에 백업 관련 필드가 하나도 없는가
                    보관레코드에_백업필드가_없나:
                        백업관련필드(후보관).every((c) => Object.keys(c).length === 0),
                    보관상태가_전이_전후로_같은가: 보관비교(전보관) === 보관비교(후보관),
                    A의_응답이_전이_전후로_같은가:
                        JSON.stringify(전A.응답본문) === JSON.stringify(후A.응답본문),
                    B의_응답이_전이_전후로_같은가:
                        JSON.stringify(전B.응답본문) === JSON.stringify(후B.응답본문),
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

const s5 = 상태변화도 ? results.회차.map((r) => r.시나리오5) : null;
const s6 = 상태변화도 ? results.회차.map((r) => r.시나리오6) : null;
const s4 = 역전이도 ? results.회차.map((r) => r.시나리오4) : null;
if (s4) {
    집계.시나리오4_전환성공 = s4.filter((r) => r.전환.성공).length;
    집계.시나리오4_플래그가_실제로_바뀐_회차 = s4.filter((r) => r.판정.플래그가_실제로_바뀌었나).length;
    집계.시나리오4_BE가_유지된_회차 = s4.filter((r) => r.판정.BE가_유지되었나).length;
    집계.시나리오4_응답본문이_같은_회차 = s4.filter((r) => r.판정.응답본문이_같은가).length;
    집계.시나리오4_보관상태가_같은_회차 = s4.filter((r) => r.판정.보관상태가_같은가).length;
}
if (s5) {
    집계.시나리오5_전환이_모두_성공한_회차 = s5.filter((r) => r.판정.전환이_모두_성공했나).length;
    집계.시나리오5_바이트열이_지정대로인_회차 = s5.filter((r) => r.판정.바이트열이_지정대로인가).length;
    집계.시나리오5_모든_응답본문이_같은_회차 = s5.filter((r) => r.판정.모든_응답본문이_같은가).length;
    집계.시나리오5_최종보관이_최초와_같은_회차 = s5.filter((r) => r.판정.최종보관이_최초와_같은가).length;
    집계.시나리오5_최종바이트가_최초와_같은_회차 = s5.filter((r) => r.판정.최종바이트가_최초와_같은가).length;
}
if (s6) {
    집계.시나리오6_자격증명이_둘_등록된_회차 = s6.filter((r) => r.판정.자격증명이_둘_등록되었나).length;
    집계.시나리오6_보안키가_계속_기기전용인_회차 = s6.filter((r) => r.판정.보안키가_계속_기기전용이었나).length;
    집계.시나리오6_폰패스키만_전이한_회차 = s6.filter((r) => r.판정.폰패스키만_전이했나).length;
    집계.시나리오6_보관레코드에_백업필드가_없는_회차 = s6.filter((r) => r.판정.보관레코드에_백업필드가_없나).length;
    집계.시나리오6_보관상태가_전이_전후로_같은_회차 = s6.filter((r) => r.판정.보관상태가_전이_전후로_같은가).length;
    집계.시나리오6_A의_응답이_같은_회차 = s6.filter((r) => r.판정.A의_응답이_전이_전후로_같은가).length;
    집계.시나리오6_B의_응답이_같은_회차 = s6.filter((r) => r.판정.B의_응답이_전이_전후로_같은가).length;
}
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
if (s4) {
    console.log("─".repeat(74));
    console.log(`시나리오 4 BS 역전환(1→0)에 성공한 회차                            ${집계.시나리오4_전환성공}/${집계.총회차}`);
    console.log(`시나리오 4 전송 플래그가 실제로 BS 1→0 으로 바뀐 회차              ${집계.시나리오4_플래그가_실제로_바뀐_회차}/${집계.총회차}`);
    console.log(`시나리오 4 그 사이 BE 가 1로 유지된 회차 (규격상 불변)             ${집계.시나리오4_BE가_유지된_회차}/${집계.총회차}`);
    console.log(`시나리오 4 그럼에도 로그인 응답이 완전히 같았던 회차               ${집계.시나리오4_응답본문이_같은_회차}/${집계.총회차}`);
    console.log(`시나리오 4 그럼에도 서버 보관 상태가 같았던 회차                   ${집계.시나리오4_보관상태가_같은_회차}/${집계.총회차}`);
}
if (s5) {
    console.log("─".repeat(74));
    console.log(`시나리오 5 네 번의 전환이 모두 성공한 회차                         ${집계.시나리오5_전환이_모두_성공한_회차}/${집계.총회차}`);
    console.log(`시나리오 5 바이트열이 0d·1d·0d·1d·0d 로 나온 회차                 ${집계.시나리오5_바이트열이_지정대로인_회차}/${집계.총회차}`);
    console.log(`시나리오 5 다섯 번의 로그인 응답이 모두 같았던 회차               ${집계.시나리오5_모든_응답본문이_같은_회차}/${집계.총회차}`);
    console.log(`시나리오 5 왕복 뒤 보관 상태가 최초와 같았던 회차                 ${집계.시나리오5_최종보관이_최초와_같은_회차}/${집계.총회차}`);
    console.log(`시나리오 5 왕복 뒤 전송 바이트가 최초와 같았던 회차               ${집계.시나리오5_최종바이트가_최초와_같은_회차}/${집계.총회차}`);
}
if (s6) {
    console.log("─".repeat(74));
    console.log(`시나리오 6 자격증명 2개가 한 계정에 등록된 회차                   ${집계.시나리오6_자격증명이_둘_등록된_회차}/${집계.총회차}`);
    console.log(`시나리오 6 보안키가 끝까지 기기 전용(0x05)이었던 회차            ${집계.시나리오6_보안키가_계속_기기전용인_회차}/${집계.총회차}`);
    console.log(`시나리오 6 폰 패스키만 0x0d→0x1d 로 전이한 회차                   ${집계.시나리오6_폰패스키만_전이한_회차}/${집계.총회차}`);
    console.log(`시나리오 6 그럼에도 보관 레코드에 백업 필드가 없던 회차           ${집계.시나리오6_보관레코드에_백업필드가_없는_회차}/${집계.총회차}`);
    console.log(`시나리오 6 그럼에도 보관 상태가 전이 전후로 같았던 회차           ${집계.시나리오6_보관상태가_전이_전후로_같은_회차}/${집계.총회차}`);
    console.log(`시나리오 6 전이하지 않은 A의 응답이 같았던 회차                   ${집계.시나리오6_A의_응답이_같은_회차}/${집계.총회차}`);
    console.log(`시나리오 6 전이한 B의 응답조차 같았던 회차                        ${집계.시나리오6_B의_응답이_같은_회차}/${집계.총회차}`);
}
console.log("─".repeat(74));
console.log(`원자료 저장: ${저장경로}\n`);
