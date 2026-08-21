import { JPEG_FALLBACK_BACKGROUND, TRANSPARENT } from "../constants/defaults";
import { renderComposition } from "../render/composition";
import { getRatio } from "../render/ratios";

export const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // 메모리가 새지 않도록 되돌려 줍니다.
    URL.revokeObjectURL(url);
};

export const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    downloadBlob(blob, filename);
};

const toBlob = (canvas, type, quality) =>
    new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
    });

const stamp = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return (
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    );
};

/**
 * 내보내기 절차 — 순서가 곧 통과 기준입니다.
 * 1 글꼴 대기 · 2 이미지 확인 · 3 렌더 1회 · 4 toBlob · 5 크기 0 검사 · 6 내려받기
 */
export const exportComposition = async ({ composition, bitmap, format }) => {
    const ratio = getRatio(composition.ratio);
    const isJpeg = format === "jpeg";

    try {
        // 1. 웹폰트가 로드되기 전에 그리면 파일만 다른 글꼴로 저장됩니다.
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        // 2. 이미지 디코딩이 끝난 비트맵만 넘어옵니다(loadImage가 보장).
        const canvas = document.createElement("canvas");
        canvas.width = ratio.width;
        canvas.height = ratio.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return { ok: false, reason: "캔버스를 준비하지 못했습니다." };
        }

        // 3. 미리보기와 똑같은 함수로 한 번만 그립니다.
        //    JPEG는 알파가 없으므로 투명 배경을 흰색으로 합성합니다.
        const background =
            isJpeg && composition.background === TRANSPARENT
                ? JPEG_FALLBACK_BACKGROUND
                : composition.background;

        renderComposition(ctx, { ...composition, background, bitmap }, {
            w: ratio.width,
            h: ratio.height,
        });

        // 4. 저장 형식과 확장자를 한 곳에서 맞춥니다.
        const type = isJpeg ? "image/jpeg" : "image/png";
        const extension = isJpeg ? "jpg" : "png";
        const blob = await toBlob(canvas, type, isJpeg ? 0.92 : undefined);

        // 5. 크기가 0이면 열리지 않는 파일입니다. 내려보내지 않습니다.
        if (!blob || blob.size === 0) {
            return { ok: false, reason: "이미지를 만들지 못했습니다. 다시 시도해 주세요." };
        }

        // 6. 내려받고 objectURL을 해제합니다.
        const filename = `zzal-${ratio.id.replace(":", "x")}-${stamp()}.${extension}`;
        downloadBlob(blob, filename);

        return { ok: true, filename, size: blob.size };
    } catch {
        return { ok: false, reason: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." };
    }
};
