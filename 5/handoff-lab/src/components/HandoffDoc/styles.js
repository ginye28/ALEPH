import { css } from "@emotion/react";

/** 제목 7개가 한눈에 채워졌는지 보이도록 위에 나열합니다. */
export const headingMap = css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

export const headingChip = css`
    padding: 3px 9px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 11.5px;
    font-weight: 500;
    color: var(--ink-soft);
`;

export const doc = css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 460px;
    overflow-y: auto;
    padding: 16px;
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    background: var(--surface-2);
    font-size: 13px;
    line-height: 1.7;

    a {
        color: var(--accent);
        text-decoration: underline;
    }
`;

export const docTitle = css`
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
`;

export const docHeading = css`
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--line-soft);
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink);
`;

export const para = css`
    color: var(--ink-soft);
`;

export const list = (ordered) => css`
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: 18px;
    list-style: ${ordered ? "decimal" : "disc"};
    color: var(--ink-soft);
`;

export const item = (depth) => css`
    padding-left: ${depth * 14}px;

    &::marker {
        color: var(--ink-faint);
    }
`;

export const code = css`
    padding: 10px 12px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
`;

export const inlineCode = css`
    padding: 1px 5px;
    border: 1px solid var(--line-soft);
    border-radius: 5px;
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 12px;
`;
