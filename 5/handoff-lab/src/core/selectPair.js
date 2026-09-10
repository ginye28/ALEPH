/**
 * 비교할 두 기록을 고릅니다 (과제 5 · 개선 기능).
 *
 * computeDiff()는 "배열의 앞 2건을 비교"하는 함수입니다. 그 함수를 고치지 않고
 * 앞에 이 선택 단계를 끼웁니다. 계산식이 한 곳에만 남아 있어야
 * 선택 기능 때문에 과제 4의 통과 기준이 깨지는 일이 없습니다.
 *
 * baseKey는 사용자가 고른 "비교 기준" 날짜입니다. 비교 대상은 항상 최신 기록입니다.
 */
export const selectPair = (records, baseKey) => {
    if (!Array.isArray(records) || records.length < 2) {
        return { pair: records ?? [], selected: null, reason: null };
    }

    const [latest] = records;

    // 아무것도 고르지 않았으면 과제 4와 똑같이 최신 2건을 비교합니다.
    if (!baseKey) {
        return { pair: [latest, records[1]], selected: null, reason: null };
    }

    // 자기 자신과의 비교는 차이 0으로 꾸미지 않고 이유를 돌려줍니다.
    if (baseKey === latest.dateKey) {
        return { pair: [], selected: baseKey, reason: "sameDate" };
    }

    const base = records.find((record) => record.dateKey === baseKey);

    // 고른 날짜가 기록에서 사라진 경우. 기본 비교로 되돌리고 사라졌다는 사실을 알립니다.
    if (!base) {
        return { pair: [latest, records[1]], selected: null, reason: "vanished" };
    }

    return { pair: [latest, base], selected: baseKey, reason: null };
};
