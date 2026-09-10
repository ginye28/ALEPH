/**
 * 합성 평가 상태 (T04 공개 fixture 계약).
 *
 * `t04-real-information-board-public-v1/adapter-reset.example.js`의 상태 전이를
 * 그대로 옮긴 것입니다. 참조 구현은 CommonJS라 그대로 못 쓰고, 규칙만 옮깁니다.
 *
 * 왜 실제 기록과 따로 두는가 —
 * 계약의 `reset_semantics`가 "합성 평가 상태만 빈 상태로 되돌린다"입니다.
 * 합성 재생이 실제 공개 원천 기록(C22~C24의 증거)을 지우면 안 됩니다.
 * 그래서 이 파일은 localStorage를 쓰지 않고 메모리에서만 상태를 굴립니다.
 */

/** 정규화 기록에 허용되는 키. 개수와 이름이 정확히 일치해야 합니다. */
export const NORMALIZED_KEYS = Object.freeze([
    "signal_id",
    "normalized_value",
    "unit",
    "source_name",
    "source_url",
    "source_time",
    "fetched_at",
    "record_timezone",
    "record_date",
]);

export const ERROR_CODES = Object.freeze([
    "timeout",
    "auth",
    "rate_limit",
    "offline",
    "schema_error",
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

/** fetched_at을 Asia/Seoul 날짜 문자열로 바꿉니다. 기기 시간대에 의존하지 않습니다. */
export const kstDate = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        throw new TypeError("fetched_at must be a valid ISO-8601 date-time");
    }
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
};

/**
 * 정규화 기록 검사. 여기서 던지는 예외가 곧 schema_error입니다 —
 * T04-SCHEMA-BREAK는 HTTP 200이지만 normalized_value가 문자열이라 여기서 걸립니다.
 */
export const validateNormalizedReading = (reading) => {
    if (!reading || typeof reading !== "object" || Array.isArray(reading)) {
        throw new TypeError("normalized reading must be an object");
    }

    const actual = Object.keys(reading).sort();
    const expected = [...NORMALIZED_KEYS].sort();
    if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) {
        throw new TypeError(`normalized reading keys must be exactly: ${NORMALIZED_KEYS.join(", ")}`);
    }

    if (!/^[a-z0-9][a-z0-9._-]*$/.test(reading.signal_id) || reading.signal_id.length > 100) {
        throw new TypeError("signal_id is invalid");
    }
    if (typeof reading.normalized_value !== "number" || !Number.isFinite(reading.normalized_value)) {
        throw new TypeError("normalized_value must be a finite number");
    }
    for (const field of ["unit", "source_name"]) {
        if (typeof reading[field] !== "string" || reading[field].trim() === "") {
            throw new TypeError(`${field} must be a non-empty string`);
        }
    }

    let sourceUrl;
    try {
        sourceUrl = new URL(reading.source_url);
    } catch {
        throw new TypeError("source_url must be an absolute URL");
    }
    if (sourceUrl.protocol !== "https:") {
        throw new TypeError("source_url must use HTTPS");
    }

    if (reading.source_time !== null && Number.isNaN(new Date(reading.source_time).getTime())) {
        throw new TypeError("source_time must be a valid date-time or null");
    }
    if (Number.isNaN(new Date(reading.fetched_at).getTime())) {
        throw new TypeError("fetched_at must be a valid date-time");
    }
    if (reading.record_timezone !== "Asia/Seoul") {
        throw new TypeError("record_timezone must be Asia/Seoul");
    }
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(reading.record_date) ||
        reading.record_date !== kstDate(reading.fetched_at)
    ) {
        throw new TypeError("record_date must be the Asia/Seoul date derived from fetched_at");
    }

    return true;
};

/** freshness와 error_code는 서로를 구속합니다 (reading-status.schema.json의 oneOf). */
export const validateStatus = (status) => {
    if (!status || typeof status !== "object" || Array.isArray(status)) return false;
    if (status.freshness === "fresh") return status.error_code === "none";
    if (status.freshness === "stale") return ERROR_CODES.includes(status.error_code);
    return false;
};

export const resetEvaluationState = () => ({
    schema_version: "aleph-t04-evaluation-state-v1",
    daily_readings: [],
    current_reading: null,
    status: null,
    last_delta: null,
    last_comparison: { state: "insufficient", direction: null, magnitude: null, unit: null },
    last_run: null,
    sequence: 0,
});

