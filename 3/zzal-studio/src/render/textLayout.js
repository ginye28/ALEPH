// 한글은 공백 단어 경계가 드물어 단어 단위 줄바꿈이 통하지 않고,
// 이모지는 코드 유닛으로 자르면 깨집니다. 그래서 grapheme 단위로 다룹니다.
const segmenter =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter("ko", { granularity: "grapheme" })
        : null;

// ZWJ 결합 이모지(👨‍👩‍👧), 피부톤 변형자, 조합형 한글이 쪼개지지 않습니다.
export const toGraphemes = (text) => {
    if (segmenter) {
        return Array.from(segmenter.segment(text), (part) => part.segment);
    }
    // Intl.Segmenter가 없는 환경에서도 서로게이트 쌍은 지켜집니다.
    return Array.from(text);
};

const wrapParagraph = (ctx, paragraph, maxWidth) => {
    if (paragraph === "") {
        return [""];
    }

    const lines = [];
    let current = "";

    toGraphemes(paragraph).forEach((grapheme) => {
        const next = current + grapheme;
        // 한 글자도 못 담는 폭이면 그 글자만 한 줄에 둡니다(무한 루프 방지).
        if (current !== "" && ctx.measureText(next).width > maxWidth) {
            lines.push(current);
            current = grapheme;
            return;
        }
        current = next;
    });

    lines.push(current);
    return lines;
};

const buildLines = (ctx, paragraphs, maxWidth) =>
    paragraphs.flatMap((paragraph) => wrapParagraph(ctx, paragraph, maxWidth));

/**
 * 줄바꿈 + 자동 축소를 함께 계산합니다.
 * 넘치면 말줄임(…)이 아니라 글자 크기를 줄입니다 — 잘림은 결함이기 때문입니다.
 */
export const layoutText = (ctx, content, options) => {
    const {
        fontFamily,
        fontWeight,
        maxWidth,
        maxHeight,
        lineHeight,
        fontSize: initialFontSize,
        minFontSize,
    } = options;

    // 명시적 줄바꿈을 먼저 나눠 입력한 줄 수를 그대로 지킵니다.
    const paragraphs = content.replace(/\r\n/g, "\n").split("\n");

    let fontSize = initialFontSize;
    let lines;
    let totalHeight;

    for (;;) {
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        lines = buildLines(ctx, paragraphs, maxWidth);
        totalHeight = lines.length * fontSize * lineHeight;

        if (totalHeight <= maxHeight || fontSize <= minFontSize) {
            break;
        }
        fontSize = Math.max(minFontSize, fontSize * 0.98);
    }

    return {
        lines,
        fontSize,
        lineHeightPx: fontSize * lineHeight,
        totalHeight,
    };
};
