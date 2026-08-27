import { css } from "@emotion/react";

export const panel = css`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
`;

export const panelHead = css`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

export const panelTitle = css`
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
`;

export const panelHint = css`
    font-size: 12px;
    color: var(--ink-faint);
`;

export const button = css`
    padding: 9px 14px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--surface-2);
    font-size: 13px;
    font-weight: 500;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--accent);
    }
`;

export const primaryButton = css`
    ${button};
    border-color: var(--accent);
    background: var(--accent-bg);
    color: var(--ink);
    font-weight: 700;
`;

export const label = css`
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-soft);
`;

export const mono = css`
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
`;

export const note = css`
    font-size: 12.5px;
    color: var(--ink-soft);
`;
