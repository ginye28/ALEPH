import { css } from "@emotion/react";

export const tableWrap = css`
    overflow-x: auto;
    border: 1px solid var(--warn);
    border-radius: 3px;
    background: var(--warn-bg);
`;

export const table = css`
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
    font-size: 13.5px;

    th,
    td {
        padding: 12px 14px;
        text-align: left;
        border-bottom: 1px solid rgba(138, 106, 47, 0.24);
        white-space: nowrap;
        vertical-align: top;
    }

    /* 보류 이유는 문장이라 줄바꿈을 허용하되 낱말 단위로 끊습니다. */
    td:nth-of-type(4) {
        white-space: normal;
        word-break: keep-all;
    }

    td:nth-of-type(2) {
        white-space: normal;
        word-break: keep-all;
    }

    th {
        color: var(--warn);
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.07em;
    }

    tr:last-of-type td {
        border-bottom: 0;
    }
`;

export const mono = css`
    font-family: var(--font-mono);
    color: var(--ink);
`;

export const reason = css`
    color: var(--warn);
    white-space: normal;
`;

export const smallButton = css`
    padding: 5px 11px;
    border: 1px solid var(--warn);
    border-radius: 6px;
    background: transparent;
    color: var(--warn);
    font-size: 12.5px;

    &:hover:not(:disabled) {
        background: rgba(138, 106, 47, 0.12);
    }

    &:disabled {
        opacity: 0.4;
    }
`;
