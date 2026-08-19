import { css } from "@emotion/react";

export const layout = css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;

    & > header {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
        & > h1 {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 50px;
            color: transparent;
            -webkit-text-fill-color: transparent;
            background: linear-gradient(90deg,rgba(115, 10, 36, 1) 0%, rgba(131, 166, 109, 1) 100%);    
            background-clip: text;
            -webkit-background-clip: text;
            cursor: default;

            & svg:nth-of-type(1) {
                color: #882431;
            }
            & svg:nth-last-of-type(1) {
                color: #6ca381;
            }
        }
    }

    & > main {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 40px;
        box-sizing: border-box;
        border-radius: 8px;
        padding: 20px;
        width: 600px;
        height: 250px;
    }
`;

export const usernameInput = css`

    & > input {
        box-sizing: border-box;
        border: none;
        border-radius: 50px;
        outline: none;
        width: 340px;
        height: 50px;
        padding: 0 10px;
        text-align: center;
        font-size: 24px;
        color: #c3c3c3;
        background-color: #272727;
        box-shadow: 0 0 10px #5c5c5c55 inset;
        cursor: pointer;

        &:hover, &:focus {
            box-shadow: 0 0 10px #9c9c9c55 inset;
        }

        &::placeholder {
            color: #c3c3c3;
        }
    }
`;

export const startButton = css`

    & > button {
        border: none;
        width: 340px;
        height: 30px;
        font-size: 40px;
        font-weight: 500;
        text-shadow: 0 0 5px #fafafa44;
        color: #c5c5c5;
        background-color: transparent;
        cursor: pointer;

        &:hover {
            text-shadow: 0 0 10px #fafafa88;
        }

        &:active {
            text-shadow: 0 0 10px #a52954b7;
        }
    }
`;