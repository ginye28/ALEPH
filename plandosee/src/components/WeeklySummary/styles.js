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
    font-size: 15px;
    color: var(--ink);
`;

export const move = css`
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink-soft);
    font-size: 13px;

    &:hover {
        border-color: var(--accent);
        color: var(--ink);
    }
`;

export const stats = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 14px;
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface-2);
    margin-bottom: 14px;
`;

export const stat = css`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

export const statLabel = css`
    color: var(--ink-faint);
    font-size: 12.5px;
`;

export const statValue = (tone) => css`
    font-family: var(--font-mono);
    font-size: 21px;
    font-weight: 700;
    color: ${tone === "warn" ? "var(--warn)" : tone === "accent" ? "var(--accent)" : "var(--ink)"};
`;

export const bars = css`
    display: flex;
    flex-direction: column;
    gap: 9px;
`;

export const barRow = css`
    display: grid;
    grid-template-columns: 104px 1fr 82px;
    gap: 12px;
    align-items: center;
    font-size: 13.5px;
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
