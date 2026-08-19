import { css } from "@emotion/react";

export const layout = css`
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    padding: clamp(8px, 2vw, 20px);
    width: 100%;
    min-height: 100%;
`;

export const container = css`
    box-sizing: border-box;
    border-radius: 8px;
    padding: clamp(10px, 1.4vw, 20px);
    width: min(1200px, 100%);
    height: min(700px, calc(100vh - 40px));
    min-height: 520px;
    background-color: #111111;
    box-shadow: 0 0 20px 10px #000000aa;
`;

export const containerBorder = css`
    box-sizing: border-box;
    border: 2px solid #63782f44;
    border-radius: 8px;
    width: 100%;
    height: 100%;
`;
