import {
    FONT_STACK,
    FONT_WEIGHT,
    MIN_SIZE_RATIO,
    SAFE_HEIGHT_RATIO,
    TRANSPARENT,
} from "../constants/defaults";
import { layoutText } from "./textLayout";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const drawImageFitted = (ctx, bitmap, image, w, h) => {
    const baseScale =
        image.fit === "contain"
            ? Math.min(w / bitmap.width, h / bitmap.height)
            : Math.max(w / bitmap.width, h / bitmap.height);

    const scale = baseScale * image.scale;
    const dw = bitmap.width * scale;
    const dh = bitmap.height * scale;

    // cover면 (w - dw)가 음수라 잘라낼 초점이 되고,
    // contain이면 양수라 남는 여백 안에서의 위치가 됩니다. 식은 하나로 충분합니다.
    const dx = (w - dw) * image.offsetX;
    const dy = (h - dh) * image.offsetY;

    ctx.drawImage(bitmap, dx, dy, dw, dh);
};

export const drawText = (ctx, text, w, h) => {
    if (text.content.trim() === "") {
        return;
    }

    const padY = (h * (1 - SAFE_HEIGHT_RATIO)) / 2;
    const padX = padY;

    const { lines, fontSize, lineHeightPx, totalHeight } = layoutText(ctx, text.content, {
        fontFamily: FONT_STACK,
        fontWeight: FONT_WEIGHT,
        fontSize: h * text.sizeRatio,
        minFontSize: h * MIN_SIZE_RATIO,
        maxWidth: w * text.maxWidthRatio,
        maxHeight: h * SAFE_HEIGHT_RATIO,
        lineHeight: text.lineHeight,
    });

    if (lines.length === 0) {
        return;
    }

    const widest = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);

    // 기준점을 안전 영역 안으로 밀어 넣습니다. 축소만으로 버티면
    // 가장자리에 놓은 문구가 지나치게 작아지기 때문에, 위치를 먼저 지킵니다.
    const halfWidth = text.align === "center" ? widest / 2 : 0;
    const leftLimit = text.align === "right" ? padX + widest : padX + halfWidth;
    const rightLimit = text.align === "left" ? w - padX - widest : w - padX - halfWidth;

    const anchorX = leftLimit > rightLimit
        ? w / 2
        : clamp(text.x * w, leftLimit, rightLimit);

    const centerY = clamp(
        text.y * h,
        padY + totalHeight / 2,
        h - padY - totalHeight / 2,
    );

    // 문구 뒤 띠 — 표나 사진 위에 글자를 얹어도 읽히게 합니다.
    const box = text.box;
    if (box && box.opacity > 0) {
        const boxPad = h * box.paddingRatio;
        const left =
            text.align === "center" ? anchorX - widest / 2
            : text.align === "right" ? anchorX - widest
            : anchorX;

        const rect = {
            x: Math.max(0, left - boxPad),
            y: Math.max(0, centerY - totalHeight / 2 - boxPad),
        };
        rect.w = Math.min(w, left + widest + boxPad) - rect.x;
        rect.h = Math.min(h, centerY + totalHeight / 2 + boxPad) - rect.y;

        ctx.save();
        ctx.globalAlpha = box.opacity;
        ctx.fillStyle = box.color;
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(rect.x, rect.y, rect.w, rect.h, boxPad * 0.6);
            ctx.fill();
        } else {
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        }
        ctx.restore();
    }

    ctx.textAlign = text.align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    const strokeWidth = h * text.stroke.widthRatio;
    const firstLineY = centerY - totalHeight / 2 + lineHeightPx / 2;

    lines.forEach((line, index) => {
        const y = firstLineY + index * lineHeightPx;

        if (strokeWidth > 0) {
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = text.stroke.color;
            ctx.strokeText(line, anchorX, y);
        }

        ctx.fillStyle = text.color;
        ctx.fillText(line, anchorX, y);
    });

    return { lines, fontSize };
};

/**
 * 단 하나의 그리기 함수입니다.
 * 미리보기와 내보내기는 size 인자만 다릅니다 — 그래서 결과가 다를 수 없습니다.
 */
export const renderComposition = (ctx, state, size) => {
    const { w, h } = size;

    ctx.clearRect(0, 0, w, h);

    if (state.background && state.background !== TRANSPARENT) {
        ctx.fillStyle = state.background;
        ctx.fillRect(0, 0, w, h);
    }

    if (state.bitmap) {
        drawImageFitted(ctx, state.bitmap, state.image, w, h);
    }

    drawText(ctx, state.text, w, h);
};
