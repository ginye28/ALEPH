import { css } from "@emotion/react";

export const group = css`
    padding-bottom: 16px;
    border-bottom: 1px dashed var(--line);

    &:last-of-type {
        padding-bottom: 0;
        border-bottom: 0;
    }
`;

export const row = css`
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    align-items: center;
`;

export const danger = css`
    padding: 10px 16px;
    border: 1px solid var(--bad);
    border-radius: 6px;
    background: var(--surface);
    color: var(--bad);
    font-size: 14px;
    font-weight: 500;

    &:hover:not(:disabled) {
        background: var(--bad-bg);
    }
`;

export const fileLabel = css`
    display: inline-flex;
    align-items: center;
    padding: 10px 16px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
    font-size: 14px;
    cursor: pointer;

    &:hover {
        border-color: var(--accent);
        background: var(--accent-bg);
    }

    & input {
        display: none;
    }
`;

/**
 * 결과·오류 영역.
 * 카드 2의 통과 기준이 "오류 이유를 보여주는 영역이 화면에 보인다"이므로
 * 성공일 때도 비워 두지 않고 무슨 일이 있었는지 남깁니다.
 */
export const message = (tone) => css`
    margin: 0;
    padding: 12px 15px;
    border: 1px solid
        ${tone === "bad" ? "var(--bad)" : tone === "good" ? "var(--good)" : "var(--line)"};
    border-left-width: 4px;
    border-radius: 3px;
    background: ${tone === "bad" ? "var(--bad-bg)" : tone === "good" ? "var(--good-bg)" : "var(--surface-2)"};
    color: ${tone === "bad" ? "var(--bad)" : tone === "good" ? "var(--good)" : "var(--ink-soft)"};
    font-size: 13.5px;
    line-height: 1.75;
`;

export const schemaLine = css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    padding: 11px 15px;
    border: 1px solid var(--line-soft);
    border-radius: 3px;
    background: var(--surface-2);
    font-size: 13px;
    color: var(--ink-soft);

    & code {
        font-family: var(--font-mono);
        font-weight: 700;
        color: var(--ink);
    }
`;

export const confirm = css`
    margin-top: 12px;
    padding: 13px 15px;
    border: 1px solid var(--bad);
    border-radius: 3px;
    background: var(--bad-bg);
    color: var(--ink);
    font-size: 14px;
    line-height: 1.75;
`;

export const confirmRow = css`
    display: flex;
    gap: 9px;
    margin-top: 10px;
`;
