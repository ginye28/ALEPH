import { css } from "@emotion/react";

export const group = css`
    margin-bottom: 16px;
`;

export const row = css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
`;

export const danger = css`
    padding: 8px 14px;
    border: 1px solid var(--bad);
    border-radius: 8px;
    background: transparent;
    color: var(--bad);
    font-size: 13px;

    &:hover {
        background: var(--bad-bg);
    }
`;

export const fileLabel = css`
    display: inline-flex;
    align-items: center;
    padding: 8px 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink);
    font-size: 13px;
    cursor: pointer;

    &:hover {
        border-color: var(--accent);
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
    margin: 10px 0 0;
    padding: 10px 13px;
    border-radius: 8px;
    border-left: 3px solid
        ${tone === "bad" ? "var(--bad)" : tone === "good" ? "var(--good)" : "var(--line)"};
    background: ${tone === "bad" ? "var(--bad-bg)" : tone === "good" ? "var(--good-bg)" : "var(--surface-2)"};
    color: ${tone === "bad" ? "var(--bad)" : tone === "good" ? "var(--good)" : "var(--ink-soft)"};
    font-size: 12.5px;
    line-height: 1.65;
`;

export const schemaLine = css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    padding: 9px 13px;
    margin-bottom: 16px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 12.5px;
    color: var(--ink-soft);

    & code {
        font-family: var(--font-mono);
        color: var(--ink);
    }
`;

export const confirm = css`
    margin: 10px 0 0;
    padding: 11px 13px;
    border: 1px solid var(--bad);
    border-radius: 8px;
    background: var(--bad-bg);
    color: var(--ink);
    font-size: 13px;
    line-height: 1.7;
`;

export const confirmRow = css`
    display: flex;
    gap: 8px;
    margin-top: 9px;
`;
