import { css } from "@emotion/react";

export const page = css`
    max-width: 980px;
    margin: 0 auto;
    padding: 26px 18px 70px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    @media (max-width: 560px) {
        padding: 18px 12px 50px;
    }
`;

export const header = css`
    margin-bottom: 2px;
`;

export const title = css`
    margin: 0 0 5px;
    font-family: var(--font-display);
    font-size: 27px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--ink);
`;

export const subtitle = css`
    margin: 0;
    color: var(--ink-soft);
    font-size: 13px;
    line-height: 1.7;
`;

/** 공개 화면의 자료가 전부 합성이라는 사실을 맨 위에 못박습니다 (설계 원칙 1). */
export const syntheticNote = css`
    padding: 10px 14px;
    border: 1px solid var(--accent);
    border-radius: 9px;
    background: var(--accent-bg);
    color: var(--ink);
    font-size: 12.5px;
    line-height: 1.7;
`;

export const footer = css`
    margin-top: 8px;
`;
