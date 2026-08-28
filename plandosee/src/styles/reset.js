import { css } from "@emotion/react";

export const reset = css`
    :root {
        --ground: #1b140f;
        --surface: #241b14;
        --surface-2: #2e2218;
        --line: #4a3728;
        --line-soft: #3a2c20;
        --ink: #f3e9dc;
        --ink-soft: #c7b39d;
        --ink-faint: #93816d;
        --accent: #f0a05c;
        --accent-bg: #3a2712;
        --good: #8fd18f;
        --good-bg: #1e2f1c;
        --warn: #f4cf6b;
        --warn-bg: #3a3113;
        --bad: #f4897c;
        --bad-bg: #3a1e19;

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
        color: var(--ink);
        font-family: var(--font-body);
        font-size: 16px;
        line-height: 1.8;
        -webkit-font-smoothing: antialiased;
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

    :focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        * {
            transition: none !important;
            animation: none !important;
        }
    }
`;
