/**
 * 날짜 원시 함수.
 *
 * 날짜를 `Date` 객체로 바꿔 비교하지 않고 `YYYY-MM-DD` 문자열로 비교합니다.
 * `new Date("2026-08-24")`는 UTC 자정으로 해석돼 KST에서 하루 밀립니다 —
 * 과제 4에서 같은 함정을 겪었습니다. 날짜 연산이 필요할 때만 `Date.UTC`로
 * 잠깐 만들었다가 바로 문자열로 되돌립니다.
 */

/** 날짜 문자열에 일수를 더합니다. UTC로만 계산해 기기 시간대의 영향을 받지 않습니다. */
export const addDays = (dateKey, days) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const moved = new Date(Date.UTC(year, month - 1, day + days));
    return moved.toISOString().slice(0, 10);
};

/** 분을 사람이 읽는 형태로. 예상·실제 시간 표시가 한 곳에서만 바뀌게 합니다. */
export const formatMinutes = (minutes) => {
    if (!Number.isFinite(minutes)) return "-";
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
};

/**
 * `<input type="datetime-local">` 값("YYYY-MM-DDTHH:mm")을 KST 벽시계 시각으로 못박아
 * ISO(UTC) 문자열로 바꿉니다. 기기의 시간대가 KST가 아니어도 항상 KST로 해석합니다 —
 * 이 앱은 한 사람의 실행 기록이고 기준 시간대는 항상 Asia/Seoul입니다.
 */
export const kstLocalToISO = (localValue) => {
    if (typeof localValue !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)) {
        return null;
    }
    const date = new Date(`${localValue}:00+09:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** 저장된 ISO 시각을 datetime-local 입력칸에 다시 채울 KST 문자열로 되돌립니다. */
export const isoToKstLocal = (iso) => {
    if (!iso) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date(iso));
    const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};

/** 저장된 ISO 시각을 화면에 읽기 좋은 KST 문자열로. */
export const formatKstDateTime = (iso) => {
    if (!iso) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
    }).format(new Date(iso));
};
