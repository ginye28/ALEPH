/**
 * "마지막 정상값(lastGood)"과 "지금 시도(attempt)"를 절대 같은 자리에 담지 않습니다.
 * 실패는 attempt만 바꾸고 lastGood은 건드리지 않습니다.
 * 이 규칙 하나가 카드 3의 통과 기준("현재 자료인지 오래된 자료인지 구분")을 만듭니다.
 */

// 앱은 화면에 뜨자마자 조회를 시작하므로, 정직한 첫 상태는 idle이 아니라 loading입니다.
export const initialState = {
    lastGood: null,
    attempt: { status: "loading", errorKind: null, errorMessage: null, at: null },
};

export const reducer = (state, action) => {
    switch (action.type) {
        case "start":
            // 이전 오류 상태를 여기서 반드시 지웁니다.
            // 남겨두면 새 요청이 성공해도 옛 오류 문구가 함께 보입니다.
            return {
                ...state,
                attempt: { status: "loading", errorKind: null, errorMessage: null, at: null },
            };

        case "success":
            return {
                lastGood: action.snapshot,
                attempt: {
                    status: "ok",
                    errorKind: null,
                    errorMessage: null,
                    at: action.snapshot.fetchedAt,
                },
            };

        case "failure":
            return {
                lastGood: state.lastGood,
                attempt: {
                    status: "error",
                    errorKind: action.errorKind,
                    errorMessage: action.message,
                    at: action.at,
                },
            };

        default:
            return state;
    }
};

const ERROR_TITLES = {
    timeout: "응답이 지연되고 있어요",
    auth: "접근 권한에 문제가 있어요",
    rateLimit: "요청이 많아 잠시 제한됐어요",
    offline: "인터넷 연결을 확인해주세요",
    formatChange: "출처 응답 형식이 바뀌었어요",
    http: "출처 서버에 문제가 있어요",
};

/**
 * 화면 상태는 오직 이 함수 하나가 결정합니다.
 * tone: ok(정상) / stale(오래된 데이터) / empty(정상값 없음) / loading
 */
export const describeStatus = ({ lastGood, attempt }) => {
    if (attempt.status === "loading") {
        return {
            tone: lastGood ? "stale" : "loading",
            title: lastGood ? "새로 확인하는 중" : "불러오는 중",
            detail: lastGood ? "아래 값은 직전 정상 조회 결과입니다." : null,
            showsValue: Boolean(lastGood),
        };
    }

    if (attempt.status === "ok") {
        return {
            tone: "ok",
            title: "현재 자료",
            detail: "방금 조회한 값입니다.",
            showsValue: true,
        };
    }

    if (attempt.status === "error") {
        const title = ERROR_TITLES[attempt.errorKind] ?? "알 수 없는 문제가 생겼어요";

        if (!lastGood) {
            // 정상값이 한 번도 없으면 값이 있는 것처럼 보이면 안 됩니다.
            return {
                tone: "empty",
                title,
                detail: attempt.errorMessage,
                showsValue: false,
            };
        }

        return {
            tone: "stale",
            title: `오래된 데이터 · ${title}`,
            detail: attempt.errorMessage,
            showsValue: true,
        };
    }

    return { tone: "loading", title: "준비 중", detail: null, showsValue: false };
};
