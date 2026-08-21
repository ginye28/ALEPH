import { SCHEMA_VERSION } from "../constants/defaults";
import { APP_ID, sanitizeTemplate } from "./schema";

const STORAGE_KEY = "zzal-studio.templates.v1";

export const createId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `t-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const readRaw = () => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
            return [];
        }
        return parsed.items;
    } catch {
        // 저장값이 깨져도 앱은 빈 목록으로 계속 동작합니다.
        return [];
    }
};

/** 앱 시작 시, 그리고 모든 CRUD 뒤에 이 함수로 다시 읽어 화면을 그립니다. */
export const loadTemplates = () => {
    const items = [];

    readRaw().forEach((raw) => {
        const result = sanitizeTemplate(raw);
        if (result.ok) {
            items.push({ ...result.value, id: result.value.id ?? createId() });
        }
    });

    return items;
};

const writeAll = (items) => {
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ app: APP_ID, version: SCHEMA_VERSION, items }),
        );
        return { ok: true, items: loadTemplates() };
    } catch {
        return {
            ok: false,
            reason: "템플릿을 저장하지 못했습니다. 저장 공간이 가득 찼을 수 있습니다.",
            items: loadTemplates(),
        };
    }
};

export const createTemplate = (composition) => {
    const result = sanitizeTemplate({ ...composition, id: null });
    if (!result.ok) {
        return { ok: false, reason: result.reason, items: loadTemplates() };
    }

    const template = { ...result.value, id: createId() };
    const saved = writeAll([...loadTemplates(), template]);

    return saved.ok ? { ...saved, template } : saved;
};

export const updateTemplate = (id, composition) => {
    const current = loadTemplates();

    // 대상이 없는데 조용히 추가하면 "수정했더니 항목이 늘어나는" 결함이 됩니다.
    if (!current.some((item) => item.id === id)) {
        return { ok: false, reason: "수정할 템플릿을 찾지 못했습니다.", items: current };
    }

    const result = sanitizeTemplate({ ...composition, id });
    if (!result.ok) {
        return { ok: false, reason: result.reason, items: current };
    }

    const template = { ...result.value, id };
    const saved = writeAll(current.map((item) => (item.id === id ? template : item)));

    return saved.ok ? { ...saved, template } : saved;
};

export const removeTemplate = (id) => {
    const current = loadTemplates();

    if (!current.some((item) => item.id === id)) {
        return { ok: false, reason: "삭제할 템플릿을 찾지 못했습니다.", items: current };
    }

    return writeAll(current.filter((item) => item.id !== id));
};

/** 가져오기 전용 — 검증을 모두 통과한 목록만 통째로 교체합니다. */
export const replaceTemplates = (items) =>
    writeAll(items.map((item) => ({ ...item, id: item.id ?? createId() })));
