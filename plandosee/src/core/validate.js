/**
 * 입력 검사.
 *
 * 저장 전에 한 번 부릅니다. 잘못된 값은 저장하지 않고 칸마다 이유를 돌려줍니다 —
 * 조용히 막으면 사용자는 왜 안 되는지 모릅니다.
 */

export const TIMEZONE = "Asia/Seoul";
export const TIMEZONE_LABEL = "Asia/Seoul (UTC+9)";

export const PRIORITIES = ["low", "medium", "high"];
export const PRIORITY_LABEL = { low: "낮음", medium: "보통", high: "높음" };

export const MAX_TITLE = 80;
export const MAX_TEXT = 400;
export const MAX_MINUTES = 100000; // 약 69일. 오타로 자릿수가 늘어나도 집계가 통째로 망가지지 않게 상한을 둡니다.
export const MAX_TAGS = 5;
export const MAX_TAG_LEN = 20;

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
export const checkDate = (value, { required = true, label = "날짜" } = {}) => {
    if (typeof value !== "string" || value.trim() === "") {
        return required ? { ok: false, reason: `${label}이(가) 비었습니다` } : { ok: true, value: null };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { ok: false, reason: `${label} 형식이 아닙니다 (YYYY-MM-DD)` };
    }
    const [year, month, day] = value.split("-").map(Number);
    if (month < 1 || month > 12) return { ok: false, reason: "없는 달입니다" };
    const made = new Date(Date.UTC(year, month - 1, day));
    if (made.getUTCFullYear() !== year || made.getUTCMonth() !== month - 1 || made.getUTCDate() !== day) {
        return { ok: false, reason: "없는 날짜입니다" };
    }
    return { ok: true, value };
};

export const checkText = (value, { required = true, max = MAX_TEXT, label = "값" } = {}) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (required && trimmed === "") return { ok: false, reason: `${label}이(가) 비었습니다` };
    if (trimmed.length > max) return { ok: false, reason: `${label}은(는) ${max}자 이하로 써주세요` };
    return { ok: true, value: trimmed };
};

export const checkPriority = (value) =>
    PRIORITIES.includes(value) ? { ok: true, value } : { ok: false, reason: "우선순위를 골라주세요" };

export const checkMinutes = (value, { min = 1, label = "예상 시간" } = {}) => {
    if (value === null || value === undefined || value === "") {
        return { ok: false, reason: `${label}이(가) 비었습니다` };
    }
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(number)) return { ok: false, reason: "숫자가 아닙니다" };
    if (!Number.isInteger(number)) return { ok: false, reason: "정수만 넣을 수 있습니다" };
    if (number < min) return { ok: false, reason: `${min} 이상이어야 합니다` };
    if (number > MAX_MINUTES) return { ok: false, reason: `${MAX_MINUTES} 이하여야 합니다` };
    return { ok: true, value: number };
};

/** 태그 입력(쉼표 구분 문자열)을 정리된 배열로. 빈 항목은 버리고 개수·길이에 상한을 둡니다. */
export const checkTags = (value) => {
    const raw = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : [];
    const tags = [...new Set(raw.map((t) => String(t).trim()).filter(Boolean))];
    if (tags.length > MAX_TAGS) return { ok: false, reason: `태그는 ${MAX_TAGS}개까지만 담을 수 있습니다` };
    const tooLong = tags.find((t) => t.length > MAX_TAG_LEN);
    if (tooLong) return { ok: false, reason: `태그는 ${MAX_TAG_LEN}자 이하로 써주세요` };
    return { ok: true, value: tags };
};

