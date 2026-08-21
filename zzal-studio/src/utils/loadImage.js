const ALLOWED_TYPES = ["image/png", "image/jpeg"];
const MAX_BYTES = 15 * 1024 * 1024;

// 모바일에서 큰 이미지를 그대로 들고 있으면 메모리가 터집니다.
const MAX_SOURCE_WIDTH = 2160;

/**
 * 실패해도 호출부가 기존 상태를 건드리지 않도록 결과만 돌려줍니다.
 * ok가 참일 때만 상태를 교체하는 것이 이 모듈의 계약입니다.
 */
export const loadImage = async (file) => {
    if (!file) {
        return { ok: false, reason: "이미지 파일을 찾지 못했습니다." };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { ok: false, reason: "PNG 또는 JPEG 파일만 불러올 수 있습니다." };
    }

    if (file.size > MAX_BYTES) {
        return { ok: false, reason: "15MB 이하 파일만 불러올 수 있습니다." };
    }

    try {
        // 디코딩에 실패하면 확장자만 바꾼 위장 파일입니다.
        let bitmap = await createImageBitmap(file);

        if (bitmap.width > MAX_SOURCE_WIDTH) {
            const resized = await createImageBitmap(bitmap, { resizeWidth: MAX_SOURCE_WIDTH });
            bitmap.close?.();
            bitmap = resized;
        }

        // 캔버스에 다시 그려 인코딩하는 순간 EXIF·GPS 정보는 승계되지 않습니다.
        // 내려받은 결과물에 위치 정보가 남을 수 없는 근거가 여기입니다.
        return { ok: true, bitmap, name: file.name };
    } catch {
        return { ok: false, reason: "이미지를 읽지 못했습니다. 파일이 손상됐을 수 있습니다." };
    }
};
