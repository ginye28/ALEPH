import { css } from "@emotion/react";

export const layout = css`
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: clamp(14px, 2vw, 22px) clamp(14px, 2.4vw, 28px);
    width: 100%;
    height: 100%;
    overflow: hidden;
`;

export const header = css`
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 14px;
    flex-shrink: 0;
    flex-wrap: wrap;
`;

export const titleBox = css`
    & > h1 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 6px;
        font-size: clamp(18px, 2.2vw, 26px);
        color: transparent;
        -webkit-text-fill-color: transparent;
        background: linear-gradient(90deg, rgba(115, 10, 36, 1) 0%, rgba(131, 166, 109, 1) 100%);
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

    & > p {
        margin: 0;
        font-size: 13px;
        color: #9c9c9c;
        cursor: default;
    }
`;

export const headerRight = css`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
`;

export const toggleRow = css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
`;

export const toggleButton = (isOn) => css`
    box-sizing: border-box;
    border: 1px solid ${isOn ? "#83a66d" : "#3a3a3a"};
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 11px;
    color: ${isOn ? "#b6d49c" : "#8f8f8f"};
    background-color: ${isOn ? "#1d241a" : "#171717"};
    cursor: pointer;

    &:hover:not(:disabled) {
        border-color: ${isOn ? "#9dbd84" : "#5c5c5c"};
    }

    &:disabled {
        opacity: 0.45;
        cursor: default;
    }

    &:focus-visible {
        outline: 2px solid #83a66d;
        outline-offset: 2px;
    }
`;

export const timerBox = (isWarning) => css`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    box-sizing: border-box;
    border: 1px solid ${isWarning ? "#c8544f" : "#3a3a3a"};
    border-radius: 8px;
    padding: 7px 14px;
    min-width: 200px;
    background-color: ${isWarning ? "#2a1517" : "#191919"};
    color: ${isWarning ? "#e8837e" : "#c5c5c5"};
`;

export const timerLabel = css`
    font-size: 11px;
    letter-spacing: 0.1em;
    color: inherit;
    opacity: 0.75;
