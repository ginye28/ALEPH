/**
 * 주간 요약 (카드 4).
 *
 * 날짜를 Date 객체로 바꾸지 않고 `YYYY-MM-DD` 문자열 비교로 주를 판정합니다.
 * `new Date("2026-08-24")`는 UTC 자정으로 해석돼 KST에서 하루 밀립니다 —
 * 과제 4에서 같은 함정을 겪었습니다.
 */
import { checkRecord } from "./validate";

/** 날짜 문자열에 일수를 더합니다. UTC로만 계산해 기기 시간대의 영향을 받지 않습니다. */
const addDays = (dateKey, days) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const moved = new Date(Date.UTC(year, month - 1, day + days));
    return moved.toISOString().slice(0, 10);
};

/** 요일 (0=일 … 6=토). UTC 기준으로 구해야 기기 시간대에 흔들리지 않습니다. */
const weekdayOf = (dateKey) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

/** 그 날짜가 속한 주의 월요일. 주는 월요일 00:00 ~ 일요일 23:59입니다. */
export const mondayOf = (dateKey) => {
    const weekday = weekdayOf(dateKey);
    // 일요일(0)은 그 주의 마지막 날이므로 6일을 빼야 월요일이 됩니다.
    const back = weekday === 0 ? 6 : weekday - 1;
    return addDays(dateKey, -back);
};

export const sundayOf = (dateKey) => addDays(mondayOf(dateKey), 6);

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export const formatRange = (monday, sunday) =>
    `${monday}(${WEEKDAY_KO[weekdayOf(monday)]}) ~ ${sunday}(${WEEKDAY_KO[weekdayOf(sunday)]})`;

/**
 * 유효한 기록과 보류 기록을 나눕니다.
 *
 * 걸러내는 순서가 중요합니다 —
 * ① 형식 검사 → ② id 중복 검사. 중복 판정은 유효한 기록끼리만 합니다.
 */
export const partition = (records) => {
    const valid = [];
    const held = [];
    const seen = new Set();

    (Array.isArray(records) ? records : []).forEach((record) => {
        const checked = checkRecord(record);
        if (!checked.ok) {
            held.push({ record, reason: checked.reason });
            return;
        }
        if (seen.has(record.id)) {
            held.push({ record, reason: "id 중복 — 앞엣것만 셉니다" });
            return;
        }
        seen.add(record.id);
        valid.push(record);
    });

    return { valid, held };
};

/**
 * 한 주를 집계합니다.
 * 보류 기록은 여기 들어오지 않습니다 — 그게 카드 4의 통과 기준입니다.
 */
export const summarize = (records, anchorDate) => {
    const { valid, held } = partition(records);
    const monday = mondayOf(anchorDate);
    const sunday = sundayOf(anchorDate);

    // 문자열 비교. monday <= date <= sunday 이면 그 주입니다.
    const inWeek = valid.filter((record) => record.date >= monday && record.date <= sunday);
    const totalMinutes = inWeek.reduce((sum, record) => sum + record.minutes, 0);

    const bySubject = new Map();
    inWeek.forEach((record) => {
        bySubject.set(record.subject, (bySubject.get(record.subject) ?? 0) + record.minutes);
    });

    return {
        monday,
        sunday,
        range: formatRange(monday, sunday),
        records: inWeek,
        count: inWeek.length,
        totalMinutes,
        heldCount: held.length,
        held,
        // 목록에 그릴 기록. 주와 무관하게 형식이 맞는 것 전부입니다 —
        // 목록까지 주 단위로 잘리면 다른 주의 기록을 고칠 방법이 없습니다.
        valid,
        validCount: valid.length,
        bySubject: [...bySubject.entries()]
            .map(([subject, minutes]) => ({ subject, minutes }))
            .sort((a, b) => b.minutes - a.minutes),
    };
};

/** 분을 사람이 읽는 형태로. 집계값과 화면값이 어긋나지 않게 한 곳에서만 바꿉니다. */
export const formatMinutes = (minutes) => {
    if (!Number.isFinite(minutes)) return "-";
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
};
