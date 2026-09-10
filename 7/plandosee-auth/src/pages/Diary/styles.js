import { css } from "@emotion/react";

export const page = css`
    max-width: 1120px;
    margin: 0 auto;
    padding: 40px 24px 90px;

    @media (max-width: 640px) {
        padding: 24px 14px 60px;
    }
`;

/** 신문 제호처럼 굵은 가로줄로 머리와 본문을 끊습니다. */
export const masthead = css`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 2px solid var(--ink);
`;

export const title = css`
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--ink);

    @media (max-width: 640px) {
        font-size: 27px;
    }
`;

export const subtitle = css`
    margin: 0;
    color: var(--ink-soft);
    font-size: 14px;
    line-height: 1.7;
`;

export const stampRow = css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;

    @media (max-width: 640px) {
        justify-content: flex-start;
    }
`;

export const stamp = css`
    padding: 5px 12px;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface);
    color: var(--ink-soft);
    font-family: var(--font-mono);
    font-size: 12.5px;
    white-space: nowrap;
`;

/** 계획 → 할일 → 실행기록 → 돌아보기 → 내보내기 → 계정 순으로 세로로 쌓습니다. 라우터 없이 한 화면. */
export const sections = css`
    display: flex;
    flex-direction: column;
    gap: 22px;
`;

export const footer = css`
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
`;
