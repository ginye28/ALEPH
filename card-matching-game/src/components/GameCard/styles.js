import { css } from "@emotion/react";

export const scene = (isMiss, reducedMotion) => css`
    box-sizing: border-box;
    border: none;
    padding: 0;
    width: 100%;
    aspect-ratio: 3 / 4;
    background-color: transparent;
    perspective: 800px;
    cursor: pointer;
    animation: ${isMiss && !reducedMotion ? "missShake 0.34s ease-in-out" : "none"};

    @keyframes missShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    &:disabled {
        cursor: default;
    }

    &:focus-visible {
        outline: 2px solid #83a66d;
        outline-offset: 4px;
        border-radius: 10px;
    }
`;

export const layout = (isOpen, reducedMotion) => css`
    position: relative;
    border-radius: 8px;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: ${reducedMotion ? "none" : "transform 0.3s ease-in-out"};
    transform: ${isOpen ? "rotateY(180deg)" : "rotateY(0deg)"};

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
`;

export const front = (isAnswer, reducedMotion) => css`
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    border: 2px solid ${isAnswer ? "#6ca381" : "#e8e2d8"};
    border-radius: 8px;
    padding: 4px;
    width: 100%;
    height: 100%;
    background-color: ${isAnswer ? "#e6f0e8" : "#faf7f2"};
    backface-visibility: hidden;
    transform: rotateY(180deg);
    animation: ${isAnswer && !reducedMotion ? "matchedPulse 0.45s ease-out" : "none"};

    @keyframes matchedPulse {
        0% { box-shadow: 0 0 0 0 #6ca38199; }
        100% { box-shadow: 0 0 0 10px #6ca38100; }
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    & > strong {
        font-size: clamp(12px, 1.25vw, 19px);
        font-weight: 600;
        line-height: 1.15;
        text-align: center;
        word-break: keep-all;
        color: ${isAnswer ? "#2f5b43" : "#3a3229"};
    }

    & > span {
        font-size: 10px;
        letter-spacing: 0.03em;
        color: ${isAnswer ? "#5c8a6d" : "#9a8f80"};
    }
`;

export const back = css`
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #7a3a45;
    border-radius: 8px;
    padding: 7px;
    width: 100%;
    height: 100%;
    background-color: #2a1a1e;
    backface-visibility: hidden;
`;

export const pattern = css`
    border-radius: 4px;
    width: 100%;
    height: 100%;
    background-color: #3d232a;
    background-image:
        repeating-linear-gradient(45deg, transparent 0 8px, #83a66d33 8px 9px),
        repeating-linear-gradient(-45deg, transparent 0 8px, #a5295433 8px 9px);
`;
