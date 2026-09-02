import { css } from "@emotion/react";

export const page = css`
    max-width: 480px;
    margin: 12vh auto 0;
    padding: 0 24px;

    @media (max-width: 640px) {
        margin-top: 6vh;
        padding: 0 14px;
    }
`;
