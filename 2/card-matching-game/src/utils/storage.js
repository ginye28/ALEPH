const STORAGE_KEY = "card-matching-game:v1";

export const DEFAULT_SETTINGS = {
    bestRecords: {},
    bestScores: {},
    reducedMotion: false,
    muted: false,
};

const isValidRecord = (value) =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

const readNumberMap = (source) => {
    const result = {};
    if (source && typeof source === "object" && !Array.isArray(source)) {
        Object.entries(source).forEach(([ key, value ]) => {
            if (isValidRecord(value)) {
                result[key] = value;
            }
        });
    }
    return result;
}

const createDefaults = () => ({
    ...DEFAULT_SETTINGS,
    bestRecords: {},
    bestScores: {},
});

export const loadSettings = () => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return createDefaults();
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return createDefaults();
        }

        return {
            bestRecords: readNumberMap(parsed.bestRecords),
            bestScores: readNumberMap(parsed.bestScores),
            reducedMotion: parsed.reducedMotion === true,
            muted: parsed.muted === true,
        };
    } catch {
        return createDefaults();
    }
}

export const saveSettings = (settings) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // 저장 공간이 없거나 차단돼도 현재 판 진행은 그대로 이어집니다.
    }
}
