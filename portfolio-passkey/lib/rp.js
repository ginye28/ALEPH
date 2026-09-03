/**
 * RP(Relying Party) 신원 — 이 사이트가 스스로를 무엇이라 부르는가.
 *
 * WebAuthn 서명은 origin과 rpID에 묶인다. 그래서 "요청이 들어온 Host 헤더를 그대로 믿고"
 * rpID를 정하면 안 된다 — 헤더는 공격자가 바꿔 보낼 수 있다. 허용 목록에 있는 origin일
 * 때만 받아들이고, rpID는 그 origin에서 뽑는다.
 */

const RP_NAME = "JIN 소개 페이지";

/** 로컬 개발용. localhost는 WebAuthn이 HTTPS 없이도 허용하는 유일한 예외다. */
const DEV_ORIGINS = ["http://localhost:5179", "http://127.0.0.1:5179"];

export function allowedOrigins() {
    const fromEnv = String(process.env.RP_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    // Vercel이 넣어주는 값들 — 프로덕션 도메인과 이번 배포의 고유 주소
    const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
        : [];
    const thisDeployment = process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [];

    return [...new Set([...fromEnv, ...production, ...thisDeployment, ...DEV_ORIGINS])];
}

/**
 * 이번 요청이 어느 origin에서 왔는지 확인하고, 허용 목록에 있으면 RP 신원을 돌려준다.
 * @returns {{ok: true, origin: string, rpID: string, rpName: string} | {ok: false, error: string}}
 */
export function resolveRp(req) {
    const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").trim();
    if (!host) return { ok: false, error: "Host 헤더가 없습니다." };

    const origin = `${proto}://${host}`;
    if (!allowedOrigins().includes(origin)) {
        return { ok: false, error: `허용되지 않은 주소입니다: ${origin}` };
    }

    return { ok: true, origin, rpID: new URL(origin).hostname, rpName: RP_NAME };
}

/** HTTPS로 들어온 요청인가 — 쿠키에 Secure를 붙일지 판단한다. */
export function isSecureRequest(req) {
    const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    return proto === "https";
}
