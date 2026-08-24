import { css } from "@emotion/react";

const DETAIL_TONES = {
    ok: "var(--good)",
    stale: "var(--warn)",
    empty: "var(--bad)",
    loading: "var(--ink-soft)",
};

export const card = css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 22px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: linear-gradient(180deg, var(--surface-2), var(--surface));
`;

export const head = css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
`;

export const item = css`
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
`;

export const purpose = css`
    margin-top: 2px;
    font-size: 12.5px;
    color: var(--ink-faint);
`;

export const value = css`
    display: flex;
    align-items: baseline;
    gap: 8px;
`;

export const number = css`
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: clamp(48px, 14vw, 76px);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
`;

export const unit = css`
    font-size: clamp(20px, 5vw, 28px);
    font-weight: 500;
    color: var(--ink-soft);
`;

export const empty = css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 18px 0;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--ink-faint);

    small {
        font-family: var(--font-body);
        font-size: 12.5px;
        font-weight: 400;
    }
`;

export const detail = (tone) => css`
    padding: 9px 12px;
    border-left: 3px solid ${DETAIL_TONES[tone] ?? "var(--ink-soft)"};
    border-radius: 0 8px 8px 0;
    background: var(--surface-2);
    font-size: 13px;
    color: var(--ink-soft);
`;

export const meta = css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid var(--line-soft);

    dd {
        margin: 0;
        font-size: 13.5px;
    }
`;

export const metaRow = css`
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    align-items: baseline;
    gap: 10px;

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
        gap: 2px;
    }
`;

export const link = css`
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    font-weight: 500;
    text-decoration: none;
    border-bottom: 1px solid currentColor;

    &:hover {
        opacity: 0.85;
    }
`;

export const linkHint = css`
    font-size: 11.5px;
    color: var(--ink-faint);
    border: 0;
`;

export const pending = css`
    color: var(--ink-faint);
`;

export const actions = css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;
