import { css } from "@emotion/react";

export const form = css`
    display: grid;
    grid-template-columns: 150px 1fr 110px 130px;
    gap: 12px;
    align-items: start;

    @media (max-width: 760px) {
        grid-template-columns: 1fr 1fr;
    }
`;

export const field = css`
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
`;

export const wide = css`
    grid-column: 1 / -1;
`;

export const labelText = css`
    color: var(--ink-soft);
    font-size: 12px;
`;

export const input = (invalid) => css`
    width: 100%;
    padding: 9px 11px;
    border: 1px solid ${invalid ? "var(--bad)" : "var(--line)"};
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink);
    font-family: inherit;
    font-size: 14px;

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
    font-size: 11.5px;
    line-height: 1.5;
`;

export const actions = css`
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
`;

export const quick = css`
    display: flex;
    gap: 5px;
    margin-top: 2px;
`;

export const quickButton = css`
    padding: 3px 8px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--ink-soft);
    font-size: 11px;

    &:hover {
        border-color: var(--accent);
        color: var(--ink);
    }
`;

export const editing = css`
    padding: 8px 12px;
    margin-bottom: 12px;
    border-left: 3px solid var(--accent);
    background: var(--accent-bg);
    border-radius: 0 8px 8px 0;
    color: var(--ink);
    font-size: 13px;
`;
