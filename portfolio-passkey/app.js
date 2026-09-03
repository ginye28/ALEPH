/**
 * 화면 쪽 로직.
 *
 * WebAuthn의 브라우저 쪽 일은 사실상 **자료 형식 변환**뿐이다. 서버가 JSON으로 보낸
 * base64url 문자열을 ArrayBuffer로 바꿔 `navigator.credentials`에 넘기고, 돌아온
 * ArrayBuffer를 다시 base64url로 바꿔 서버로 보낸다. 보안 판단(질문이 맞는지, 서명이
 * 맞는지, 어느 사이트에서 왔는지)은 한 줄도 여기서 하지 않는다 — 전부 기기(authenticator)와
 * 서버(@simplewebauthn/server)가 한다. 그래서 이 40여 줄은 라이브러리를 받아 오지 않고
 * 직접 썼고, 정작 중요한 검증은 표준 라이브러리에 맡겼다.
 *
 * 비공개 내용은 **여기서 처음 화면에 들어온다.** 서버가 내려주는 최초 HTML에는 없다
 * (T08-C18) — CSS로 숨기는 것과는 완전히 다르다.
 */

/* ----------------------------------------------------------- base64url 변환 */

function bytesToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/* -------------------------------------------------------------------- 서버 */

async function api(path, { method = "GET", body } = {}) {
    const response = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    let payload = {};
    try {
        payload = await response.json();
    } catch {
        payload = {};
    }
    return { status: response.status, ok: response.ok, data: payload };
}

/* --------------------------------------------------------------- WebAuthn */

const supportsPasskeys = () =>
    typeof window.PublicKeyCredential === "function" && Boolean(navigator.credentials?.create);

/** 서버가 준 등록 옵션(JSON)을 브라우저가 먹는 형태로 바꾼다. */
function toCreationOptions(options) {
    return {
        ...options,
        challenge: base64urlToBytes(options.challenge),
        user: { ...options.user, id: base64urlToBytes(options.user.id) },
        excludeCredentials: (options.excludeCredentials || []).map((c) => ({
            ...c,
            id: base64urlToBytes(c.id),
        })),
    };
}

function toRequestOptions(options) {
    return {
        ...options,
        challenge: base64urlToBytes(options.challenge),
        allowCredentials: (options.allowCredentials || []).map((c) => ({
            ...c,
            id: base64urlToBytes(c.id),
        })),
    };
}

/** 기기가 돌려준 등록 결과를 서버로 보낼 JSON으로 바꾼다. */
function serializeRegistration(credential) {
    const response = credential.response;
    const json = {
        id: credential.id,
        rawId: bytesToBase64url(credential.rawId),
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults(),
        response: {
            clientDataJSON: bytesToBase64url(response.clientDataJSON),
            attestationObject: bytesToBase64url(response.attestationObject),
        },
    };
    if (credential.authenticatorAttachment) {
        json.authenticatorAttachment = credential.authenticatorAttachment;
    }
    if (typeof response.getTransports === "function") {
        json.response.transports = response.getTransports();
    }
    return json;
}

function serializeAuthentication(credential) {
    const response = credential.response;
    const json = {
        id: credential.id,
        rawId: bytesToBase64url(credential.rawId),
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults(),
        response: {
            clientDataJSON: bytesToBase64url(response.clientDataJSON),
            authenticatorData: bytesToBase64url(response.authenticatorData),
            signature: bytesToBase64url(response.signature),
        },
    };
    if (credential.authenticatorAttachment) {
        json.authenticatorAttachment = credential.authenticatorAttachment;
    }
    if (response.userHandle) {
        json.response.userHandle = bytesToBase64url(response.userHandle);
    }
    return json;
}

