import { css } from "@emotion/react";

export const tableWrap = css`
    overflow-x: auto;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
`;

export const table = css`
    width: 100%;
    border-collapse: collapse;
    font-size: 14.5px;

    th,
    td {
        padding: 13px 14px;
        text-align: left;
        border-bottom: 1px solid var(--line-soft);
        white-space: nowrap;
        vertical-align: top;
    }

    td:nth-of-type(2),
    td:nth-of-type(5) {
        white-space: normal;
    }

    th {
        background: var(--surface-2);
        color: var(--ink-soft);
        font-weight: 500;
        font-size: 12.5px;
        letter-spacing: 0.01em;
    }

    tbody tr:nth-of-type(even) {
        background: var(--line-soft);
    }

    tr:last-of-type td {
        border-bottom: 0;
    }
`;

/**
 * 수정 중인 행을 눈에 띄게 둡니다 — 어느 행을 고치는지 헷갈리면 다른 행을 덮어씁니다.
 * 얼룩무늬(짝수 행) 배경보다 우선해야 해서 active일 때만 !important로 덮습니다.
 */
export const row = (active) => css`
    background: ${active ? "var(--accent-bg) !important" : undefined};
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
    padding: 2px 9px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--ink-soft);
    font-size: 12px;
`;

export const rowActions = css`
    display: flex;
    gap: 7px;
`;

export const smallButton = (danger) => css`
    padding: 6px 11px;
    border: 1px solid ${danger ? "var(--bad)" : "var(--line)"};
    border-radius: 7px;
    background: transparent;
    color: ${danger ? "var(--bad)" : "var(--ink-soft)"};
    font-size: 12.5px;

    &:hover {
        border-color: ${danger ? "var(--bad)" : "var(--accent)"};
        color: ${danger ? "var(--bad)" : "var(--ink)"};
    }
`;

export const empty = css`
    margin: 0;
    padding: 28px;
    text-align: center;
    color: var(--ink-faint);
    font-size: 14px;
    line-height: 1.8;
`;

export const idCell = css`
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-faint);
`;
