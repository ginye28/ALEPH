/**
 * 검사·촬영이 함께 쓰는 브라우저 하네스.
 *
 * 헤드리스 크롬을 띄우고 개발자 프로토콜(CDP)로 직접 붙습니다. 핵심은 **가상
 * authenticator** — 크롬의 WebAuthn 도메인이 제공하는 소프트웨어 기기입니다. 실제
 * 지문 센서나 보안 키 없이도 진짜와 똑같이 키 쌍을 만들고 서명하므로, 등록·로그인은
 * 물론 "기기를 바꿔 끼웠다 / 잃어버렸다"까지 그대로 재현할 수 있습니다.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 브라우저 안에서 등록·로그인 흐름을 단계별로 태우고, 오간 값을 그대로 돌려주는 도우미. */
export const FLOW_HELPERS = `
window.__flow = {
    async registerOptions(deviceName) {
        const r = await window.__pk.api('/api/register/options', { method: 'POST', body: { deviceName } });
        return { status: r.status, challengeId: r.data.challengeId, challenge: r.data.options?.challenge, options: r.data.options };
    },
    async register(deviceName) {
        const start = await window.__pk.api('/api/register/options', { method: 'POST', body: { deviceName } });
        if (!start.ok) return { ok: false, stage: 'options', status: start.status, error: start.data.error };
        let credential;
        try {
            credential = await navigator.credentials.create({ publicKey: window.__pk.toCreationOptions(start.data.options) });
        } catch (e) {
            return { ok: false, stage: 'authenticator', error: e.name + ': ' + e.message };
        }
        const requestBody = window.__pk.serializeRegistration(credential);
        const done = await window.__pk.api('/api/register/verify', { method: 'POST', body: { challengeId: start.data.challengeId, response: requestBody } });
        return {
            ok: done.ok, stage: 'verify', status: done.status, data: done.data,
            challenge: start.data.options.challenge, challengeId: start.data.challengeId,
            requestBody,
            requestBodyKeys: Object.keys(requestBody),
            responseKeys: Object.keys(requestBody.response),
        };
    },
    /** 등록을 기기 확인 단계에서 취소한다 (사용자가 지문 창을 닫은 것과 같다). */
    async registerCancelled(deviceName) {
        const start = await window.__pk.api('/api/register/options', { method: 'POST', body: { deviceName } });
        const controller = new AbortController();
        const promise = navigator.credentials.create({
            publicKey: window.__pk.toCreationOptions(start.data.options),
            signal: controller.signal,
        });
        controller.abort();
        try { await promise; return { cancelled: false }; }
        catch (e) { return { cancelled: true, name: e.name }; }
    },
    async loginOptions() {
        const r = await window.__pk.api('/api/login/options', { method: 'POST' });
        return { status: r.status, challengeId: r.data.challengeId, challenge: r.data.options?.challenge };
    },
    /**
     * 로그인 한 번. tamper를 켜면 서명을 한 글자 바꿔서 보내고(거절되어야 한다),
     * replay를 켜면 통과한 뒤 **같은 질문·같은 서명을 한 번 더** 보낸다(거절되어야 한다).
     */
    async login({ tamper = false, replay = false } = {}) {
        const start = await window.__pk.api('/api/login/options', { method: 'POST' });
        if (!start.ok) return { ok: false, stage: 'options', status: start.status, error: start.data.error };
        let credential;
        try {
            credential = await navigator.credentials.get({ publicKey: window.__pk.toRequestOptions(start.data.options) });
        } catch (e) {
            return { ok: false, stage: 'authenticator', error: e.name + ': ' + e.message };
        }
        let body = window.__pk.serializeAuthentication(credential);
        if (tamper) {
            const s = body.response.signature;
            const flipped = (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
            body = { ...body, response: { ...body.response, signature: flipped } };
        }
        const first = await window.__pk.api('/api/login/verify', { method: 'POST', body: { challengeId: start.data.challengeId, response: body } });
        const result = { ok: first.ok, status: first.status, data: first.data, challenge: start.data.options.challenge, challengeId: start.data.challengeId, credentialId: body.id };
        if (replay) {
            const second = await window.__pk.api('/api/login/verify', { method: 'POST', body: { challengeId: start.data.challengeId, response: body } });
            result.replay = { ok: second.ok, status: second.status, error: second.data.error };
        }
        return result;
    },
    async get(path) {
        const r = await window.__pk.api(path);
        return { status: r.status, ok: r.ok, data: r.data };
    },
    async post(path, body) {
        const r = await window.__pk.api(path, { method: 'POST', body });
        return { status: r.status, ok: r.ok, data: r.data };
    },
    async del(path) {
        const r = await window.__pk.api(path, { method: 'DELETE' });
        return { status: r.status, ok: r.ok, data: r.data };
    },
};
`;

