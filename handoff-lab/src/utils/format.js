export const roundTo = (value, digits) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
};

/** 화면에 찍기 직전 한 번만 반올림합니다. 저장값은 원본 정밀도를 유지합니다. */
export const formatValue = (value, digits = 1) => roundTo(value, digits).toFixed(digits);

/** 변화량은 부호를 함께 보여줍니다. 0은 부호 없이 표기합니다. */
export const formatSigned = (value, digits = 1) => {
    const rounded = roundTo(value, digits);
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded.toFixed(digits)}`;
};
