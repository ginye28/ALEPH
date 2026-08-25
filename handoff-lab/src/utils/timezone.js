/**
 * 기준 시간대는 한 곳에서만 정의합니다.
 * 브라우저의 로컬 시간대에 의존하면 기기 설정에 따라 날짜가 하루 밀립니다.
 */
export const TIMEZONE = "Asia/Seoul";
export const TIMEZONE_LABEL = "KST (UTC+9)";

/** 날짜별 기록이 가리키는 하루 중 시각. 두 날짜를 같은 조건으로 비교하기 위해 고정합니다. */
export const REFERENCE_HOUR = 9;

// en-CA 로캘은 YYYY-MM-DD 형태를 그대로 돌려줍니다.
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

const clockFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

const stampFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

const toDate = (input) => (input instanceof Date ? input : new Date(input));

/** UTC 기준 시각(Date 또는 ISO 문자열)을 기준 시간대의 날짜 키로 바꿉니다. */
export const dateKeyOf = (input) => dateKeyFormatter.format(toDate(input));

/** 조회 시각 표시용 — "2026. 08. 24. 10:21:33" */
export const formatStamp = (input) => stampFormatter.format(toDate(input));

/** 시:분:초만 표시할 때 사용합니다. */
export const formatClock = (input) => clockFormatter.format(toDate(input));

/**
 * Open-Meteo에 timezone=Asia/Seoul을 넘기면 "2026-08-24T09:00"처럼
 * 시간대 표기가 없는 현지 시각 문자열이 돌아옵니다.
 * 이 문자열을 new Date()에 넣으면 브라우저 로컬 시간대로 해석되므로,
 * 아래 두 함수는 Date를 거치지 않고 문자열을 그대로 읽습니다.
 */
export const isLocalStamp = (stamp) =>
    typeof stamp === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stamp);

export const dateKeyOfLocalStamp = (stamp) => (isLocalStamp(stamp) ? stamp.slice(0, 10) : null);

export const hourOfLocalStamp = (stamp) => (isLocalStamp(stamp) ? Number(stamp.slice(11, 13)) : null);

/** "2026-08-24T09:00" → "08월 24일 09시" */
export const formatLocalStamp = (stamp) => {
    if (!isLocalStamp(stamp)) {
        return "-";
    }
    return `${stamp.slice(5, 7)}월 ${stamp.slice(8, 10)}일 ${stamp.slice(11, 13)}시`;
};
