import { DEFAULT_RATIO_ID } from "../render/ratios";

export const SCHEMA_VERSION = 1;

// 배경을 "투명"으로 두면 PNG는 투명을 유지하고,
// 알파가 없는 JPEG는 저장 직전에 흰색으로 합성합니다.
export const TRANSPARENT = "transparent";
export const JPEG_FALLBACK_BACKGROUND = "#FFFFFF";

// 캔버스에 그릴 때 쓰는 글꼴. 대체 글꼴까지 전부 명시해
// 이모지 폴백이 조용히 달라지는 것을 막습니다.
export const FONT_STACK =
    "'Gothic A1', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";

export const FONT_WEIGHT = 900;

// 문구 블록이 캔버스 안에 반드시 머무는 안전 영역 비율입니다.
export const SAFE_HEIGHT_RATIO = 0.94;
export const MIN_SIZE_RATIO = 0.03;
export const MAX_SIZE_RATIO = 0.24;

export const TEXT_ALIGNS = ["left", "center", "right"];
export const IMAGE_FITS = ["cover", "contain"];

// 편집 상태와 템플릿은 같은 모양입니다. 변환 단계가 없으므로
// "저장했더니 복원이 다르게 되는" 경로가 생기지 않습니다.
export const createDefaultComposition = () => ({
    version: SCHEMA_VERSION,
    id: null,
    name: "새 템플릿",

    ratio: DEFAULT_RATIO_ID,
    background: "#111114",

    image: {
        fit: "cover",
        offsetX: 0.5,
        offsetY: 0.5,
        scale: 1,
    },

    text: {
        content: "여기에 문구를 입력하세요",
        x: 0.5,
        y: 0.85,
        align: "center",
        sizeRatio: 0.08,
        maxWidthRatio: 0.86,
        lineHeight: 1.25,
        color: "#FFFFFF",
        stroke: {
            color: "#000000",
            widthRatio: 0.006,
        },
        // 문구 뒤에 까는 띠. 불투명도 0이면 그리지 않습니다.
        box: {
            color: "#000000",
            opacity: 0,
            paddingRatio: 0.02,
        },
    },
});
