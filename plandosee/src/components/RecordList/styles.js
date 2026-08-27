import { css } from "@emotion/react";

export const tableWrap = css`
    overflow-x: auto;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
`;

export const table = css`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th,
    td {
        padding: 9px 11px;
        text-align: left;
        border-bottom: 1px solid var(--line-soft);
        white-space: nowrap;
    }

    th {
        background: var(--surface-2);
        color: var(--ink-soft);
        font-weight: 500;
        font-size: 11.5px;
    }

    tr:last-of-type td {
        border-bottom: 0;
    }
`;

/** 수정 중인 행을 눈에 띄게 둡니다 — 어느 행을 고치는지 헷갈리면 다른 행을 덮어씁니다. */
export const row = (active) => css`
    background: ${active ? "var(--accent-bg)" : "transparent"};
    box-shadow: ${active ? "inset 3px 0 0 var(--accent)" : "none"};
`;

export const num = css`
    font-family: var(--font-mono);
`;

export const memo = css`
    color: var(--ink-soft);
    white-space: normal;
    max-width: 260px;
`;

export const tag = css`
    display: inline-block;
    padding: 1px 7px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--ink-soft);
    font-size: 11px;
`;

export const rowActions = css`
    display: flex;
    gap: 6px;
`;

export const smallButton = (danger) => css`
    padding: 4px 9px;
    border: 1px solid ${danger ? "var(--bad)" : "var(--line)"};
    border-radius: 6px;
    background: transparent;
    color: ${danger ? "var(--bad)" : "var(--ink-soft)"};
    font-size: 11.5px;

    &:hover {
        border-color: ${danger ? "var(--bad)" : "var(--accent)"};
        color: ${danger ? "var(--bad)" : "var(--ink)"};
    }
`;

export const empty = css`
    margin: 0;
    padding: 22px;
    text-align: center;
    color: var(--ink-faint);
    font-size: 13px;
    line-height: 1.7;
`;

export const idCell = css`
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--ink-faint);
`;
