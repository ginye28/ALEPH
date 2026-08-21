import {
    IMAGE_FITS,
    MAX_SIZE_RATIO,
    MIN_SIZE_RATIO,
    SCHEMA_VERSION,
    TEXT_ALIGNS,
    TRANSPARENT,
    createDefaultComposition,
} from "../constants/defaults";
import { RATIO_IDS } from "../render/ratios";

export const APP_ID = "zzal-studio";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const isHexColor = (value) => typeof value === "string" && HEX_COLOR.test(value);
const isRatioValue = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const fail = (reason) => ({ ok: false, reason });

const pickNumber = (value, fallback, min, max) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(Math.max(value, min), max);
};

/**
 * 항목 하나를 검사합니다. 검사 순서가 곧 거부 사유의 순서입니다.
 * 3 필수 항목 · 4 값 범위 · 5 색상 형식
 */
export const sanitizeTemplate = (raw, label) => {
    const where = label ? `${label} ` : "";

    if (!isObject(raw)) {
        return fail(`${where}템플릿 형태가 올바르지 않습니다.`);
    }

    // 3. 필수 항목
    if (typeof raw.name !== "string" || raw.name.trim() === "") {
        return fail(`${where}필수 항목이 빠졌습니다. (이름)`);
    }
    if (!RATIO_IDS.includes(raw.ratio)) {
        return fail(`${where}필수 항목이 빠졌습니다. (화면비)`);
    }
    if (!isObject(raw.text) || typeof raw.text.content !== "string") {
        return fail(`${where}필수 항목이 빠졌습니다. (문구)`);
    }

    // 4. 값 범위
    if (!isRatioValue(raw.text.x) || !isRatioValue(raw.text.y)) {
        return fail(`${where}값의 범위가 올바르지 않습니다. (문구 위치)`);
    }
    if (!isRatioValue(raw.text.sizeRatio)) {
        return fail(`${where}값의 범위가 올바르지 않습니다. (글자 크기)`);
    }

    // 5. 색상 형식
    if (!isHexColor(raw.text.color)) {
        return fail(`${where}색상 값이 올바르지 않습니다. (문구 색)`);
    }
    if (raw.background !== TRANSPARENT && !isHexColor(raw.background)) {
        return fail(`${where}색상 값이 올바르지 않습니다. (배경)`);
    }

    const defaults = createDefaultComposition();
    const stroke = isObject(raw.text.stroke) ? raw.text.stroke : defaults.text.stroke;
    const box = isObject(raw.text.box) ? raw.text.box : defaults.text.box;
    const image = isObject(raw.image) ? raw.image : defaults.image;

    return {
        ok: true,
        value: {
            version: SCHEMA_VERSION,
            id: typeof raw.id === "string" && raw.id ? raw.id : null,
            name: raw.name.trim().slice(0, 40),

            ratio: raw.ratio,
            background: raw.background,

            image: {
                fit: IMAGE_FITS.includes(image.fit) ? image.fit : defaults.image.fit,
                offsetX: pickNumber(image.offsetX, defaults.image.offsetX, 0, 1),
                offsetY: pickNumber(image.offsetY, defaults.image.offsetY, 0, 1),
                scale: pickNumber(image.scale, defaults.image.scale, 0.2, 3),
            },

            text: {
                content: raw.text.content,
                x: raw.text.x,
                y: raw.text.y,
                align: TEXT_ALIGNS.includes(raw.text.align) ? raw.text.align : defaults.text.align,
                sizeRatio: Math.min(Math.max(raw.text.sizeRatio, MIN_SIZE_RATIO), MAX_SIZE_RATIO),
                maxWidthRatio: pickNumber(raw.text.maxWidthRatio, defaults.text.maxWidthRatio, 0.2, 1),
                lineHeight: pickNumber(raw.text.lineHeight, defaults.text.lineHeight, 0.8, 2.5),
                color: raw.text.color,
                stroke: {
                    color: isHexColor(stroke.color) ? stroke.color : defaults.text.stroke.color,
                    widthRatio: pickNumber(stroke.widthRatio, defaults.text.stroke.widthRatio, 0, 0.05),
                },
                box: {
                    color: isHexColor(box.color) ? box.color : defaults.text.box.color,
                    opacity: pickNumber(box.opacity, defaults.text.box.opacity, 0, 1),
                    paddingRatio: pickNumber(box.paddingRatio, defaults.text.box.paddingRatio, 0, 0.1),
                },
            },
        },
    };
};

/**
 * 가져오기 방어. 하나라도 실패하면 아무것도 저장하지 않고 사유만 돌려줍니다.
 * 부분 반영이 곧 데이터 유실이기 때문입니다.
 */
export const parseImportFile = (rawText) => {
    let parsed;

    // 1. 문법
    try {
        parsed = JSON.parse(rawText);
    } catch {
        return fail("파일 형식이 올바르지 않습니다. (JSON 문법 오류)");
    }

    // 2. 최상위 형태
    if (!isObject(parsed) || !Array.isArray(parsed.items)) {
        return fail("템플릿 파일이 아닙니다.");
    }
    if (parsed.items.length === 0) {
        return fail("템플릿 파일에 항목이 없습니다.");
    }

    // 3~5. 전부 통과한 뒤에 한 번에 교체합니다.
    const items = [];
    for (let index = 0; index < parsed.items.length; index += 1) {
        const result = sanitizeTemplate(parsed.items[index], `${index + 1}번째 템플릿의`);
        if (!result.ok) {
            return fail(result.reason);
        }
        items.push(result.value);
    }

    return { ok: true, items };
};

export const createExportPayload = (items) => ({
    app: APP_ID,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    items,
});
