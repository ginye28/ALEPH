import { isLocalStamp } from "../utils/timezone";

const STORAGE_KEY = "today-dashboard.history.v1";
const SCHEMA_VERSION = 1;

/** 저장 식별값. 이 값이 같으면 같은 기록으로 봅니다. */
const identityOf = (record) => `${record.providerKey}:${record.dateKey}`;

const isValidRecord = (raw) =>
    raw &&
    typeof raw === "object" &&
    typeof raw.providerKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw.dateKey ?? "") &&
    typeof raw.value === "number" &&
    Number.isFinite(raw.value) &&
    typeof raw.unit === "string" &&
    isLocalStamp(raw.observedAt) &&
    typeof raw.fetchedAt === "string" &&
    (raw.origin === "live" || raw.origin === "backfill");

// 최신 날짜가 앞에 오도록 정렬합니다. computeDiff가 이 순서를 전제로 동작합니다.
const sortDesc = (items) => [...items].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));

/** 앱 시작 시, 그리고 모든 저장 뒤에 이 함수로 다시 읽어 화면을 그립니다. */
export const loadHistory = () => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.items)) {
            return [];
        }

        return sortDesc(parsed.items.filter(isValidRecord));
    } catch {
        // 저장값이 깨져도 앱은 빈 목록으로 계속 동작합니다.
        return [];
    }
};

const writeAll = (items) => {
    const sorted = sortDesc(items);

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: SCHEMA_VERSION, items: sorted }),
        );
        return { ok: true, items: loadHistory() };
    } catch {
        return {
            ok: false,
            reason: "기록을 저장하지 못했습니다. 브라우저 저장 공간이 가득 찼을 수 있습니다.",
            items: loadHistory(),
        };
    }
};

/**
 * 하루 한 건만 저장합니다 (카드 4).
 * 저장 전에 반드시 기존 목록을 먼저 읽습니다. 이 순서를 건너뛰면 같은 날 중복이 생깁니다.
 */
export const saveOnce = (record) => {
    const items = loadHistory();

    if (items.some((item) => identityOf(item) === identityOf(record))) {
        return { ok: false, reason: "duplicate", items };
    }

    return { ...writeAll([...items, record]), added: 1 };
};

/** 지난 날짜 여러 건을 한 번에 채웁니다. 이미 있는 날짜는 건너뜁니다. */
export const saveManyOnce = (records) => {
    const items = loadHistory();
    const seen = new Set(items.map(identityOf));
    const added = [];

    records.forEach((record) => {
        const id = identityOf(record);
        if (seen.has(id)) {
            return;
        }
        seen.add(id);
        added.push(record);
    });

    if (added.length === 0) {
        return { ok: true, added: 0, items };
    }

    return { ...writeAll([...items, ...added]), added: added.length };
};

/** 점검 도구 전용 — 중복 방지 동작을 처음부터 다시 확인할 때 씁니다. */
export const clearHistory = () => {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // 지우지 못해도 화면은 저장소를 다시 읽어 그립니다.
    }
    return loadHistory();
};

/** snapshot의 한 날짜 항목을 저장 가능한 기록으로 바꿉니다. */
export const toRecord = (snapshot, entry, origin) => ({
    providerKey: snapshot.providerKey,
    itemLabel: snapshot.itemLabel,
    dateKey: entry.dateKey,
    value: entry.value,
    unit: snapshot.unit,
    observedAt: entry.observedAt,
    fetchedAt: snapshot.fetchedAt,
    origin,
    sourceUrl: snapshot.sourceUrl,
});
