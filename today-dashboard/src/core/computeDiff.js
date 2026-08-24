import { roundTo } from "../utils/format";

/**
 * 날짜 내림차순으로 정렬된 기록에서 최신 두 건의 변화를 계산합니다 (카드 5).
 * 비교할 수 없는 상황에서는 값을 지어내지 않고 이유를 돌려줍니다.
 */
export const computeDiff = (records, digits = 1) => {
    if (!Array.isArray(records) || records.length < 2) {
        return { ok: false, reason: "기록이 2건 이상이어야 비교할 수 있습니다." };
    }

    const [latest, previous] = records;

    if (latest.unit !== previous.unit) {
        return {
            ok: false,
            reason: `단위가 서로 달라 비교하지 않습니다 (${previous.unit} / ${latest.unit}).`,
        };
    }

    const rawDelta = latest.value - previous.value;

    // 방향은 반올림한 값에서 뽑습니다.
    // 원본으로 방향을 정하면 "0.0인데 증가"처럼 화살표와 숫자가 어긋납니다.
    const delta = roundTo(rawDelta, digits);
    const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

    return {
        ok: true,
        rawDelta,
        delta,
        direction,
        directionLabel: { up: "증가", down: "감소", flat: "변화 없음" }[direction],
        unit: latest.unit,
        latest,
        previous,
    };
};