async function registerPasskey(deviceName) {
    const start = await api("/api/register/options", { method: "POST", body: { deviceName } });
    if (!start.ok) return { ok: false, message: start.data.error || "등록을 시작하지 못했습니다." };

    let credential;
    try {
        credential = await navigator.credentials.create({
            publicKey: toCreationOptions(start.data.options),
        });
    } catch (error) {
        // 사용자가 지문/PIN 창에서 취소하면 여기로 온다 (T08-C25).
        if (error.name === "InvalidStateError") {
            return { ok: false, message: "이 기기에는 이미 패스키가 등록되어 있습니다." };
        }
        return {
            ok: false,
            message: "등록을 취소했습니다. 서버에는 계정도 패스키도 만들어지지 않았습니다.",
        };
    }

    const done = await api("/api/register/verify", {
        method: "POST",
        body: { challengeId: start.data.challengeId, response: serializeRegistration(credential) },
    });
    if (!done.ok) return { ok: false, message: done.data.error || "등록을 확인하지 못했습니다." };
    return { ok: true, data: done.data };
}

/**
 * 되돌릴 수 없는 동작 직전에 패스키를 한 번 더 확인받는다.
 * 로그인과 달리 새 세션을 만들지 않고, 지금 세션에 "방금 확인했다"는 표시만 남긴다.
 */
async function reauthenticate() {
    const start = await api("/api/reauth/options", { method: "POST" });
    if (!start.ok) return { ok: false, message: start.data.error || "확인을 시작하지 못했습니다." };

    let credential;
    try {
        credential = await navigator.credentials.get({
            publicKey: toRequestOptions(start.data.options),
        });
    } catch {
        return { ok: false, message: "확인을 취소했습니다. 아무것도 지우지 않았습니다." };
    }

    const done = await api("/api/reauth/verify", {
        method: "POST",
        body: {
            challengeId: start.data.challengeId,
            response: serializeAuthentication(credential),
        },
    });
    if (!done.ok) return { ok: false, message: done.data.error || "확인하지 못했습니다." };
    return { ok: true };
}

async function loginWithPasskey() {
    const start = await api("/api/login/options", { method: "POST" });
    if (!start.ok) return { ok: false, message: start.data.error || "로그인을 시작하지 못했습니다." };

    let credential;
    try {
        credential = await navigator.credentials.get({
            publicKey: toRequestOptions(start.data.options),
        });
    } catch {
        return { ok: false, message: "로그인을 취소했습니다." };
    }

    const done = await api("/api/login/verify", {
        method: "POST",
        body: {
            challengeId: start.data.challengeId,
            response: serializeAuthentication(credential),
        },
    });
    if (!done.ok) return { ok: false, message: done.data.error || "로그인하지 못했습니다." };
    return { ok: true, data: done.data };
}

/* ------------------------------------------------------------------ 화면 */

const $ = (selector) => document.querySelector(selector);
const KIND_LABEL = {
    project_memo: "프로젝트 메모",
    target_company: "지원 목록",
    retro: "회고",
};

let state = { status: "unknown", account: null, credentials: [], notes: [], pendingDelete: null };

function setMessage(text, tone = "info") {
    setNodeMessage($("[data-testid='auth-message']"), text, tone);
}

function setAccountMessage(text, tone = "info") {
    setNodeMessage($("[data-testid='account-message']"), text, tone);
}

function setNodeMessage(node, text, tone) {
    node.textContent = text || "";
    node.dataset.tone = tone;
    node.hidden = !text;
}

async function refresh() {
    const me = await api("/api/me");
    if (!me.ok) {
        state = { status: "locked", account: null, credentials: [], notes: [] };
        render();
        return;
    }
    const notes = await api("/api/private-notes");
    state = {
        status: "unlocked",
        account: me.data.account,
        credentials: me.data.credentials,
        notes: notes.ok ? notes.data.notes : [],
        pendingDelete: null,
    };
    render();
}

