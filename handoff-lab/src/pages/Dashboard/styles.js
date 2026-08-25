import { css } from "@emotion/react";

export const page = css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(720px, 100%);
    margin: 0 auto;
    padding: 28px 18px 56px;

    @media (max-width: 480px) {
        padding: 20px 14px 40px;
    }
`;

export const header = css`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const title = css`
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.02em;
`;

export const subtitle = css`
    font-size: 12.5px;
    color: var(--ink-faint);
`;

export const toolsToggle = css`
    padding: 12px;
    border: 1px dashed var(--line);
    border-radius: 12px;
    background: transparent;
    color: var(--ink-soft);
    font-size: 13px;

    &:hover {
        border-color: var(--accent);
        color: var(--ink);
    }
`;

export const footer = css`
    padding-top: 8px;
    border-top: 1px solid var(--line-soft);
`;
