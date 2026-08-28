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

/** 우표 여러 장을 붙인 것처럼 — 늘어도 난잡해 보이지 않게 한 줄로 감쌉니다. */
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

/** 공개 화면의 자료가 전부 합성이라는 사실을 맨 위에 못박습니다 (설계 원칙 1). */
export const syntheticNote = css`
    padding: 12px 16px;
    margin-bottom: 22px;
    border: 1px solid var(--line);
    border-left: 4px solid var(--accent);
    border-radius: 3px;
    background: var(--accent-bg);
    color: var(--ink);
    font-size: 13.5px;
    line-height: 1.75;
`;

/**
 * 넓은 화면에서는 입력 폼을 왼쪽에 고정하고 오른쪽에 결과를 쌓습니다.
 * 목록에서 "수정"을 눌러도 폼이 이미 눈앞에 있어서 어디가 바뀌는지 바로 보입니다.
 */
export const layout = css`
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
    gap: 22px;
    align-items: start;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

export const side = css`
    position: sticky;
    top: 22px;

    @media (max-width: 900px) {
        position: static;
    }
`;

export const column = css`
    display: flex;
    flex-direction: column;
    gap: 22px;
    min-width: 0;
`;

export const footer = css`
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
`;
