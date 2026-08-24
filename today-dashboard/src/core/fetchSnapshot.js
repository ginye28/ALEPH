import { requestWithFailureMode } from "./failureSim";

export const TIMEOUT_MS = 5000;

/**
 * 자료를 가져오는 코드는 이 함수 하나뿐입니다.
 * 화면·저장·비교는 전부 이 함수가 돌려준 snapshot만 씁니다.
 * 같은 값을 두 군데서 따로 계산하지 않으므로 화면값과 저장값이 어긋날 경로가 없습니다.
 */
export const fetchSnapshot = async ({ provider, failureMode = "none" }) => {
    const sourceUrl = provider.buildSourceUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await requestWithFailureMode(failureMode, sourceUrl, controller.signal);

        if (response.status === 401 || response.status === 403) {
            return failure("auth", `출처가 접근을 거부했습니다 (HTTP ${response.status}).`);
        }
        if (response.status === 429) {
            return failure("rateLimit", "짧은 시간에 요청이 너무 많았습니다 (HTTP 429).");
        }
        if (!response.ok) {
            return failure("http", `출처 서버가 오류를 돌려줬습니다 (HTTP ${response.status}).`);
        }

        const json = await response.json().catch(() => null);
        if (json === null) {
            return failure("formatChange", "응답을 JSON으로 읽지 못했습니다.");
        }

        const normalized = provider.normalize(json);
        if (!normalized.ok) {
            return failure(
                "formatChange",
                `응답에 기대한 항목이 없습니다: ${normalized.missing.join(", ")}`,
            );
        }

        return {
            ok: true,
            snapshot: {
                providerKey: provider.key,
                itemLabel: provider.label,
                value: normalized.value,
                unit: normalized.unit,
                observedAt: normalized.observedAt,
                series: normalized.series,
                sourceUrl,
                fetchedAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        if (error?.name === "AbortError") {
            return failure("timeout", `${TIMEOUT_MS / 1000}초 안에 응답이 오지 않았습니다.`);
        }
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return failure("offline", "인터넷에 연결돼 있지 않습니다.");
        }
        return failure("offline", "출처에 연결하지 못했습니다.");
    } finally {
        clearTimeout(timer);
    }
};

const failure = (errorKind, message) => ({
    ok: false,
    errorKind,
    message,
    at: new Date().toISOString(),
});
