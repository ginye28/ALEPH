import { css } from "@emotion/react";

export const range = css`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
`;

export const rangeText = css`
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
`;

export const move = css`
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink-soft);
    font-size: 13px;

    &:hover {
        border-color: var(--accent);
        background: var(--accent-bg);
        color: var(--ink);
    }
`;

/** 장부 한 줄처럼 — 칸을 세로줄로 나누고 숫자를 크게 둡니다. */
export const stats = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface-2);
    overflow: hidden;
`;

export const stat = css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 13px 16px;
    border-right: 1px solid var(--line-soft);

    &:last-of-type {
        border-right: 0;
    }
`;

export const statLabel = css`
    color: var(--ink-faint);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
`;

export const statValue = (tone) => css`
    font-family: var(--font-mono);
    font-size: 23px;
    font-weight: 700;
    line-height: 1.3;
    color: ${tone === "warn" ? "var(--warn)" : tone === "accent" ? "var(--accent)" : "var(--ink)"};
`;

export const bars = css`
    display: flex;
    flex-direction: column;
`;

/** 과목별 줄은 점선으로 끊습니다 — 표가 아니라 공책에 적은 줄에 가깝게. */
export const barRow = css`
    display: grid;
    grid-template-columns: 108px minmax(0, 1fr) 76px;
    gap: 12px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px dashed var(--line);
    font-size: 13.5px;

    &:last-of-type {
        border-bottom: 0;
    }
`;

export const barName = css`
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/* span은 기본이 inline이라 width·height가 먹지 않습니다. block으로 바꿔야 막대가 보입니다. */
export const barTrack = css`
    display: block;
    height: 10px;
    border-radius: 2px;
    background: var(--surface-2);
    border: 1px solid var(--line-soft);
    overflow: hidden;
`;

export const barFill = (ratio) => css`
    display: block;
    width: ${Math.max(ratio * 100, 2)}%;
    height: 100%;
    background: var(--accent);
`;

export const barValue = css`
    font-family: var(--font-mono);
    font-weight: 700;
    text-align: right;
    color: var(--ink);
`;

export const empty = css`
    margin: 0;
    padding: 16px 0;
    color: var(--ink-faint);
    font-size: 13.5px;
`;
