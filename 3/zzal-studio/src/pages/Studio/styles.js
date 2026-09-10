import { css } from "@emotion/react";

export const page = css`
    margin: 0 auto;
    padding: clamp(20px, 4vw, 44px) clamp(16px, 4vw, 40px) 72px;
    max-width: 1240px;
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

export const header = css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-bottom: 1px solid var(--line);
    padding-bottom: 18px;
`;

export const eyebrow = css`
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    color: var(--accent);
`;

export const title = css`
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(24px, 3.6vw, 36px);
    line-height: 1.2;
    letter-spacing: -0.02em;
    text-wrap: balance;
`;

export const lead = css`
    max-width: 62ch;
    font-size: 14px;
    color: var(--ink-soft);
`;

export const status = (tone) => css`
    border: 1px solid ${tone === "error" ? "var(--warn)" : "var(--line)"};
    border-left: 3px solid ${tone === "error" ? "var(--warn)" : "var(--good)"};
    border-radius: 8px;
    padding: 10px 14px;
    background-color: ${tone === "error" ? "var(--warn-bg)" : "var(--surface)"};
    font-size: 13.5px;
    color: ${tone === "error" ? "var(--warn)" : "var(--ink-soft)"};
    word-break: keep-all;
`;

export const main = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    align-items: start;
    gap: 20px;

    @media (max-width: 940px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

export const previewColumn = css`
    position: sticky;
    top: 20px;

    @media (max-width: 940px) {
        position: static;
    }
`;

export const controlColumn = css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

export const footer = css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-top: 1px solid var(--line);
    padding-top: 18px;
`;

export const guide = css`
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 18px;
    background-color: var(--surface);
`;

export const guideSummary = css`
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14.5px;
    cursor: pointer;
    color: var(--accent);
`;

export const guideList = css`
    margin: 12px 0 0;
    padding-left: 1.2em;
    list-style: decimal;
    font-size: 13.5px;
    color: var(--ink-soft);

    & > li {
        margin-bottom: 4px;
    }
`;

export const guideNote = css`
    margin-top: 10px;
    font-size: 13px;
    color: var(--ink-soft);

    & > b {
        color: var(--ink);
    }
`;

export const footNote = css`
    font-size: 12.5px;
    color: var(--ink-faint);
`;
