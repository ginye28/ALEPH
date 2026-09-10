import { css } from "@emotion/react";

export const reset = css`
    :root {
        --ground: #101418;
        --surface: #171c22;
        --surface-2: #1e242c;
        --line: #2b333d;
        --line-soft: #232a32;
        --ink: #e6ecf2;
        --ink-soft: #9aa7b4;
        --ink-faint: #6d7986;
        --accent: #4cc2ff;
        --accent-bg: #102b3a;
        --good: #56d6a0;
        --good-bg: #122c22;
        --warn: #ffb454;
        --warn-bg: #33240f;
        --bad: #ff7a7a;
        --bad-bg: #331717;

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
