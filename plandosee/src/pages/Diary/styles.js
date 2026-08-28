import { css } from "@emotion/react";

export const page = css`
    max-width: 980px;
    margin: 0 auto;
    padding: 34px 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    @media (max-width: 560px) {
        padding: 20px 14px 56px;
    }
`;

export const header = css`
    margin-bottom: 2px;
`;

export const title = css`
    margin: 0 0 7px;
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 900;
    letter-spacing: -0.01em;
    color: var(--ink);
`;

export const subtitle = css`
    margin: 0;
    color: var(--ink-soft);
    font-size: 14px;
    line-height: 1.75;
`;

/** 공개 화면의 자료가 전부 합성이라는 사실을 맨 위에 못박습니다 (설계 원칙 1). */
export const syntheticNote = css`
    padding: 12px 16px;
    border: 1px solid var(--accent);
    border-radius: 10px;
    background: var(--accent-bg);
    color: var(--ink);
    font-size: 13.5px;
    line-height: 1.75;
`;

export const footer = css`
    margin-top: 8px;
`;