const recordIdFor = (reading) => `demo-${reading.signal_id}-${reading.record_date}`;

const comparisonFor = (rows, current) => {
    const previous = rows
        .filter((row) => row.signal_id === current.signal_id && row.record_date < current.record_date)
        .sort((left, right) => right.record_date.localeCompare(left.record_date))[0];

    if (!previous) {
        return { state: "insufficient", direction: null, magnitude: null, unit: null };
    }
    if (previous.unit !== current.unit) {
        return { state: "unit_mismatch", direction: null, magnitude: null, unit: null };
    }

    const signed = current.normalized_value - previous.normalized_value;
    return {
        state: "comparable",
        direction: signed > 0 ? "increase" : signed < 0 ? "decrease" : "unchanged",
        magnitude: Math.abs(signed),
        unit: current.unit,
    };
};

/**
 * 성공한 조회 하나를 반영합니다.
 * 같은 signal_id + record_date는 새 행을 만들지 않고 원자적으로 갱신합니다 (C20).
 * 다음 날짜면 새 행이 생깁니다 (C21).
 */
export const applySuccessfulReading = (inputState, reading, runMeta = {}) => {
    validateNormalizedReading(reading);
    const state = clone(inputState);

    const index = state.daily_readings.findIndex(
        (row) => row.signal_id === reading.signal_id && row.record_date === reading.record_date,
    );
    const existing = index >= 0 ? state.daily_readings[index] : null;

    const row = {
        record_id: existing ? existing.record_id : recordIdFor(reading),
        signal_id: reading.signal_id,
        record_date: reading.record_date,
        normalized_value: reading.normalized_value,
        unit: reading.unit,
        first_fetched_at: existing ? existing.first_fetched_at : reading.fetched_at,
        last_fetched_at: reading.fetched_at,
        reading: clone(reading),
    };

    if (index >= 0) state.daily_readings[index] = row;
    else state.daily_readings.push(row);
    state.daily_readings.sort((a, b) => a.record_date.localeCompare(b.record_date));

    state.current_reading = clone(reading);
    state.status = { freshness: "fresh", error_code: "none" };
    state.last_comparison = comparisonFor(state.daily_readings, row);
    state.last_delta = state.last_comparison.magnitude;
    state.sequence += 1;
    state.last_run = {
        fixture_id: runMeta.fixture_id ?? null,
        virtual_now: runMeta.virtual_now ?? reading.fetched_at,
        outcome: "success",
        error_code: "none",
        retry_after_seconds: null,
    };
    return state;
};

/**
 * 실패를 반영합니다. status만 바꾸고 daily_readings와 current_reading은 건드리지 않습니다 —
 * 이 한 줄이 C17(마지막 정상값 보존)의 근거입니다.
 */
export const applyError = (inputState, errorCode, runMeta = {}) => {
    if (!ERROR_CODES.includes(errorCode)) {
        throw new TypeError(`unsupported error code: ${errorCode}`);
    }
    const state = clone(inputState);
    state.status = { freshness: "stale", error_code: errorCode };
    state.sequence += 1;
    state.last_run = {
        fixture_id: runMeta.fixture_id ?? null,
        virtual_now: runMeta.virtual_now ?? null,
        outcome: "error",
        error_code: errorCode,
        retry_after_seconds: runMeta.retry_after_seconds ?? null,
    };
    return state;
};

/** transport를 보고 성공/실패 갈래를 정합니다. 판정 규칙은 참조 어댑터와 같습니다. */
export const runFixture = (inputState, fixture) => {
    const meta = {
        fixture_id: fixture.fixture_id,
        virtual_now: fixture.virtual_now,
        retry_after_seconds: fixture.transport.headers["retry-after"]
            ? Number(fixture.transport.headers["retry-after"])
            : null,
    };

    if (fixture.transport.mode === "timeout") return applyError(inputState, "timeout", meta);
    if (fixture.transport.mode === "offline") return applyError(inputState, "offline", meta);
    if (fixture.transport.status === 401 || fixture.transport.status === 403) {
        return applyError(inputState, "auth", meta);
    }
    if (fixture.transport.status === 429) return applyError(inputState, "rate_limit", meta);

    if (fixture.transport.status >= 200 && fixture.transport.status < 300) {
        try {
            return applySuccessfulReading(inputState, fixture.payload, meta);
        } catch {
            return applyError(inputState, "schema_error", meta);
        }
    }
    return applyError(inputState, "schema_error", meta);
};