/** 계획(개정본) 입력 폼 검사. */
export const checkPlanForm = (form) => {
    const errors = {};
    const title = checkText(form.title, { max: MAX_TITLE, label: "제목" });
    if (!title.ok) errors.title = title.reason;

    const periodStart = checkDate(form.periodStart, { label: "시작일" });
    if (!periodStart.ok) errors.periodStart = periodStart.reason;

    const periodEnd = checkDate(form.periodEnd, { label: "종료일" });
    if (!periodEnd.ok) errors.periodEnd = periodEnd.reason;

    if (periodStart.ok && periodEnd.ok && periodEnd.value < periodStart.value) {
        errors.periodEnd = "종료일이 시작일보다 앞설 수 없습니다";
    }

    const priority = checkPriority(form.priority);
    if (!priority.ok) errors.priority = priority.reason;

    const successCriteria = checkText(form.successCriteria, { max: MAX_TEXT, label: "성공 기준" });
    if (!successCriteria.ok) errors.successCriteria = successCriteria.reason;

    const estimatedMinutes = checkMinutes(form.estimatedMinutes, { label: "예상 시간" });
    if (!estimatedMinutes.ok) errors.estimatedMinutes = estimatedMinutes.reason;

    const note = checkText(form.note, { required: false, max: MAX_TEXT, label: "메모" });
    if (!note.ok) errors.note = note.reason;

    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return {
        ok: true,
        value: {
            title: title.value,
            periodStart: periodStart.value,
            periodEnd: periodEnd.value,
            priority: priority.value,
            successCriteria: successCriteria.value,
            estimatedMinutes: estimatedMinutes.value,
            note: note.value,
        },
    };
};

/** 할 일 입력 폼 검사. */
export const checkTaskForm = (form) => {
    const errors = {};
    const title = checkText(form.title, { max: MAX_TITLE, label: "제목" });
    if (!title.ok) errors.title = title.reason;

    const detail = checkText(form.detail, { required: false, max: MAX_TEXT, label: "설명" });
    if (!detail.ok) errors.detail = detail.reason;

    const dueDate = checkDate(form.dueDate, { required: false, label: "마감일" });
    if (!dueDate.ok) errors.dueDate = dueDate.reason;

    const priority = checkPriority(form.priority);
    if (!priority.ok) errors.priority = priority.reason;

    const tags = checkTags(form.tags);
    if (!tags.ok) errors.tags = tags.reason;

    const estimatedMinutes = checkMinutes(form.estimatedMinutes, { label: "예상 시간" });
    if (!estimatedMinutes.ok) errors.estimatedMinutes = estimatedMinutes.reason;

    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return {
        ok: true,
        value: {
            title: title.value,
            detail: detail.value || null,
            dueDate: dueDate.value,
            priority: priority.value,
            tags: tags.value,
            estimatedMinutes: estimatedMinutes.value,
        },
    };
};

/** 실행 기록 입력 폼 검사. 시각은 datetime-local 문자열("YYYY-MM-DDTHH:mm")입니다. */
export const checkExecutionForm = (form) => {
    const errors = {};
    const timePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

    if (typeof form.startedAt !== "string" || !timePattern.test(form.startedAt)) {
        errors.startedAt = "시작 시각이 비었거나 형식이 아닙니다";
    }
    if (form.endedAt && !timePattern.test(form.endedAt)) {
        errors.endedAt = "끝난 시각 형식이 아닙니다";
    }
    if (!errors.startedAt && !errors.endedAt && form.endedAt && form.endedAt < form.startedAt) {
        errors.endedAt = "끝난 시각이 시작 시각보다 앞설 수 없습니다";
    }

    const actualMinutes = checkMinutes(form.actualMinutes, { min: 0, label: "실제 걸린 시간" });
    if (!actualMinutes.ok) errors.actualMinutes = actualMinutes.reason;

    const blockedReason = checkText(form.blockedReason, { required: false, max: MAX_TEXT, label: "막힌 이유" });
    if (!blockedReason.ok) errors.blockedReason = blockedReason.reason;

    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return {
        ok: true,
        value: {
            startedAt: form.startedAt,
            endedAt: form.endedAt || null,
            actualMinutes: actualMinutes.value,
            blockedReason: blockedReason.value || null,
        },
    };
};
