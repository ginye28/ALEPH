// 화면비 정의 — 가로 폭을 1080으로 고정하면
// 높이 기준인 sizeRatio 하나로 세 비율의 글자 크기가 자연스럽게 스케일됩니다.
export const RATIOS = [
    { id: "1:1", label: "1:1", width: 1080, height: 1080, hint: "정사각 게시물" },
    { id: "4:5", label: "4:5", width: 1080, height: 1350, hint: "세로 게시물" },
    { id: "9:16", label: "9:16", width: 1080, height: 1920, hint: "스토리·릴스" },
];

export const RATIO_IDS = RATIOS.map((ratio) => ratio.id);

export const DEFAULT_RATIO_ID = "4:5";

export const getRatio = (id) =>
    RATIOS.find((ratio) => ratio.id === id) ?? RATIOS.find((ratio) => ratio.id === DEFAULT_RATIO_ID);
