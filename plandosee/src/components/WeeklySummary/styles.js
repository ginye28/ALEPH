import { css } from "@emotion/react";

export const range = css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
`;

export const rangeText = css`
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--ink);
`;

export const move = css`
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--surface-2);
    color: var(--ink-soft);
    font-size: 12px;

    &:hover {
        border-color: var(--accent);
        color: var(--ink);
    }
`;

export const stats = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface-2);
    margin-bottom: 12px;
`;

export const stat = css`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const statLabel = css`
    color: var(--ink-faint);
    font-size: 11.5px;
`;

export const statValue = (tone) => css`
    font-family: var(--font-mono);
    font-size: 19px;
    font-weight: 700;
    color: ${tone === "warn" ? "var(--warn)" : tone === "accent" ? "var(--accent)" : "var(--ink)"};
`;

export const bars = css`
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

export const barRow = css`
    display: grid;
    grid-template-columns: 96px 1fr 78px;
    gap: 10px;
    align-items: center;
    font-size: 12.5px;
`;

export const barName = css`
    color: var(--ink-soft);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/* span은 기본이 inline이라 width·height가 먹지 않습니다. block으로 바꿔야 막대가 보입니다. */
export const barTrack = css`
    display: block;
    height: 8px;
    border-radius: 999px;
    background: var(--line-soft);
    overflow: hidden;
`;

export const barFill = (ratio) => css`
    display: block;
    width: ${Math.max(ratio * 100, 2)}%;
    height: 100%;
    border-radius: 999px;
    background: var(--accent);
`;

export const barValue = css`
    font-family: var(--font-mono);
    text-align: right;
    color: var(--ink);
`;

export const empty = css`
    margin: 0;
    color: var(--ink-faint);
    font-size: 13px;
`;
