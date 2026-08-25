import { css } from "@emotion/react";

export const caps = css`
    padding: 9px 12px;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
    background: var(--surface-2);
    font-size: 12.5px;
    color: var(--ink-soft);

    strong {
        font-family: var(--font-mono);
        color: var(--ink);
    }
`;

export const tableWrap = css`
    overflow-x: auto;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
`;

export const table = css`
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;

    th,
    td {
        padding: 8px 11px;
        text-align: left;
        border-bottom: 1px solid var(--line-soft);
        white-space: nowrap;
    }

    th {
        background: var(--surface-2);
        color: var(--ink-soft);
        font-weight: 500;
    }

    td:first-of-type {
        color: var(--ink-soft);
    }

    tr:last-of-type td {
        border-bottom: 0;
    }
`;

const CHIP_TONES = {
    pass: { border: "var(--good)", background: "var(--good-bg)", color: "var(--good)" },
    fail: { border: "var(--line)", background: "transparent", color: "var(--ink-faint)" },
};

export const chip = (tone) => css`
    display: inline-block;
    min-width: 20px;
    margin-right: 4px;
    padding: 1px 6px;
    border: 1px solid ${CHIP_TONES[tone].border};
    border-radius: 999px;
    background: ${CHIP_TONES[tone].background};
    color: ${CHIP_TONES[tone].color};
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 11.5px;
    font-weight: 700;
    text-align: center;
`;

export const checks = css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
`;

export const check = css`
    display: grid;
    grid-template-columns: 22px 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 12.5px;

    @media (max-width: 560px) {
        grid-template-columns: 22px 34px minmax(0, 1fr);

        & > :last-child {
            grid-column: 1 / -1;
            justify-self: start;
        }
    }
`;

export const checkNo = css`
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--ink-faint);
`;

export const checkKind = css`
    font-size: 11px;
    color: var(--ink-faint);
`;

export const checkTitle = css`
    color: var(--ink-soft);
`;

const STATE_TONES = {
    a: { border: "var(--good)", color: "var(--good)", background: "var(--good-bg)" },
    b: { border: "var(--accent)", color: "var(--accent)", background: "var(--accent-bg)" },
    todo: { border: "var(--line)", color: "var(--ink-faint)", background: "transparent" },
};

export const checkState = (tone) => css`
    padding: 2px 8px;
    border: 1px solid ${STATE_TONES[tone].border};
    border-radius: 999px;
    background: ${STATE_TONES[tone].background};
    color: ${STATE_TONES[tone].color};
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
`;

export const pending = css`
    margin-top: 8px;
    padding: 11px 12px;
    border: 1px dashed var(--line);
    border-radius: 9px;
    font-size: 12.5px;
    color: var(--ink-soft);
`;

export const criteria = css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    padding-left: 18px;
    list-style: decimal;
    font-size: 13px;
    color: var(--ink-soft);
`;
