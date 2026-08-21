import { css } from "@emotion/react";

export const layout = css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
`;

export const stage = css`
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 16px;
    background-color: var(--surface);
    /* 투명 배경을 고른 경우 이 격자가 그대로 비칩니다. */
    background-image:
        linear-gradient(45deg, var(--surface-2) 25%, transparent 25%),
        linear-gradient(-45deg, var(--surface-2) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--surface-2) 75%),
        linear-gradient(-45deg, transparent 75%, var(--surface-2) 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0;
`;

export const canvas = (isDragging) => css`
    display: block;
    cursor: ${isDragging ? "grabbing" : "grab"};
    touch-action: none;
    max-width: 100%;
    max-height: 58vh;
    width: auto;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 12px 32px -18px #000000cc;
`;

export const caption = css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
`;

export const badge = css`
    border: 1px solid var(--accent);
    border-radius: 999px;
    padding: 2px 12px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    color: var(--accent);
    background-color: var(--accent-bg);
`;

export const size = css`
    font-family: var(--font-mono);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    color: var(--ink-soft);
`;

export const note = css`
    font-size: 12.5px;
    color: var(--ink-faint);
`;