function render() {
    const locked = state.status !== "unlocked";

    $("#locked-view").hidden = !locked;
    $("#unlocked-view").hidden = locked;

    const stateLabel = $("[data-testid='private-state']");
    stateLabel.textContent = locked ? "잠김 — 패스키가 있어야 열립니다" : "열림";
    stateLabel.dataset.state = locked ? "locked" : "unlocked";

    if (locked) return;

    $("[data-testid='notes']").innerHTML = state.notes
        .map(
            (note) => `
            <article class="note" data-note-id="${note.id}">
                <span class="note-kind">${KIND_LABEL[note.kind] || note.kind}</span>
                <h4>${escapeHtml(note.title)}</h4>
                <p>${escapeHtml(note.body)}</p>
            </article>`,
        )
        .join("");

    const isLastOne = state.credentials.length === 1;

    $("[data-testid='credentials']").innerHTML = state.credentials
        .map((credential) => {
            const confirming = state.pendingDelete === credential.id;
            const warning = isLastOne
                ? "⚠ 마지막 패스키입니다. 지우면 이 계정에 다시 들어올 방법이 없습니다 — 비밀번호도 이메일도 없어서 되돌릴 수 없습니다."
                : "지운 패스키로는 더 이상 들어올 수 없습니다. 남은 패스키로는 그대로 들어올 수 있습니다.";

            return `
            <li class="credential" data-credential-id="${credential.id}">
                <div>
                    <strong>${escapeHtml(credential.deviceName)}</strong>
                    <span class="credential-meta">${formatDate(credential.createdAt)} 등록 · ${credential.shortId}…</span>
                    <details class="credential-key">
                        <summary>서버가 가진 값 보기</summary>
                        <p class="credential-key-note">
                            서버에 저장된 것은 <b>공개키</b>뿐입니다. 이 값으로는 서명을 확인만 할 수 있고
                            만들어 낼 수는 없습니다 — 비밀번호가 아닙니다. 서명을 만드는 개인키는
                            기기 안에만 있고 여기로 온 적이 없습니다.
                        </p>
                        <code data-testid="public-key">${escapeHtml(credential.publicKey)}</code>
                        <p class="credential-key-note">서명 횟수: ${credential.signCount}</p>
                    </details>
                </div>
                ${
                    confirming
                        ? ""
                        : `<button type="button" class="link-danger" data-delete-credential="${credential.id}">지우기</button>`
                }
                ${
                    confirming
                        ? `<div class="delete-confirm" data-testid="delete-confirm">
                                <p class="delete-warning">${warning}</p>
                                <div class="pk-actions">
                                    <button type="button" class="link-danger" data-confirm-delete="${credential.id}">
                                        네, 지웁니다 — 되돌릴 수 없습니다
                                    </button>
                                    <button type="button" class="pk-button" data-cancel-delete="1">취소</button>
                                </div>
                           </div>`
                        : ""
                }
            </li>`;
        })
        .join("");

    $("[data-testid='credential-count']").textContent = String(state.credentials.length);

    // 패스키가 하나뿐이면 그 기기를 잃는 순간 계정도 잃는다. 되살릴 수단을 두지 않았으므로
    // 미리 하나 더 등록하라고 눈에 띄게 알린다 (설명서 ⑥의 "복구 수단 없음"에 대한 대비).
    $("[data-testid='single-passkey-warning']").hidden = state.credentials.length !== 1;
}

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

/* ------------------------------------------------------------------ 동작 */

