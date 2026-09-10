/**
 * 논문 4장 실측 — 동기화 패스키(BE/BS) 신호가 RP에 어떻게 도달하고, 어디서 버려지는가.
 *
 * 8번 과제(portfolio-passkey)의 검사 하네스를 그대로 재사용한다. 크롬 개발자 프로토콜(CDP)의
 * 가상 authenticator는 BE(Backup Eligibility)·BS(Backup State) 플래그를 직접 지정할 수 있어
 * (defaultBackupEligibility / defaultBackupState), 실제 아이폰·보안키 없이도 세 가지 경우를
 * 똑같이 재현할 수 있다.
 *
 *   실측 1  BE=1 BS=1  동기화 패스키(클라우드에 백업된 상태)
 *   실측 2  BE=0 BS=0  하드웨어 바운드 패스키(기기를 벗어나지 않음)
 *   실측 3  BE=1 BS=0 → BS=1 로 전환    등록 뒤에 동기화가 켜진 경우
 *
 * 실측 3이 이 논문의 핵심이다. 등록 시점에는 백업되지 않았던 자격증명이 나중에 클라우드에
 * 올라가면 그 다음 로그인부터 BS=1이 실려 오는데, RP가 그것을 보고 있는지를 확인한다.
 *
 * 사용법:  node 10/측정-BE-BS.mjs [대상주소]
 *          기본값 https://aleph-passkey.vercel.app
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser, sleep } from "../8/portfolio-passkey/tools/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_APP = (process.argv[2] ?? "https://aleph-passkey.vercel.app").replace(/\/$/, "");

/** 가상 기기의 기본 성질 — 8번 과제 하네스와 같게 맞춘다(지문 통과·discoverable). */
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
        UP: !!(f & (1 << 0)),
        UV: !!(f & (1 << 2)),
        BE: !!(f & (1 << 3)),
        BS: !!(f & (1 << 4)),
        AT: !!(f & (1 << 6)),
        ED: !!(f & (1 << 7)),
    };
};
`;

const results = { 대상: URL_APP, 측정시각: new Date().toISOString(), 실측: [] };

const browser = await openBrowser({
    url: URL_APP,
    port: 9333,
    profilePrefix: "paper-bebs-",
});

let authenticatorId = null;

/** 새 계정으로 시작하기 위해 쿠키를 지우고 기기를 새로 끼운다. */
async function 새기기(be, bs) {
    if (authenticatorId) {
        await browser.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
    }
    await browser.send("Network.clearBrowserCookies");
    await browser.goto();
    await browser.evaluate(DECODE_FLAGS);
    const added = await browser.send("WebAuthn.addVirtualAuthenticator", {
        options: { ...BASE, defaultBackupEligibility: be, defaultBackupState: bs },
    });
    authenticatorId = added.authenticatorId;
    return authenticatorId;
}

/** 등록 한 번 + 그 계정으로 로그인 한 번. 오간 값을 그대로 담아 돌려준다. */
async function 등록하고로그인(이름) {
    const 등록 = await browser.evaluate(`window.__flow.register(${JSON.stringify(이름)})`);
    if (!등록?.ok) throw new Error(`등록 실패: ${JSON.stringify(등록)}`);

    const 로그인 = await browser.evaluate(`(async () => {
        const start = await window.__pk.api('/api/login/options', { method: 'POST' });
        const credential = await navigator.credentials.get({
            publicKey: window.__pk.toRequestOptions(start.data.options),
        });
        const body = window.__pk.serializeAuthentication(credential);
        const done = await window.__pk.api('/api/login/verify', {
            method: 'POST',
            body: { challengeId: start.data.challengeId, response: body },
        });
        return {
            보낸플래그: window.__flags(body.response.authenticatorData),
            서버응답상태: done.status,
            서버응답본문: done.data,
        };
    })()`);

    return { 등록서버응답: 등록.data, 로그인 };
}

try {
    /* ── 실측 1 · 동기화 패스키 (BE=1, BS=1) ─────────────────────────── */
    await 새기기(true, true);
    {
        const r = await 등록하고로그인("[측정] 동기화 패스키");
        results.실측.push({
            번호: 1,
            시나리오: "동기화 패스키 (클라우드에 백업된 상태)",
            가상기기설정: { defaultBackupEligibility: true, defaultBackupState: true },
            등록시_서버가_계산한값: {
                credentialDeviceType: r.등록서버응답.credentialDeviceType,
                backedUp: r.등록서버응답.backedUp,
            },
            로그인시_기기가_보낸_플래그: r.로그인.보낸플래그,
            로그인_서버응답: r.로그인.서버응답본문,
        });
    }

    /* ── 실측 2 · 하드웨어 바운드 패스키 (BE=0, BS=0) ────────────────── */
    await 새기기(false, false);
    {
        const r = await 등록하고로그인("[측정] 하드웨어 바운드");
        results.실측.push({
            번호: 2,
            시나리오: "하드웨어 바운드 패스키 (기기를 벗어나지 않음)",
            가상기기설정: { defaultBackupEligibility: false, defaultBackupState: false },
            등록시_서버가_계산한값: {
                credentialDeviceType: r.등록서버응답.credentialDeviceType,
                backedUp: r.등록서버응답.backedUp,
            },
            로그인시_기기가_보낸_플래그: r.로그인.보낸플래그,
            로그인_서버응답: r.로그인.서버응답본문,
        });
    }

    /* ── 실측 3 · 등록 뒤에 동기화가 켜진 경우 (BE=1, BS=0 → 1) ──────── */
    const id3 = await 새기기(true, false);
    {
        const 등록 = await browser.evaluate(
            `window.__flow.register(${JSON.stringify("[측정] 나중에 동기화 켜짐")})`,
        );
        if (!등록?.ok) throw new Error(`등록 실패: ${JSON.stringify(등록)}`);

        // 동기화가 켜지기 전 로그인 — BS=0이 실려 온다.
        const 전 = await browser.evaluate(`(async () => {
            const start = await window.__pk.api('/api/login/options', { method: 'POST' });
            const c = await navigator.credentials.get({ publicKey: window.__pk.toRequestOptions(start.data.options) });
            const body = window.__pk.serializeAuthentication(c);
            const done = await window.__pk.api('/api/login/verify', { method: 'POST', body: { challengeId: start.data.challengeId, response: body } });
            return { 보낸플래그: window.__flags(body.response.authenticatorData), 서버응답본문: done.data };
        })()`);

        // 사용자가 클라우드 동기화를 켠 상황 — 같은 자격증명의 BS만 1로 바꾼다.
        const { credentials } = await browser.send("WebAuthn.getCredentials", {
            authenticatorId: id3,
        });
        let 전환성공 = true;
        let 전환오류 = null;
        try {
            await browser.send("WebAuthn.setCredentialProperties", {
                authenticatorId: id3,
                credentialId: credentials[0].credentialId,
                backupState: true,
            });
        } catch (e) {
            전환성공 = false;
            전환오류 = String(e.message ?? e);
        }

        // 동기화가 켜진 뒤 로그인 — BS=1이 실려 온다. 서버는 그것을 볼까?
        const 후 = await browser.evaluate(`(async () => {
            const start = await window.__pk.api('/api/login/options', { method: 'POST' });
            const c = await navigator.credentials.get({ publicKey: window.__pk.toRequestOptions(start.data.options) });
            const body = window.__pk.serializeAuthentication(c);
            const done = await window.__pk.api('/api/login/verify', { method: 'POST', body: { challengeId: start.data.challengeId, response: body } });
            return { 보낸플래그: window.__flags(body.response.authenticatorData), 서버응답본문: done.data };
        })()`);

        // 서버가 이 계정에 대해 들고 있는 것 전부 — 어디에도 BE·BS가 남지 않았음을 보인다.
        // /api/me 가 그 자격증명에 대해 서버가 가진 값 전부를 그대로 내려주는 자리다.
        const 서버가아는것 = await browser.evaluate(`window.__flow.get('/api/me')`);

        results.실측.push({
            번호: 3,
            시나리오: "등록 뒤에 동기화가 켜진 경우 (BS 0 → 1)",
            가상기기설정: { defaultBackupEligibility: true, defaultBackupState: false },
            등록시_서버가_계산한값: {
                credentialDeviceType: 등록.data.credentialDeviceType,
                backedUp: 등록.data.backedUp,
            },
            동기화_켜기_전_로그인: 전,
            BS전환: { 성공: 전환성공, 오류: 전환오류 },
            동기화_켜진_뒤_로그인: 후,
            서버가_이_자격증명에_대해_들고_있는것: 서버가아는것.data,
        });
    }
} finally {
    browser.close();
}

/* ── 결과 저장 및 요약 출력 ──────────────────────────────────────────── */

const 저장경로 = path.join(HERE, "측정결과-BE-BS.json");
fs.writeFileSync(저장경로, JSON.stringify(results, null, 2), "utf-8");

console.log(`\n대상: ${URL_APP}`);
console.log(`측정: ${results.측정시각}\n`);
console.log("─".repeat(78));

for (const r of results.실측) {
    console.log(`\n[실측 ${r.번호}] ${r.시나리오}`);
    console.log(`  가상기기 설정        BE=${+r.가상기기설정.defaultBackupEligibility} BS=${+r.가상기기설정.defaultBackupState}`);
    console.log(
        `  등록 응답            credentialDeviceType="${r.등록시_서버가_계산한값.credentialDeviceType}" backedUp=${r.등록시_서버가_계산한값.backedUp}`,
    );
    if (r.번호 === 3) {
        const a = r.동기화_켜기_전_로그인.보낸플래그;
        const b = r.동기화_켜진_뒤_로그인.보낸플래그;
        console.log(`  전환 전 로그인 플래그  ${a.flagsHex} (BE=${+a.BE} BS=${+a.BS}) → 서버응답 ${JSON.stringify(r.동기화_켜기_전_로그인.서버응답본문)}`);
        console.log(`  BS 전환              ${r.BS전환.성공 ? "성공" : `실패 — ${r.BS전환.오류}`}`);
        console.log(`  전환 후 로그인 플래그  ${b.flagsHex} (BE=${+b.BE} BS=${+b.BS}) → 서버응답 ${JSON.stringify(r.동기화_켜진_뒤_로그인.서버응답본문)}`);
        console.log(`  서버가 들고 있는 것    ${JSON.stringify(r.서버가_이_자격증명에_대해_들고_있는것)}`);
    } else {
        const f = r.로그인시_기기가_보낸_플래그;
        console.log(`  로그인 플래그 바이트   ${f.flagsHex} (${f.flagsBin}) — UP=${+f.UP} UV=${+f.UV} BE=${+f.BE} BS=${+f.BS}`);
        console.log(`  로그인 서버응답        ${JSON.stringify(r.로그인_서버응답)}`);
    }
}

console.log(`\n${"─".repeat(78)}`);
console.log(`결과 저장: ${저장경로}\n`);
