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

/** 인계 흐름 — 점선으로 잇는 세로 목록. 표보다 먼저 둬서 숫자를 보기 전에 순서부터 잡습니다. */
export const flow = css`
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 2px 0 4px;
    padding-left: 14px;
    border-left: 2px dashed var(--line);
`;

export const flowStep = css`
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 7px 0 7px 12px;
    position: relative;

    &::before {
        content: "";
        position: absolute;
        left: -19px;
        top: 14px;
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--accent);
    }
`;

export const flowLabel = css`
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
`;

export const flowDetail = css`
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--ink-faint);
`;

/** 정량 비교 막대. 표와 같은 숫자를 다시 그려서 차이를 눈으로 재게 합니다. */
export const metrics = css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 8px;
`;

export const metricRow = css`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const metricLabel = css`
    font-size: 12px;
    color: var(--ink-soft);
`;

export const metricBars = css`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const metricBarLine = css`
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 44px;
    gap: 8px;
    align-items: center;
`;

export const metricAi = css`
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-faint);
`;

export const metricTrack = css`
    display: block;
    height: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
`;

const METRIC_TONES = { a: "var(--good)", b: "var(--accent)" };

export const metricFill = (who, pct) => css`
    display: block;
    width: ${Math.max(pct, 0)}%;
    height: 100%;
    border-radius: 999px;
    background: ${METRIC_TONES[who]};
`;

export const metricValue = css`
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    text-align: right;
    color: var(--ink);
`;

/** 기준을 왜 그렇게 정했는지 한두 문장 — 목록만 던지지 않고 이유를 남깁니다. */
export const reasoning = css`
    margin: 6px 0 4px;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--ink-soft);
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
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 10px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 12.5px;
`;

export const checkHead = css`
    display: grid;
    grid-template-columns: 22px 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;

    @media (max-width: 560px) {
        grid-template-columns: 22px 34px minmax(0, 1fr);

        & > :last-child {
            grid-column: 1 / -1;
            justify-self: start;
        }
    }
`;

/** id·입력·기대값. 검사마다 관찰 가능한 기대값이 있음을 화면에서 확인할 수 있게 합니다. */
export const checkDetail = css`
    padding-left: 64px;
    color: var(--ink-faint);
    font-size: 11px;
    line-height: 1.5;

    & code {
        font-family: var(--font-mono);
        color: var(--ink-soft);
    }

    @media (max-width: 560px) {
        padding-left: 0;
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
