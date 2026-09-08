/**
 * 날짜별 실제 시간 집계 (7.md 카드 5).
 *
 * 1일차에 고정한 규칙을 그대로 코드로 옮긴 것입니다 — 지표는 "그날 실행기록의 실제 걸린
 * 시간 합계", 단위는 분, 날짜는 Asia/Seoul 기준으로 묶습니다(T07-C05·C06·C08).
 *
 * 기록이 없는 날은 0분으로 채우지 않고 아예 세지 않습니다(T07-C23). "쉰 날"과
 * "적지 못한 날"을 구분할 수 없게 되기 때문입니다. 그래서 "며칠"은 항상
 * **기록이 있는 서로 다른 날짜의 수**이고, 평균도 그 날짜 수로 나눕니다.
 *
 * 같은 날짜에 실행기록이 여러 건이면 중복이 아니라 그날의 여러 작업으로 보고
 * 모두 더합니다(T07-C24). 유난히 튀는 값도 버리지 않습니다(T07-C25) — 대신
 * 화면이 평균만 보여 주지 않고 날짜별 값을 늘 함께 싣습니다.
 *
 * 합계에는 반올림이 없습니다(T07-C26). 실제 걸린 시간을 분 단위 정수로 받아
 * 그대로 더하기 때문입니다. 나누는 연산은 평균 하나뿐이고, 평균만 소수 첫째
 * 자리까지 남기고 그 아래를 반올림합니다.
 */

const KST_DATE = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

/** 저장된 ISO 시각을 Asia/Seoul 기준 `YYYY-MM-DD`로. */
export const kstDateKey = (iso) => {
    if (!iso) return null;
    const at = new Date(iso);
    return Number.isNaN(at.getTime()) ? null : KST_DATE.format(at);
};

/**
 * 실행기록을 날짜별로 묶어 합계와 평균을 냅니다.
 * `days`는 날짜 오름차순이고, 화면은 이 순서를 그대로 그립니다.
 */
export const dailyTotals = (records) => {
    const 날짜별 = new Map();

    for (const record of records ?? []) {
        const date = kstDateKey(record?.startedAt);
        if (!date) continue;
        const 이전 = 날짜별.get(date) ?? { date, count: 0, minutes: 0 };
        날짜별.set(date, {
            date,
            count: 이전.count + 1,
            minutes: 이전.minutes + Number(record.actualMinutes ?? 0),
        });
    }

    const days = [...날짜별.values()].sort((a, b) => a.date.localeCompare(b.date));
    const total = days.reduce((sum, day) => sum + day.minutes, 0);
    const recordCount = days.reduce((sum, day) => sum + day.count, 0);
    // 평균만 소수 첫째 자리까지 (T07-C26). 기록이 있는 날이 없으면 나누지 않습니다.
    const average = days.length === 0 ? 0 : Math.round((total / days.length) * 10) / 10;

    return { days, total, average, dayCount: days.length, recordCount };
};
