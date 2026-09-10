import { css } from "@emotion/react";

/** 여러 섹션(계획·할일·실행기록)이 공유하는 입력 폼 조각. */
export const form = css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    align-items: start;
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
    color: var(--ink-faint);
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
`;

export const input = (invalid) => css`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${invalid ? "var(--bad)" : "var(--line)"};
    border-radius: 6px;
    background: var(--field);
    color: var(--ink);
    font-family: inherit;
    font-size: 15px;

    &:focus {
        outline: none;
        border-color: ${invalid ? "var(--bad)" : "var(--accent)"};
        box-shadow: 0 0 0 3px ${invalid ? "var(--bad-bg)" : "var(--accent-bg)"};
    }

    &::placeholder {
        color: var(--ink-faint);
    }
`;

export const textarea = (invalid) => css`
    ${input(invalid)};
    resize: vertical;
    min-height: 64px;
    font-family: inherit;
`;

export const select = (invalid) => css`
    ${input(invalid)};
`;

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
    padding-top: 4px;
    border-top: 1px solid var(--line-soft);
    margin-top: 2px;
`;

export const table = css`
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;

    th,
    td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--line-soft);
        text-align: left;
        vertical-align: top;
    }

    th {
        color: var(--ink-faint);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.05em;
        white-space: nowrap;
    }
`;

export const rowActions = css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

/** 완료한 할 일은 옅은 초록 바탕 + 제목 취소선으로 진행 중인 것과 한눈에 갈립니다. */
export const doneRow = css`
    background: var(--good-bg);
`;

export const doneTitle = css`
    color: var(--ink-faint);
    text-decoration: line-through;
`;

export const statusDone = css`
    color: var(--good);
    font-weight: 700;
`;

export const smallButton = css`
    padding: 4px 9px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--surface);
    color: var(--ink-soft);
    font-size: 12px;

    &:hover:not(:disabled) {
        border-color: var(--accent);
        background: var(--accent-bg);
        color: var(--ink);
    }

    &:disabled {
        opacity: 0.45;
    }
`;

export const tag = css`
    display: inline-block;
    padding: 1px 8px;
    margin: 0 4px 4px 0;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--ink-soft);
    font-size: 11.5px;
`;