function wire() {
    if (!supportsPasskeys()) {
        setMessage(
            "이 브라우저는 패스키를 지원하지 않습니다. 최신 크롬·엣지·사파리에서 열어 주세요.",
            "bad",
        );
        $("[data-testid='login-start']").disabled = true;
        $("[data-testid='register-start']").disabled = true;
        return;
    }

    $("[data-testid='register-start']").addEventListener("click", () => {
        $("#register-form").hidden = false;
        $("[data-testid='device-name']").focus();
        setMessage("");
    });

    $("[data-testid='register-cancel']").addEventListener("click", () => {
        $("#register-form").hidden = true;
        setMessage("");
    });

    $("[data-testid='register-submit']").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const deviceName = $("[data-testid='device-name']").value.trim() || "내 기기";
        button.disabled = true;
        setMessage("기기에서 확인을 기다리는 중…");

        const result = await registerPasskey(deviceName);
        button.disabled = false;

        if (!result.ok) return setMessage(result.message, "bad");
        $("#register-form").hidden = true;
        $("[data-testid='device-name']").value = "";
        setMessage("");
        await refresh();
    });

    $("[data-testid='login-start']").addEventListener("click", async (event) => {
        event.currentTarget.disabled = true;
        setMessage("기기에서 확인을 기다리는 중…");

        const result = await loginWithPasskey();
        event.currentTarget.disabled = false;

        if (!result.ok) return setMessage(result.message, "bad");
        setMessage("");
        await refresh();
    });

    $("[data-testid='logout']").addEventListener("click", async () => {
        await api("/api/logout", { method: "POST" });
        await refresh();
    });

    $("[data-testid='add-passkey']").addEventListener("click", () => {
        $("#add-passkey-form").hidden = false;
        $("[data-testid='add-device-name']").focus();
        setAccountMessage("");
    });

    $("[data-testid='add-passkey-cancel']").addEventListener("click", () => {
        $("#add-passkey-form").hidden = true;
        setAccountMessage("");
    });

    $("[data-testid='add-passkey-submit']").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const deviceName = $("[data-testid='add-device-name']").value.trim() || "두 번째 기기";
        button.disabled = true;
        setAccountMessage("기기에서 확인을 기다리는 중…");

        const result = await registerPasskey(deviceName);
        button.disabled = false;

        if (!result.ok) return setAccountMessage(result.message, "bad");
        $("#add-passkey-form").hidden = true;
        $("[data-testid='add-device-name']").value = "";
        setAccountMessage("");
        await refresh();
    });

    // 삭제는 두 단계다 — 누르면 경고가 화면에 펼쳐지고, 한 번 더 눌러야 지워진다 (T08-C46).
    $("[data-testid='credentials']").addEventListener("click", async (event) => {
        const data = event.target.dataset ?? {};

        if (data.deleteCredential) {
            state = { ...state, pendingDelete: data.deleteCredential };
            return render();
        }
        if (data.cancelDelete) {
            state = { ...state, pendingDelete: null };
            return render();
        }
        if (!data.confirmDelete) return;

        const target = `/api/credentials/${data.confirmDelete}`;
        let result = await api(target, { method: "DELETE" });

        // 서버가 "다시 확인해 달라"고 하면 패스키를 한 번 더 대고 나서 재시도한다.
        if (!result.ok && result.data.needsReauth) {
            setAccountMessage("지우기 전에 패스키로 한 번 더 확인합니다…");
            const confirmed = await reauthenticate();
            if (!confirmed.ok) return setAccountMessage(confirmed.message, "bad");
            result = await api(target, { method: "DELETE" });
        }

        if (!result.ok) return setAccountMessage(result.data.error || "지우지 못했습니다.", "bad");

        setAccountMessage("");
        await refresh();
        if (result.data.accountUnreachable) {
            setMessage(
                "마지막 패스키를 지웠습니다. 이 계정에는 이제 들어올 방법이 없습니다 — 되살릴 수단을 두지 않았습니다.",
                "bad",
            );
        }
    });

    $("#note-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        // form.title은 HTML 요소의 title 속성과 겹치므로 elements로 꺼낸다.
        const form = event.currentTarget;
        const payload = {
            kind: form.elements.kind.value,
            title: form.elements.title.value.trim(),
            body: form.elements.body.value.trim(),
        };
        if (!payload.title || !payload.body) return;

        const result = await api("/api/private-notes", { method: "POST", body: payload });
        if (!result.ok) return setAccountMessage(result.data.error || "저장하지 못했습니다.", "bad");
        form.reset();
        await refresh();
    });

    // 과제 1에 있던 "자세히 보기" 버튼 — 그대로 유지한다.
    const detailButton = document.querySelector(".detail-button");
    const detailContent = document.getElementById("strength-detail");
    if (detailButton && detailContent) {
        detailButton.addEventListener("click", () => {
            const willOpen = detailContent.hidden;
            detailContent.hidden = !willOpen;
            detailButton.setAttribute("aria-expanded", String(willOpen));
            detailButton.textContent = willOpen ? "접기" : "자세히 보기";
        });
    }
}

wire();
refresh();

// 검사 도구(tools/check.mjs)가 브라우저 안에서 같은 흐름을 그대로 태우기 위한 통로.
window.__pk = {
    api,
    registerPasskey,
    loginWithPasskey,
    refresh,
    state: () => state,
    bytesToBase64url,
    base64urlToBytes,
    serializeRegistration,
    serializeAuthentication,
    toCreationOptions,
    toRequestOptions,
};
