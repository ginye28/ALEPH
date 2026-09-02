import { css } from "@emotion/react";

/**
 * 공통 조각.
 *
 * 과제 4·5의 "둥근 카드"와 구분하려고, 각 구역을 종이 한 장처럼 다룹니다 —
 * 모서리는 거의 각지게, 테두리는 얇게, 그림자는 아주 옅게.
 */
export const panel = css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 22px 24px 24px;
    border: 1px solid var(--line-soft);
    border-radius: 4px;
    background: var(--surface);
    box-shadow: 0 1px 2px rgba(46, 41, 33, 0.05), 0 8px 20px rgba(46, 41, 33, 0.035);

    @media (max-width: 640px) {
        padding: 18px 16px 20px;
    }
`;

/** 제목과 설명 사이에 가로줄을 둬서 구역이 어디서 시작하는지 분명히 합니다. */
export const panelHead = css`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line-soft);
`;

export const panelTitle = css`
    position: relative;
    padding-left: 14px;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ink);

    &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.3em;
        width: 4px;
        height: 0.92em;
        border-radius: 1px;
        background: var(--accent);
    }
`;

export const panelHint = css`
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-faint);
`;

export const button = css`
    padding: 10px 16px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
    font-size: 14px;
    font-weight: 500;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--accent);
        background: var(--accent-bg);
    }
`;

export const primaryButton = css`
    ${button};
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;

    &:hover:not(:disabled) {
        border-color: var(--accent-strong);
        background: var(--accent-strong);
    }
`;

/** 작은 제목. 자간을 벌려 본문과 확실히 구분합니다. */
export const label = css`
    display: block;
    margin-bottom: 8px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.07em;
    color: var(--ink-faint);
`;

export const mono = css`
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
`;

export const note = css`
    font-size: 13.5px;
    line-height: 1.75;
    color: var(--ink-soft);
`;
