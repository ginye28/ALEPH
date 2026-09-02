import { css } from "@emotion/react";

export const divider = css`
    border: none;
    border-top: 1px solid var(--line-soft);
    margin: 4px 0 0;
`;

/** 로그아웃(평범한 동작)과 계정 삭제(파괴적 동작) 사이를 눈에 띄게 갈라, 두 버튼을 헷갈리지 않게 합니다. */
export const dangerZone = css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid var(--bad);
    border-radius: 6px;
    background: var(--bad-bg);
`;

export const dangerLabel = css`
    margin: 0;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--bad);
`;
