/**
 * 고유 ID 발급 (설계 원칙 2).
 *
 * 행을 배열 순번으로 가리키면 정렬이나 필터를 바꾼 순간
 * 수정·삭제가 다른 행에 반영됩니다. 모든 지목은 이 id로만 합니다.
 */
export const newId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // randomUUID가 없는 환경(구형 브라우저·비보안 컨텍스트)을 위한 대체.
    // 충돌 가능성이 있으므로 저장할 때 중복 검사를 따로 합니다.
    return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** 저장 전에 이미 있는 id인지 봅니다. 가져오기에서 같은 기록이 두 번 들어오는 것을 막습니다. */
export const hasId = (records, id) => records.some((record) => record.id === id);
