import { css } from "@emotion/react";

export const grid = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin-top: 8px;
`;

export const modeButton = (isActive) => css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border: 1px solid ${isActive ? "var(--warn)" : "var(--line)"};
    border-radius: 9px;
    background: ${isActive ? "var(--warn-bg)" : "var(--surface-2)"};
    text-align: left;
    transition: border-color 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--warn);
    }

    strong {
        font-size: 13px;
        font-weight: 700;
    }

    small {
        font-size: 11.5px;
        color: var(--ink-faint);
    }
`;

export const row = css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding-top: 14px;
    border-top: 1px solid var(--line-soft);
`;

export const tableWrap = css`
    margin-top: 8px;
    overflow-x: auto;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
`;

export const table = css`
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 12.5px;
    white-space: nowrap;

    th,
    td {
        padding: 8px 11px;
        text-align: left;
        border-bottom: 1px solid var(--line-soft);
    }

    th {
        background: var(--surface-2);
        color: var(--ink-soft);
        font-weight: 500;
    }

    tr:last-of-type td {
        border-bottom: 0;
    }
`;

export const resultRow = css`
    td {
        background: var(--accent-bg);
        font-weight: 700;
    }
`;
