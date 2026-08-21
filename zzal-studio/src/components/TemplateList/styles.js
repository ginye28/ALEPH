import { css } from "@emotion/react";

export const createRow = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;

    @media (max-width: 520px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

export const empty = css`
    border: 1px dashed var(--line);
    border-radius: 8px;
    padding: 18px 14px;
    text-align: center;
    font-size: 13px;
    color: var(--ink-faint);
`;

export const list = css`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const item = (isSelected) => css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid ${isSelected ? "var(--accent)" : "var(--line)"};
    border-radius: 10px;
    padding: 12px 14px;
    background-color: ${isSelected ? "var(--accent-bg)" : "var(--surface-2)"};
`;

export const itemHead = css`
    display: flex;
    align-items: baseline;
    gap: 8px;
`;

export const itemName = css`
    flex: 1;
    overflow: hidden;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14.5px;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

export const itemRatio = css`
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--ink-faint);
`;

export const itemText = css`
    font-size: 12.5px;
    color: var(--ink-soft);
    word-break: break-all;
`;
