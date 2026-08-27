/**
 * 저장소. 읽는 곳과 쓰는 곳이 여기 하나뿐입니다 (카드 2).
 *
 * 저장 위치가 갈라지면 "새로고침하면 사라진다"와 "전체 삭제 뒤 일부가 남는다"가
 * 동시에 생깁니다. 화면은 저장한 뒤 항상 이 파일로 다시 읽어 그립니다.
 */
import { SCHEMA_VERSION, migrate } from "../core/migrate";
import { newId } from "../core/ids";
import { TIMEZONE, UNIT } from "../core/validate";

const STORAGE_KEY = "plandosee.records.v2";

/**
 * 저장소를 읽고 필요하면 v2로 올립니다.
 * 변환이 일어났는지 함께 돌려줍니다 — 화면의 `자료 형식` 줄이 이 값을 씁니다.
 */
export const loadRecords = () => {
    let raw;
    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return { records: [], converted: 0, broken: false };
    }

    if (!raw) return { records: [], converted: 0, broken: false };

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        // 저장값이 깨져도 앱은 빈 목록으로 계속 동작합니다. 덮어쓰지는 않습니다.
        return { records: [], converted: 0, broken: true };
    }

    const list = Array.isArray(parsed) ? parsed : parsed?.records;
    if (!Array.isArray(list)) return { records: [], converted: 0, broken: true };

    const { records, converted } = migrate(list);
    return { records, converted, broken: false };
};

const write = (records) => {
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ schemaVersion: SCHEMA_VERSION, records }),
        );
        return { ok: true };
    } catch {
        return { ok: false, reason: "저장 공간이 가득 찼습니다" };
    }
};

/** 화면이 쓰는 저장 함수. 항상 쓰고 나서 다시 읽어 돌려줍니다. */
export const saveAll = (records) => {
    const result = write(records);
    const loaded = loadRecords();
    return { ...result, records: loaded.records };
};

/** 새 기록 한 건. id는 여기서만 발급합니다. */
export const makeRecord = (value) => ({
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    date: value.date,
    timezone: TIMEZONE,
    subject: value.subject,
    minutes: value.minutes,
    unit: UNIT,
    memo: value.memo ?? "",
    tag: value.tag ?? "",
    createdAt: new Date().toISOString(),
});

export const addRecord = (records, value) => saveAll([...records, makeRecord(value)]);

/**
 * 한 건 수정. id로만 찾습니다 (설계 원칙 2).
 * createdAt과 id는 그대로 둡니다 — 수정은 새 기록이 아닙니다.
 */
export const updateRecord = (records, id, value) =>
    saveAll(
        records.map((record) =>
            record.id === id
                ? {
                      ...record,
                      date: value.date,
                      subject: value.subject,
                      minutes: value.minutes,
                      memo: value.memo ?? "",
                      tag: value.tag ?? "",
                  }
                : record,
        ),
    );

export const removeRecord = (records, id) =>
    saveAll(records.filter((record) => record.id !== id));

/** 전체 삭제. 지운 뒤 저장소에서 다시 읽어 화면 캐시가 남지 않게 합니다. */
export const clearAll = () => {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // 지우지 못해도 아래에서 다시 읽어 화면을 맞춥니다.
    }
    return loadRecords().records;
};

export const exportBox = (records) =>
    JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), records }, null, 2);

/**
 * 가져오기. 순서가 핵심입니다 — 읽기 → 검사 → 통과한 경우에만 쓰기.
 * 지우고 나서 읽으면 손상 파일 하나가 기존 기록을 통째로 날립니다.
 */
export const importText = (records, text) => {
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        const at = String(error?.message ?? "").match(/position (\d+)/);
        return {
            ok: false,
            reason: at ? `파일을 JSON으로 읽지 못했습니다 (위치 ${at[1]})` : "파일을 JSON으로 읽지 못했습니다",
            records,
        };
    }

    const list = Array.isArray(parsed) ? parsed : parsed?.records;
    if (!Array.isArray(list)) {
        return { ok: false, reason: "records 배열이 없습니다", records };
    }

    const { records: lifted, converted } = migrate(list);

    // 같은 id는 건너뜁니다. 복원을 두 번 눌러도 기록이 늘지 않습니다.
    const existing = new Set(records.map((record) => record.id));
    const added = [];
    let skipped = 0;

    lifted.forEach((record) => {
        if (typeof record?.id !== "string" || record.id === "") {
            skipped += 1;
            return;
        }
        if (existing.has(record.id)) {
            skipped += 1;
            return;
        }
        existing.add(record.id);
        added.push(record);
    });

    const saved = saveAll([...records, ...added]);
    return {
        ok: true,
        added: added.length,
        skipped,
        converted,
        records: saved.records,
    };
};

/** 시험용 합성 자료를 넣습니다. 기존 기록 위에 덧붙이지 않고 갈아끼웁니다. */
export const replaceAll = (records) => {
    const { records: lifted } = migrate(records);
    return saveAll(lifted).records;
};
