import { css } from "@emotion/react";

export const list = css`
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    overflow: hidden;

    & > li + li {
        border-top: 1px solid var(--line-soft);
    }
`;

/**
 * 기록 행은 누를 수 있습니다 — 누른 날짜가 비교 기준이 됩니다.
 * 비교할 상대가 없을 때(기록 1건)는 disabled로 넘어옵니다.
 */
export const row = (selected) => css`
    display: grid;
    grid-template-columns: 104px 96px auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 13px;
    text-align: left;
    background: ${selected ? "var(--accent-bg)" : "var(--surface-2)"};
    box-shadow: ${selected ? "inset 3px 0 0 var(--accent)" : "none"};
    transition: background 0.15s ease;

    &:not(:disabled):hover {
        background: ${selected ? "var(--accent-bg)" : "var(--surface)"};
    }

    @media (max-width: 560px) {
        grid-template-columns: 104px 96px auto;

        & > :last-child {
            grid-column: 1 / -1;
        }
    }
`;

export const date = css`
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    color: var(--ink-soft);
`;

export const value = css`
    display: flex;
    align-items: baseline;
    gap: 3px;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 18px;
    font-weight: 700;

    small {
        font-size: 12px;
        font-weight: 400;
        color: var(--ink-soft);
    }
`;

/**
 * 지금 직접 본 값과 출처가 알려준 지난 값을 구분해 표시합니다.
 * 둘을 섞어 놓으면 "언제 본 값인지"를 화면이 속이게 됩니다.
 */
export const origin = (kind) => css`
    justify-self: start;
    padding: 2px 8px;
    border: 1px solid ${kind === "live" ? "var(--good)" : "var(--line)"};
    border-radius: 999px;
    background: ${kind === "live" ? "var(--good-bg)" : "transparent"};
    color: ${kind === "live" ? "var(--good)" : "var(--ink-faint)"};
    font-size: 11.5px;
    font-weight: 500;
    white-space: nowrap;
`;

export const fetched = css`
    justify-self: end;
    font-size: 11.5px;
    color: var(--ink-faint);

    @media (max-width: 560px) {
        justify-self: start;
    }
`;

export const empty = css`
    padding: 14px;
    border: 1px dashed var(--line);
    border-radius: 9px;
    font-size: 13px;
    color: var(--ink-soft);
`;

export const notes = css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12.5px;
    color: var(--ink-faint);

    li::before {
        content: "· ";
    }
`;
