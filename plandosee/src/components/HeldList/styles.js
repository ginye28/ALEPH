import { css } from "@emotion/react";

export const tableWrap = css`
    overflow-x: auto;
    border: 1px solid var(--warn);
    border-radius: 9px;
    background: var(--warn-bg);
`;

export const table = css`
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;

    th,
    td {
        padding: 8px 11px;
        text-align: left;
        border-bottom: 1px solid rgba(255, 180, 84, 0.22);
        white-space: nowrap;
    }

    th {
        color: var(--warn);
        font-weight: 500;
        font-size: 11px;
    }

    tr:last-of-type td {
        border-bottom: 0;
    }
`;

export const mono = css`
    font-family: var(--font-mono);
`;

export const reason = css`
    color: var(--warn);
    white-space: normal;
`;

export const smallButton = css`
    padding: 3px 9px;
    border: 1px solid var(--warn);
    border-radius: 6px;
    background: transparent;
    color: var(--warn);
    font-size: 11.5px;

    &:disabled {
        opacity: 0.4;
    }
`;
