import { css } from "@emotion/react";

export const reset = css`
    :root {
        --ground: #151218;
        --surface: #1d1922;
        --surface-2: #251f2b;
        --line: #332b39;
        --line-soft: #292231;
        --ink: #ede6ec;
        --ink-soft: #a99ea9;
        --ink-faint: #7c7280;
        --accent: #ff6ea0;
        --accent-ink: #2b0f1b;
        --accent-bg: #2e1725;
        --good: #5fc6c9;
        --good-bg: #14282c;
        --warn: #ffb454;
        --warn-bg: #33240f;

        --font-body: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
        --font-display: "Gothic A1", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
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
        font-size: 15px;
        line-height: 1.65;
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
