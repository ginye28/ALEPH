/**
 * 기록 한 건 검사 (설계 원칙 3).
 *
 * 저장 전에 한 번, 집계 전에 한 번 더 부릅니다.
 * 잘못된 값은 버리지 않고 이유와 함께 `보류`로 남깁니다 —
 * 조용히 버리면 사용자는 자기 기록이 사라진 줄 압니다.
 */

export const TIMEZONE = "Asia/Seoul";
export const TIMEZONE_LABEL = "Asia/Seoul (UTC+9)";
export const UNIT = "분";
export const MAX_MINUTES = 1440;
export const MAX_SUBJECT = 40;
export const MAX_MEMO = 200;

/** 오늘 날짜를 기기 시계가 아니라 기준 시간대로 구합니다. */
export const todayKey = (now = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);

/**
 * 날짜 문자열 검사.
 * 형식만 보지 않고 실제로 있는 날짜인지까지 봅니다 — 2026-02-30은 형식은 맞지만 없는 날입니다.
 */
export const checkDate = (value) => {
    if (typeof value !== "string" || value.trim() === "") {
        return { ok: false, reason: "날짜가 비었습니다" };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { ok: false, reason: "날짜 형식이 아닙니다 (YYYY-MM-DD)" };
    }

    const [year, month, day] = value.split("-").map(Number);
    if (month < 1 || month > 12) {
        return { ok: false, reason: "없는 달입니다" };
    }
    // UTC로 만들어 비교합니다. 지역 시간대로 만들면 기기 설정에 따라 날짜가 밀립니다.
    const made = new Date(Date.UTC(year, month - 1, day));
    if (
        made.getUTCFullYear() !== year ||
        made.getUTCMonth() !== month - 1 ||
        made.getUTCDate() !== day
    ) {
        return { ok: false, reason: "없는 날짜입니다" };
    }
    return { ok: true };
};

/** 값 검사. 상한을 두는 이유 — 600을 6000으로 잘못 치면 주간 합계가 통째로 망가집니다. */
export const checkMinutes = (value) => {
    if (value === null || value === undefined || value === "") {
        return { ok: false, reason: "값이 비었습니다" };
    }
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(number)) {
        return { ok: false, reason: "숫자가 아닙니다" };
    }
    if (!Number.isInteger(number)) {
        return { ok: false, reason: "정수만 넣을 수 있습니다" };
    }
    if (number < 1) {
        return { ok: false, reason: "1 이상이어야 합니다" };
    }
    if (number > MAX_MINUTES) {
        return { ok: false, reason: `${MAX_MINUTES} 이하여야 합니다 (하루는 ${MAX_MINUTES}분)` };
    }
    return { ok: true, value: number };
};

export const checkSubject = (value) => {
    if (typeof value !== "string" || value.trim() === "") {
        return { ok: false, reason: "과목이 비었습니다" };
    }
    if (value.trim().length > MAX_SUBJECT) {
        return { ok: false, reason: `${MAX_SUBJECT}자 이하로 써주세요` };
    }
    return { ok: true, value: value.trim() };
};

export const checkMemo = (value) => {
    if (value === null || value === undefined || value === "") return { ok: true, value: "" };
    if (typeof value !== "string") return { ok: false, reason: "메모는 글자여야 합니다" };
    if (value.length > MAX_MEMO) return { ok: false, reason: `${MAX_MEMO}자 이하로 써주세요` };
    return { ok: true, value };
};

/**
 * 입력 폼 한 벌을 검사합니다.
 * 칸마다 이유를 돌려주므로 화면이 어느 칸이 문제인지 바로 표시할 수 있습니다.
 */
export const checkForm = (form) => {
    const errors = {};
    const date = checkDate(form.date);
    if (!date.ok) errors.date = date.reason;

    const subject = checkSubject(form.subject);
    if (!subject.ok) errors.subject = subject.reason;

    const minutes = checkMinutes(form.minutes);
    if (!minutes.ok) errors.minutes = minutes.reason;

    const memo = checkMemo(form.memo);
    if (!memo.ok) errors.memo = memo.reason;

    if (Object.keys(errors).length > 0) return { ok: false, errors };

    return {
        ok: true,
        value: {
            date: form.date,
            subject: subject.value,
            minutes: minutes.value,
            memo: memo.value,
            tag: typeof form.tag === "string" ? form.tag.trim() : "",
        },
    };
};

/**
 * 저장된 기록 한 건 검사. 집계 직전에 부릅니다.
 * 여기서 걸리는 기록은 화면의 `보류` 칸으로 갑니다.
 */
export const checkRecord = (record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
        return { ok: false, reason: "기록 형식이 아닙니다" };
    }
    if (typeof record.id !== "string" || record.id === "") {
        return { ok: false, reason: "id가 없습니다" };
    }

    const date = checkDate(record.date);
    if (!date.ok) return { ok: false, reason: date.reason };

    const subject = checkSubject(record.subject);
    if (!subject.ok) return { ok: false, reason: subject.reason };

    const minutes = checkMinutes(record.minutes);
    if (!minutes.ok) return { ok: false, reason: minutes.reason };

    return { ok: true };
};
