import { css } from "@emotion/react";

/**
 * 과제 4·5는 어두운 화면에 청록색 강조를 썼습니다.
 * 이 과제는 "다이어리"라서 반대로 갑니다 — 밝은 종이 바탕에 잉크색 글자.
 * 채도를 낮춰서 오래 봐도 눈이 아프지 않게 합니다.
 */
export const reset = css`
    :root {
        --ground: #ece7dc;
        --surface: #f8f5ef;
        --surface-2: #efeadf;
        --field: #fffdf8;
        --line: #cec4b1;
        --line-soft: #e2dccd;
        --ink: #2e2921;
        --ink-soft: #66604f;
        --ink-faint: #786f5d;
        --accent: #46656b;
        --accent-strong: #35505a;
        --accent-bg: #e2eae9;
        --on-accent: #f8f5ef;
        --good: #4a6b45;
        --good-bg: #e2ebdd;
        --warn: #8a6a2f;
        --warn-bg: #f4e9d2;
        --bad: #9b4a3d;
        --bad-bg: #f3ded8;

        --font-body: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
        --font-display: "Noto Serif KR", "Apple SD Gothic Neo", "Malgun Gothic", serif;
        --font-mono: ui-monospace, "D2Coding", "Consolas", monospace;
    }

    * {
        box-sizing: border-box;
    }

    html,
    body,
    #root {
        margin: 0;
        padding: 0;
        min-height: 100%;
    }

    body {
        background-color: var(--ground);
        /* 은은한 종이 결 — feTurbulence 노이즈를 아주 낮은 불투명도로 깔아 화면을 밋밋하지 않게 합니다. */
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.035 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        background-attachment: fixed;
        color: var(--ink);
        font-family: var(--font-body);
        font-size: 16px;
        line-height: 1.8;
        -webkit-font-smoothing: antialiased;
        /* 한국어는 낱말 단위로 끊고, 끊을 수 없는 긴 문자열만 강제로 넘깁니다. */
        word-break: keep-all;
        overflow-wrap: break-word;
    }

    h1,
    h2,
    h3,
    p,
    figure {
        margin: 0;
    }

    ul,
    ol {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    a {
        color: var(--accent);
    }

    button,
    input,
    select,
    textarea {
        font-family: inherit;
        font-size: inherit;
        color: inherit;
    }

    button {
        cursor: pointer;
    }

    button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
    }

    ::selection {
        background: var(--accent-bg);
    }

    :focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        * {
            transition: none !important;
            animation: none !important;
            scroll-behavior: auto !important;
        }
    }
`;
