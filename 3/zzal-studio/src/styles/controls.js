import { css } from "@emotion/react";

export const panel = css`
    display: flex;
    flex-direction: column;
    gap: 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 18px;
    background-color: var(--surface);
`;

export const panelHead = css`
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
`;

export const panelTitle = css`
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 16px;
    letter-spacing: -0.01em;
`;

export const panelHint = css`
    font-size: 12.5px;
    color: var(--ink-faint);
`;

export const field = css`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const label = css`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ink-soft);
`;

export const value = css`
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--ink-faint);
`;

export const grid2 = css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
`;

export const textInput = css`
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 12px;
    width: 100%;
    background-color: var(--surface-2);
    color: var(--ink);

    &::placeholder {
        color: var(--ink-faint);
    }
`;

export const textarea = css`
    ${textInput};
    min-height: 92px;
    line-height: 1.5;
    resize: vertical;
`;

export const range = css`
    width: 100%;
    accent-color: var(--accent);
`;

export const colorInput = css`
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 2px;
    width: 100%;
    height: 36px;
    background-color: var(--surface-2);
`;

export const buttonRow = css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const buttonBase = css`
    border-radius: 8px;
    padding: 9px 14px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13.5px;
    transition: background-color 0.15s ease, border-color 0.15s ease;
`;

export const primaryButton = css`
    ${buttonBase};
    border: 1px solid var(--accent);
    background-color: var(--accent);
    color: var(--accent-ink);

    &:hover:enabled {
        background-color: #ff86b1;
    }
`;

export const button = css`
    ${buttonBase};
    border: 1px solid var(--line);
    background-color: var(--surface-2);
    color: var(--ink);

    &:hover:enabled {
        border-color: var(--accent);
        color: var(--accent);
    }
`;

export const dangerButton = css`
    ${button};

    &:hover:enabled {
        border-color: var(--warn);
        color: var(--warn);
    }
`;

export const segmented = css`
    display: flex;
    gap: 6px;
`;

export const segment = (isActive) => css`
    ${buttonBase};
    flex: 1;
    border: 1px solid ${isActive ? "var(--accent)" : "var(--line)"};
    background-color: ${isActive ? "var(--accent-bg)" : "var(--surface-2)"};
    color: ${isActive ? "var(--accent)" : "var(--ink-soft)"};
    text-align: center;

    & > small {
        display: block;
        font-family: var(--font-body);
        font-weight: 400;
        font-size: 11px;
        color: var(--ink-faint);
    }
`;

export const notice = css`
    border: 1px solid var(--line);
    border-left: 2px solid var(--good);
    border-radius: 8px;
    padding: 10px 14px;
    background-color: var(--good-bg);
    font-size: 12.5px;
    color: var(--ink-soft);
`;
