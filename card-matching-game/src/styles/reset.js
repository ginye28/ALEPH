import { css } from "@emotion/react";

export const reset = css`
    html, body, #root {
        margin: 0;
        height: 100vh;
        background: radial-gradient(circle,rgba(6, 10, 84, 1) 0%, rgba(2, 2, 36, 1) 100%);
        overflow-y: auto;
    }
`;