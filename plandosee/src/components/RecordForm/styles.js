import { css } from "@emotion/react";

/**
 * 폼은 왼쪽 좁은 칸에 들어갑니다.
 * 과목·태그·메모는 한 줄을 다 쓰고, 날짜와 시간만 나란히 둡니다.
 */
export const form = css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    align-items: start;
`;

export const field = css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const wide = css`
    grid-column: 1 / -1;
`;

export const labelText = css`
    color: var(--ink-faint);
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
`;

export const input = (invalid) => css`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${invalid ? "var(--bad)" : "var(--line)"};
    border-radius: 6px;
    background: var(--field);
    color: var(--ink);
    font-family: inherit;
    font-size: 15px;

    &:focus {
        outline: none;
        border-color: ${invalid ? "var(--bad)" : "var(--accent)"};
        box-shadow: 0 0 0 3px ${invalid ? "var(--bad-bg)" : "var(--accent-bg)"};
    }

    &::placeholder {
        color: var(--ink-faint);
    }
`;

/** 칸마다 이유를 붙입니다. 어느 칸이 문제인지 모르면 사용자는 같은 실수를 반복합니다. */
export const error = css`
    color: var(--bad);
    font-size: 12.5px;
    line-height: 1.6;
`;

export const actions = css`
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding-top: 4px;
    border-top: 1px solid var(--line-soft);
    margin-top: 2px;
`;

export const quick = css`
    display: flex;
    gap: 5px;
    margin-top: 3px;
`;

export const quickButton = css`
    flex: 1;
    padding: 4px 6px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--ink-soft);
    font-size: 12px;

    &:hover {
        border-color: var(--accent);
        background: var(--accent-bg);
        color: var(--ink);
    }
`;

/** 어느 기록을 고치는 중인지 폼 안에서 다시 확인시켜 줍니다. */
export const editing = css`
    padding: 10px 14px;
    border: 1px solid var(--accent);
    border-left: 4px solid var(--accent);
    border-radius: 3px;
    background: var(--accent-bg);
    color: var(--ink);
    font-size: 13.5px;
    line-height: 1.7;
`;
