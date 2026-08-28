import { css } from "@emotion/react";

/** 바깥 상자를 없애고 위아래 굵은 줄만 남깁니다 — 장부에 가까운 인상. */
export const tableWrap = css`
    overflow-x: auto;
    border-top: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
`;

export const table = css`
    width: 100%;
    /* 좁은 화면에서 칸을 쥐어짜 글자가 세로로 쌓이는 대신 가로로 넘겨 보게 합니다. */
    min-width: 680px;
    border-collapse: collapse;
    font-size: 14.5px;

    th,
    td {
        padding: 13px 14px;
        text-align: left;
        border-bottom: 1px solid var(--line-soft);
        white-space: nowrap;
        vertical-align: top;
    }

    /* 과목·메모는 길어질 수 있으니 줄바꿈을 허용하되, 한국어는 낱말 단위로 끊습니다. */
    td:nth-of-type(2),
    td:nth-of-type(5) {
        white-space: normal;
        word-break: keep-all;
    }

    td:nth-of-type(2) {
        min-width: 104px;
    }

    th {
        border-bottom: 1px solid var(--line);
        background: transparent;
        color: var(--ink-faint);
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.07em;
    }

    tbody tr:last-of-type td {
        border-bottom: 0;
    }
`;

/** 수정 중인 행을 눈에 띄게 둡니다 — 어느 행을 고치는지 헷갈리면 다른 행을 덮어씁니다. */
export const row = (active) => css`
    background: ${active ? "var(--accent-bg)" : "transparent"};
    box-shadow: ${active ? "inset 3px 0 0 var(--accent)" : "none"};
`;

/** 날짜는 여백처럼 흐리게, 시간은 이 표의 주인공이라 진하게. */
export const dateCell = css`
    font-family: var(--font-mono);
    color: var(--ink-soft);
`;

export const minutesCell = css`
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--ink);
`;

export const memo = css`
    color: var(--ink-soft);
    white-space: normal;
    max-width: 280px;
`;

export const tag = css`
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--ink-soft);
    font-size: 12px;
`;

export const rowActions = css`
    display: flex;
    gap: 7px;
`;

export const smallButton = (danger) => css`
    padding: 6px 11px;
    border: 1px solid ${danger ? "var(--bad)" : "var(--line)"};
    border-radius: 6px;
    background: var(--surface);
    color: ${danger ? "var(--bad)" : "var(--ink-soft)"};
    font-size: 12.5px;

    &:hover {
        border-color: ${danger ? "var(--bad)" : "var(--accent)"};
        background: ${danger ? "var(--bad-bg)" : "var(--accent-bg)"};
        color: ${danger ? "var(--bad)" : "var(--ink)"};
    }
`;

export const empty = css`
    margin: 0;
    padding: 34px 20px;
    text-align: center;
    border: 1px dashed var(--line);
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--ink-faint);
    font-size: 14px;
    line-height: 1.8;
`;

export const idCell = css`
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-faint);
`;
