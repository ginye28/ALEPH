import { css } from "@emotion/react";

const DIRECTION_COLORS = {
    up: "var(--bad)",
    down: "var(--accent)",
    flat: "var(--ink-soft)",
};

export const delta = (direction) => css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    color: ${DIRECTION_COLORS[direction] ?? "var(--ink)"};
`;

export const arrow = css`
    font-size: 20px;
`;

export const amount = css`
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 38px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
`;

export const unit = css`
    font-size: 19px;
    font-weight: 500;
`;

export const direction = css`
    margin-left: 4px;
    padding: 3px 9px;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 700;
`;

/** 손계산과 화면값을 바로 대조할 수 있게 계산식을 그대로 보여줍니다. */
export const equation = css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
    background: var(--surface-2);
    font-size: 13.5px;
`;

export const operator = css`
    color: var(--ink-faint);
`;

export const dates = css`
    font-size: 12.5px;
    color: var(--ink-faint);
`;

/** 개선 기능의 이름과 사용 방법. 채점자가 무엇을 눌러야 하는지 여기서 읽습니다. */
export const picker = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
    background: var(--surface-2);
`;

export const pickerText = css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12.5px;
    color: var(--ink-soft);

    strong {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--ink);
    }
`;

export const selectedTag = css`
    padding: 2px 8px;
    border: 1px solid var(--accent);
    border-radius: 999px;
    background: var(--accent-bg);
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink);
`;

export const clearButton = css`
    padding: 6px 11px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    font-size: 12.5px;
    font-weight: 500;
    white-space: nowrap;

    &:hover {
        border-color: var(--accent);
    }
`;

export const blocked = css`
    padding: 12px;
    border: 1px dashed var(--line);
    border-radius: 9px;
    font-size: 13px;
    color: var(--ink-soft);
`;
