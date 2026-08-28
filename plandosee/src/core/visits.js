const KEY = "plandosee.visits.v1";

/**
 * 이 브라우저에서 이 화면을 연 횟수.
 *
 * 서버가 없어서 진짜 방문자 수(다른 사람 포함)는 알 수 없습니다.
 * 없는 걸 있는 척 만들지 않고, 이 기기·이 브라우저 기준의 정직한 숫자만 셉니다.
 * 기록(`plandosee.records.v2`)과는 다른 키라 "전체 삭제"에는 영향받지 않습니다 —
 * 방문 횟수는 그 날 적은 기록이 아니라 이 화면을 연 이력이라서입니다.
 */
export const bumpVisitCount = () => {
    try {
        const next = Number(window.localStorage.getItem(KEY) ?? "0") + 1;
        window.localStorage.setItem(KEY, String(next));
        return next;
    } catch {
        return null;
    }
};
