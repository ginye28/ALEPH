import { css } from "@emotion/react";
import * as c from "../../styles/controls";

export const downloadButton = css`
    ${c.primaryButton};
    padding: 13px 16px;
    width: 100%;
    font-size: 15px;
`;

export const divider = css`
    border-top: 1px solid var(--line-soft);
`;

export const hiddenInput = css`
    display: none;
`;
