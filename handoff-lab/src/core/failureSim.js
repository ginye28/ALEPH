/**
 * 장애 5종 모의실험 (카드 3).
 *
 * 실제 서버가 고장 나기를 기다릴 수 없으므로, 다음 요청 한 번의 결과만 강제로 바꿉니다.
 * 바뀌는 것은 "응답"뿐이고, 그 뒤의 처리 경로는 실제 장애와 완전히 같습니다.
 */

export const FAILURE_MODES = [
    {
        id: "timeout",
        label: "제한시간 초과",
        hint: "응답이 오지 않는 상황 (5초 대기)",
    },
    {
        id: "auth",
        label: "인증 실패",
        hint: "401 응답",
    },
    {
        id: "rateLimit",
        label: "호출 제한",
        hint: "429 응답",
    },
    {
        id: "offline",
        label: "오프라인",
        hint: "요청 자체가 실패",
    },
    {
        id: "formatChange",
        label: "응답 형식 변경",
        hint: "200이지만 기대한 항목이 없음",
    },
];

const abortError = () => new DOMException("모의 제한시간 초과", "AbortError");

const fakeResponse = (status, body) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });

/**
 * mode가 "none"이면 진짜 fetch를 그대로 실행합니다.
 * 그 외에는 실제 네트워크를 쓰지 않고 해당 장애 상황의 응답을 만들어 돌려줍니다.
 */
export const requestWithFailureMode = (mode, url, signal) => {
    switch (mode) {
        case "timeout":
            // 영원히 응답하지 않는 요청. 바깥의 AbortController가 제한시간 뒤에 끊습니다.
            return new Promise((_resolve, reject) => {
                if (signal.aborted) {
                    reject(abortError());
                    return;
                }
                signal.addEventListener("abort", () => reject(abortError()), { once: true });
            });

        case "auth":
            return Promise.resolve(fakeResponse(401));

        case "rateLimit":
            return Promise.resolve(fakeResponse(429));

        case "offline":
            // 브라우저가 연결에 실패했을 때 fetch가 던지는 것과 같은 오류입니다.
            return Promise.reject(new TypeError("Failed to fetch"));

        case "formatChange":
            return Promise.resolve(fakeResponse(200, { unexpected: true }));

        default:
            return fetch(url, { signal, cache: "no-store" });
    }
};
