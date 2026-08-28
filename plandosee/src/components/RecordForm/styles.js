import { css } from "@emotion/react";

export const form = css`
    display: grid;
    grid-template-columns: 160px 1fr 120px 140px;
    gap: 16px;
    align-items: start;

    @media (max-width: 760px) {
        grid-template-columns: 1fr 1fr;
    }
`;

export const field = css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const wide = css`
    grid-column: 1 / -1;
`;

export const labelText = css`
    color: var(--ink-soft);
    font-size: 13px;
    font-weight: 500;
`;

export const input = (invalid) => css`
    width: 100%;
    padding: 11px 13px;
    border: 1px solid ${invalid ? "var(--bad)" : "var(--line)"};
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--ink);
    font-family: inherit;
    font-size: 15px;

    &:focus {
        outline: none;
        border-color: ${invalid ? "var(--bad)" : "var(--accent)"};
    }

    &::placeholder {
        color: var(--ink-faint);
    }
`;

/** 칸마다 이유를 붙입니다. 어느 칸이 문제인지 모르면 사용자는 같은 실수를 반복합니다. */
export const error = css`
    color: var(--bad);
    font-size: 12.5px;
    line-height: 1.6;
`;

export const actions = css`
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
`;

export const quick = css`
    display: flex;
    gap: 6px;
    margin-top: 3px;
`;

export const quickButton = css`
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

export const editing = css`
    padding: 10px 14px;
    margin-bottom: 14px;
    border-left: 3px solid var(--accent);
    background: var(--accent-bg);
    border-radius: 0 9px 9px 0;
    color: var(--ink);
    font-size: 14px;
    line-height: 1.7;
`;
