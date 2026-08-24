import { css } from "@emotion/react";

// 장애가 서로 다른 상태로 "보이려면" 문구뿐 아니라 색도 달라야 합니다.
const TONES = {
    ok: { fg: "var(--good)", bg: "var(--good-bg)" },
    stale: { fg: "var(--warn)", bg: "var(--warn-bg)" },
    empty: { fg: "var(--bad)", bg: "var(--bad-bg)" },
    loading: { fg: "var(--ink-soft)", bg: "var(--surface-2)" },
};

export const badge = (tone) => {
    const { fg, bg } = TONES[tone] ?? TONES.loading;

    return css`
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 11px;
        border: 1px solid ${fg};
        border-radius: 999px;
        background: ${bg};
        color: ${fg};
        font-size: 12.5px;
        font-weight: 700;
        white-space: nowrap;
    `;
};

export const dot = (tone) => {
    const { fg } = TONES[tone] ?? TONES.loading;

    return css`
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${fg};
        flex: none;
    `;
};

export const text = css`
    letter-spacing: -0.01em;
`;

export const srOnly = css`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
`;
