import { css } from "@emotion/react";

export const dropzone = (isOver) => css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    border: 1px dashed ${isOver ? "var(--accent)" : "var(--line)"};
    border-radius: 10px;
    padding: 22px 16px;
    background-color: ${isOver ? "var(--accent-bg)" : "var(--surface-2)"};
    transition: border-color 0.15s ease, background-color 0.15s ease;
`;

export const dropText = css`
    font-size: 13px;
    color: var(--ink-faint);
`;

export const hiddenInput = css`
    display: none;
`;

export const picked = css`
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 8px 8px 14px;
    background-color: var(--surface-2);
`;

export const pickedName = css`
    flex: 1;
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: 12.5px;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--ink-soft);
`;