const AUTHENTICATOR_OPTIONS = {
    protocol: "ctap2",
    transport: "internal",
    hasResidentKey: true, // 아이디 없이 로그인하려면 기기가 자격증명을 직접 들고 있어야 한다
    hasUserVerification: true,
    isUserVerified: true, // 지문을 통과한 것으로 친다
    automaticPresenceSimulation: true, // 손가락을 올린 것으로 친다
};

const CREDENTIAL_FIELDS = [
    "credentialId",
    "isResidentCredential",
    "rpId",
    "privateKey",
    "signCount",
    "userHandle",
];

/**
 * 브라우저를 띄우고 CDP로 붙는다.
 * @returns 조작에 필요한 함수 묶음
 */
export async function openBrowser({ url, port, profilePrefix, width = 1180, height = 1600 }) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), profilePrefix));

    const chrome = spawn(
        CHROME,
        [
            "--headless=new",
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${profile}`,
            `--window-size=${width},${height}`,
            "--hide-scrollbars",
            "--no-first-run",
            "--disable-gpu",
            url,
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

    for (let i = 0; ; i += 1) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
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
                        msg.error
                            ? reject(new Error(JSON.stringify(msg.error)))
                            : resolve(msg.result);
                    }
                };
                break;
            }
        } catch {
            // 아직 준비 전
        }
        if (i >= 60) throw new Error(`브라우저에 연결하지 못했습니다. ${url} 가 열리는지 확인하세요.`);
        await sleep(300);
    }

    const evaluate = async (expression) => {
        const { result, exceptionDetails } = await send("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true,
        });
        if (exceptionDetails) {
            throw new Error(exceptionDetails.exception?.description ?? "평가 실패");
        }
        return result.value;
    };

    /** 페이지를 열고 app.js(모듈이라 조금 늦게 붙는다)가 준비될 때까지 기다린다. */
    const goto = async (target = url) => {
        await send("Page.navigate", { url: target });
        await sleep(500);
        for (let i = 0; i < 40; i += 1) {
            if (await evaluate(`typeof window.__pk === 'object'`)) break;
            await sleep(150);
        }
        await evaluate(FLOW_HELPERS);
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("WebAuthn.enable", { enableUI: false });
    await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
    });
    await goto();

    /* ── 가상 기기 관리 ─────────────────────────────────────────────── */

    const devices = new Map(); // 기기 이름 → 그 기기에 들어 있는 자격증명
    let activeId = null;
    let activeName = null;

    const saveActiveDevice = async () => {
        if (!activeId) return;
        const { credentials } = await send("WebAuthn.getCredentials", { authenticatorId: activeId });
        devices.set(
            activeName,
            credentials.map((c) =>
                Object.fromEntries(
                    CREDENTIAL_FIELDS.filter((k) => c[k] !== undefined).map((k) => [k, c[k]]),
                ),
            ),
        );
    };

    /**
     * "이 기기를 쓰는 중"으로 바꾼다. 지금 붙어 있는 기기는 상태를 저장해 두고 떼어 낸다 —
     * 한 번에 하나만 붙여 두어야 어느 기기가 답했는지가 분명해진다.
     */
    const useDevice = async (name) => {
        await saveActiveDevice();
        if (activeId) {
            await send("WebAuthn.removeVirtualAuthenticator", { authenticatorId: activeId });
        }
        const { authenticatorId } = await send("WebAuthn.addVirtualAuthenticator", {
            options: AUTHENTICATOR_OPTIONS,
        });
        activeId = authenticatorId;
        activeName = name;
        for (const credential of devices.get(name) ?? []) {
            await send("WebAuthn.addCredential", { authenticatorId, credential });
        }
    };

    const activeCredentials = async () => {
        if (!activeId) return [];
        const { credentials } = await send("WebAuthn.getCredentials", { authenticatorId: activeId });
        return credentials;
    };

    const close = () => {
        ws.close();
        chrome.kill();
    };

    return { send, evaluate, goto, useDevice, activeCredentials, close };
}
