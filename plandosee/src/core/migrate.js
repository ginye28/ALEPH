/**
 * v1 → v2 자동 변환 (설계 원칙 4).
 *
 * 몇 번을 돌려도 결과가 같아야 합니다. `schemaVersion`을 보고 이미 변환된 기록은
 * 건너뜁니다. 두 번째 변환에서 기록이 늘거나 기본값이 사용자 입력을 덮어쓰면
 * 카드 3이 요구하는 "기존 값 보존"이 깨집니다.
 */

export const SCHEMA_VERSION = 2;

/** v2에서 새로 생긴 필드와 기본값. 여기만 고치면 다음 버전도 같은 방식으로 붙습니다. */
const V2_DEFAULTS = { tag: "" };

/** 기록 하나의 형식 버전을 판정합니다. 기록에 버전이 없으면 v1으로 봅니다. */
export const versionOf = (record) => {
    if (!record || typeof record !== "object") return null;
    const version = record.schemaVersion;
    return Number.isInteger(version) ? version : 1;
};

/**
 * 기록 하나를 v2로 올립니다.
 * 이미 v2면 그대로 돌려주고, v1이어도 값이 있는 필드는 덮어쓰지 않습니다.
 */
const liftRecord = (record) => {
    if (versionOf(record) >= SCHEMA_VERSION) return { record, changed: false };

    const lifted = { ...record, schemaVersion: SCHEMA_VERSION };
    for (const [key, fallback] of Object.entries(V2_DEFAULTS)) {
        // 값이 이미 있으면 손대지 않습니다 — v1 기록이 우연히 tag를 갖고 있을 수 있습니다.
        if (lifted[key] === undefined || lifted[key] === null) lifted[key] = fallback;
    }
    return { record: lifted, changed: true };
};

/**
 * 목록 전체를 변환합니다.
 * 몇 건이 실제로 바뀌었는지 함께 돌려줍니다 — 화면의 `변환 상태` 줄이 이 숫자를 씁니다.
 */
export const migrate = (records) => {
    if (!Array.isArray(records)) {
        return { records: [], converted: 0, alreadyCurrent: 0 };
    }

    let converted = 0;
    let alreadyCurrent = 0;

    const next = records.map((record) => {
        const { record: lifted, changed } = liftRecord(record);
        if (changed) converted += 1;
        else alreadyCurrent += 1;
        return lifted;
    });

    return { records: next, converted, alreadyCurrent };
};
