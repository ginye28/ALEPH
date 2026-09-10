const LOG_KEY = "card-matching-game:log:v1";
const MAX_ENTRIES = 40;

const isFiniteNumber = (value) =>
    typeof value === "number" && Number.isFinite(value);

const sanitize = (entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
    }
    if (typeof entry.difficulty !== "string" || !entry.difficulty) {
        return null;
    }
    if (entry.result !== "success" && entry.result !== "fail") {
        return null;
    }
    if (!isFiniteNumber(entry.elapsedMs) || !isFiniteNumber(entry.timeLimitMs)) {
        return null;
    }
    return {
        playedAt: typeof entry.playedAt === "string" ? entry.playedAt : "",
        difficulty: entry.difficulty,
        result: entry.result,
        elapsedMs: entry.elapsedMs,
        timeLimitMs: entry.timeLimitMs,
        matchedPairs: isFiniteNumber(entry.matchedPairs) ? entry.matchedPairs : 0,
        totalPairs: isFiniteNumber(entry.totalPairs) ? entry.totalPairs : 0,
        attempts: isFiniteNumber(entry.attempts) ? entry.attempts : 0,
        score: isFiniteNumber(entry.score) ? entry.score : 0,
    };
}

export const loadPlayLog = () => {
    try {
        const raw = window.localStorage.getItem(LOG_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.map(sanitize).filter(Boolean).slice(-MAX_ENTRIES);
    } catch {
        return [];
    }
}

export const appendPlayLog = (entry) => {
    const clean = sanitize(entry);
    if (!clean) {
        return loadPlayLog();
    }
    const next = [ ...loadPlayLog(), clean ].slice(-MAX_ENTRIES);
    try {
        window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
    } catch {
        // 저장 공간이 없어도 현재 판 진행은 그대로 이어집니다.
    }
    return next;
}

export const clearPlayLog = () => {
    try {
        window.localStorage.removeItem(LOG_KEY);
    } catch {
        // 삭제에 실패해도 화면은 빈 목록으로 이어집니다.
    }
    return [];
}

const toSeconds = (ms) => (Math.max(0, ms) / 1000).toFixed(2);

export const toCsv = (log) => {
    const header = "회차,난이도,결과,소요시간(초),맞춘쌍,전체쌍,시도횟수,점수,제한시간(초),기록시각";
    const lines = log.map((entry, index) => [
        index + 1,
        entry.difficulty,
        entry.result === "success" ? "성공" : "실패",
        toSeconds(entry.elapsedMs),
        entry.matchedPairs,
        entry.totalPairs,
        entry.attempts,
        entry.score,
        toSeconds(entry.timeLimitMs),
        entry.playedAt,
    ].join(","));
    return [ header, ...lines ].join("\n");
}