`;

export const timerValue = css`
    font-size: clamp(20px, 2.4vw, 26px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: inherit;
`;

export const timerMeta = css`
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: #8f8f8f;
`;

export const main = css`
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    flex: 1;
    min-height: 0;
    padding: 14px 0 0;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
`;

export const playArea = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
`;

export const board = (columns) => {
    const narrowColumns = Math.ceil(columns / 2);
    return css`
        display: grid;
        grid-template-columns: repeat(${columns}, minmax(0, 1fr));
        gap: clamp(6px, 0.9vw, 12px);
        box-sizing: border-box;
        width: 100%;
        max-width: ${columns * 122}px;

        @media (max-width: 900px) {
            grid-template-columns: repeat(${narrowColumns}, minmax(0, 1fr));
            max-width: ${narrowColumns * 122}px;
        }
    `;
};

export const noteBar = (hasNote) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-sizing: border-box;
    margin: 0;
    border: 1px solid ${hasNote ? "#4d7a5f" : "#2c2c2c"};
    border-radius: 8px;
    padding: 8px 14px;
    width: 100%;
    max-width: 760px;
    min-height: 38px;
    font-size: 13px;
    line-height: 1.4;
    text-align: center;
    color: ${hasNote ? "#a9c4b3" : "#6f6f6f"};
    background-color: ${hasNote ? "#17241c" : "#141414"};
`;

export const comboTag = css`
    flex-shrink: 0;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 12px;
    font-weight: 600;
    color: #17241c;
    background-color: #8fd1a8;
`;

export const panel = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    box-sizing: border-box;
    width: 100%;
    max-width: 660px;
`;

const RESULT_TONE = {
    success: { border: "#4d7a5f", background: "#17241c", title: "#8fd1a8", body: "#a9c4b3" },
    fail: { border: "#8a3f3b", background: "#251616", title: "#e8837e", body: "#c8a5a3" },
    ready: { border: "#3a3a3a", background: "#191919", title: "#c5c5c5", body: "#8f8f8f" },
};

export const result = (tone) => {
    const color = RESULT_TONE[tone] ?? RESULT_TONE.ready;
    return css`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        box-sizing: border-box;
        border: 1px solid ${color.border};
        border-radius: 10px;
        padding: 16px 22px;
        width: 100%;
        background-color: ${color.background};
        text-align: center;

        & > strong {
            font-size: clamp(19px, 2.2vw, 24px);
            font-weight: 600;
            color: ${color.title};
        }

        & > p {
            margin: 0;
            font-size: 14px;
            line-height: 1.6;
            color: ${color.body};
        }
    `;
};

export const difficultyBox = css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
`;

export const sectionTitle = css`
    font-size: 12px;
    letter-spacing: 0.1em;
    color: #8f8f8f;
`;

export const difficultyOptions = css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 720px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

export const difficultyButton = (isSelected) => css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    box-sizing: border-box;
    border: 1px solid ${isSelected ? "#83a66d" : "#3a3a3a"};
    border-radius: 8px;
    padding: 11px 13px;
    background-color: ${isSelected ? "#1d241a" : "#171717"};
    text-align: left;
    cursor: pointer;

    & > strong {
        font-size: 14px;
        font-weight: 600;
        color: ${isSelected ? "#b6d49c" : "#c5c5c5"};
    }

    & > span {
        font-size: 12px;
        line-height: 1.4;
        word-break: keep-all;
        color: ${isSelected ? "#8fa87c" : "#8f8f8f"};
    }

    & > em {
        font-size: 11px;
        font-style: normal;
        font-variant-numeric: tabular-nums;
        color: ${isSelected ? "#7d9a6b" : "#6f6f6f"};
    }

    &:hover {
        border-color: ${isSelected ? "#9dbd84" : "#5c5c5c"};
    }

    &:focus-visible {
        outline: 2px solid #83a66d;
        outline-offset: 2px;
    }
`;

export const startButton = css`
    box-sizing: border-box;
    border: 1px solid #83a66d;
    border-radius: 8px;
    padding: 12px 38px;
    font-size: 16px;
    font-weight: 600;
    color: #c9e0b6;
    background-color: #1d241a;
    cursor: pointer;

    &:hover {
        background-color: #253022;
    }

    &:focus-visible {
        outline: 2px solid #83a66d;
        outline-offset: 3px;
    }
`;

export const logHead = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    width: 100%;
`;

export const logActions = css`
    display: flex;
    gap: 6px;
`;

export const miniButton = css`
    box-sizing: border-box;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 11px;
    color: #b9b9b9;
    background-color: #171717;
    cursor: pointer;

    &:hover {
        border-color: #5c5c5c;
    }

    &:focus-visible {
        outline: 2px solid #83a66d;
        outline-offset: 2px;
    }
`;

export const logScroll = css`
    box-sizing: border-box;
    border: 1px solid #2c2c2c;
    border-radius: 8px;
    width: 100%;
    max-height: 320px;
    overflow-y: auto;
    overflow-x: auto;
`;

export const logTable = css`
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: #c5c5c5;

    & th, & td {
        border-bottom: 1px solid #262626;
        padding: 7px 10px;
        text-align: left;
        white-space: nowrap;
    }

    & th {
        position: sticky;
        top: 0;
        font-weight: 600;
        color: #8f8f8f;
        background-color: #161616;
    }

    & tbody tr:last-of-type td {
        border-bottom: none;
    }
`;

export const resultCell = (isSuccess) => css`
    font-weight: 600;
    color: ${isSuccess ? "#8fd1a8" : "#e8837e"};
`;

export const hint = css`
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #7a7a7a;
    text-align: center;
`;
