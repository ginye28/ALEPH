import { css } from "@emotion/react";

export const intro = css`
    margin: 0 0 14px;
    color: var(--ink-soft);
    font-size: 13px;
    line-height: 1.7;
`;

export const assetLine = css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin: 0 0 16px;
    padding: 9px 12px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 12px;
    color: var(--ink-soft);

    & code {
        font-family: var(--font-mono);
        color: var(--ink);
    }
`;

export const group = css`
    margin-bottom: 18px;
`;

export const row = css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
`;

export const seqButton = css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
    padding: 9px 13px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink);
    text-align: left;
    transition: border-color 0.15s ease;

    &:not(:disabled):hover {
        border-color: var(--accent);
    }

    & strong {
        font-size: 13px;
    }

    & small {
        color: var(--ink-faint);
        font-size: 11px;
    }
`;

/** 상태 표시. freshness와 error_code를 서로 다른 칸에 둡니다 — 계약이 별도 필드로 요구합니다. */
export const statusBox = (freshness) => css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
    gap: 12px;
    padding: 13px 15px;
    margin-bottom: 14px;
    border: 1px solid ${freshness === "stale" ? "var(--warn)" : "var(--line)"};
    border-radius: 10px;
    background: ${freshness === "stale" ? "var(--warn-bg)" : "var(--surface-2)"};
`;

export const statusCell = css`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const statusLabel = css`
    color: var(--ink-faint);
    font-size: 11px;
    letter-spacing: 0.02em;
`;

export const statusValue = (tone) => css`
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    color: ${tone === "warn" ? "var(--warn)" : tone === "good" ? "var(--good)" : "var(--ink)"};
`;

export const staleNote = css`
    grid-column: 1 / -1;
    margin: 2px 0 0;
    color: var(--warn);
    font-size: 12.5px;
    line-height: 1.6;
`;

export const table = css`
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;

    & th,
    & td {
        padding: 7px 10px;
        border-bottom: 1px solid var(--line-soft);
        text-align: left;
    }

    & th {
        color: var(--ink-faint);
        font-weight: 600;
        font-size: 11px;
    }

    & td {
        font-family: var(--font-mono);
    }
`;

export const tableWrap = css`
    overflow-x: auto;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
    margin-bottom: 6px;
`;

export const empty = css`
    margin: 0;
    padding: 14px;
    color: var(--ink-faint);
    font-size: 13px;
    text-align: center;
`;

export const log = css`
    margin: 0;
    padding: 10px 12px;
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: var(--surface-2);
    font-family: var(--font-mono);
    font-size: 11.5px;
    line-height: 1.75;
    color: var(--ink-soft);
    list-style: none;
`;

export const logOk = css`
    color: var(--good);
`;

export const logBad = css`
    color: var(--warn);
`;
