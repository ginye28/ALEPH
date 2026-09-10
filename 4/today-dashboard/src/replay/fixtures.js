/**
 * 공개 fixture 9종을 앱에 묶어 둡니다.
 *
 * 파일은 `t04-real-information-board-public-v1/fixtures/`에서 그대로 복사한 것이고
 * SHA-256이 `asset-manifest.json`과 일치합니다 (`tools/verify-t04.mjs`가 매번 확인).
 * 네트워크로 받아오지 않는 이유 — 채점자가 여는 순간 외부 사정으로 재생이 실패하면
 * 결정론 재생이 아니게 됩니다.
 */
import auth401 from "./fixtures/auth-401.json";
import normalD1A from "./fixtures/normal-d1-a.json";
import normalD1B from "./fixtures/normal-d1-b.json";
import normalD2 from "./fixtures/normal-d2.json";
import offline from "./fixtures/offline.json";
import rate429 from "./fixtures/rate-429.json";
import recoverD2 from "./fixtures/recover-d2.json";
import schemaBreak from "./fixtures/schema-break.json";
import timeout from "./fixtures/timeout.json";

export const FIXTURES = {
    "T04-NORMAL-D1-A": normalD1A,
    "T04-NORMAL-D1-B": normalD1B,
    "T04-NORMAL-D2": normalD2,
    "T04-TIMEOUT": timeout,
    "T04-AUTH-401": auth401,
    "T04-RATE-429": rate429,
    "T04-OFFLINE": offline,
    "T04-SCHEMA-BREAK": schemaBreak,
    "T04-RECOVER-D2": recoverD2,
};

/** README의 재생 순서. 채점자가 눌러야 할 차례를 화면이 직접 안내합니다. */
export const SEQUENCES = [
    {
        id: "success",
        label: "정상 · 일별 저장",
        hint: "같은 날 두 번은 한 행, 다음 날은 새 행",
        steps: ["T04-NORMAL-D1-A", "T04-NORMAL-D1-B", "T04-NORMAL-D2"],
        covers: "C20 · C21",
    },
    {
        id: "recover",
        label: "오류 뒤 회복",
        hint: "stale/timeout → 다시 시도 → fresh/none, 새 행 1건",
        steps: ["T04-NORMAL-D1-A", "T04-NORMAL-D1-B", "T04-TIMEOUT", "T04-RECOVER-D2"],
        covers: "C19",
    },
];

/** 실패 5종. 각각 정상 2회를 먼저 재생한 뒤 하나만 얹습니다. */
export const FAILURE_FIXTURES = [
    { id: "T04-TIMEOUT", label: "느린 응답", covers: "C12" },
    { id: "T04-AUTH-401", label: "401 거절", covers: "C13" },
    { id: "T04-RATE-429", label: "호출 제한", covers: "C14" },
    { id: "T04-OFFLINE", label: "오프라인", covers: "C15" },
    { id: "T04-SCHEMA-BREAK", label: "형식 변경", covers: "C16" },
];

export const BASELINE = ["T04-NORMAL-D1-A", "T04-NORMAL-D1-B"];

/** 화면에 사람이 읽을 수 있는 실패 설명. 종류마다 문구와 다음 행동이 달라야 합니다 (C12~C16). */
export const ERROR_TEXT = {
    none: { label: "정상", detail: "방금 받은 값입니다.", action: null },
    timeout: {
        label: "응답 지연",
        detail: "정해진 시간 안에 응답이 오지 않았습니다.",
        action: "잠시 뒤 다시 시도하세요.",
    },
    auth: {
        label: "출처 접근 거절",
        detail: "외부 원천이 401/403으로 거절했습니다.",
        action: "출처의 공개 정책을 확인하세요. 이 화면의 로그인 문제가 아닙니다.",
    },
    rate_limit: {
        label: "호출 제한",
        detail: "짧은 시간에 요청이 너무 많았습니다.",
        action: "retry-after 만큼 기다린 뒤 다시 시도하세요.",
    },
    offline: {
        label: "오프라인",
        detail: "네트워크에 연결돼 있지 않습니다.",
        action: "연결을 확인한 뒤 다시 시도하세요.",
    },
    schema_error: {
        label: "응답 형식 변경",
        detail: "응답은 성공했지만 기대한 형식이 아닙니다.",
        action: "출처의 응답 규격 변경 여부를 확인하세요.",
    },
};
