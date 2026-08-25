import { REFERENCE_HOUR, TIMEZONE, dateKeyOfLocalStamp, hourOfLocalStamp } from "../utils/timezone";

/**
 * Open-Meteo 공개 기상 API.
 *
 * 이 출처를 고른 이유 (카드 2):
 *  - 인증키가 필요 없습니다. 그래서 브라우저·배포 파일·네트워크 주소·Git 기록 어디에도
 *    남길 비밀값 자체가 존재하지 않습니다.
 *  - 요청 주소를 그대로 브라우저에 붙여 넣으면 그 자리가 곧 원자료 페이지입니다.
 *    화면의 "출처" 링크와 실제로 호출한 주소가 한 글자도 다르지 않습니다.
 *  - 값의 단위(current_units)와 자료 기준 시각(current.time)을 응답이 직접 알려줍니다.
 */

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

// 서울시청 좌표. 개인 위치가 아니라 공개된 지점을 씁니다 (개인정보 0건).
const LATITUDE = 37.5665;
const LONGITUDE = 126.978;

/** 지난 며칠치를 함께 받아올지. 어제 값을 얻으려고 하루를 기다리지 않아도 되는 이유입니다. */
export const PAST_DAYS = 3;

const buildSourceUrl = () => {
    const params = new URLSearchParams({
        latitude: String(LATITUDE),
        longitude: String(LONGITUDE),
        current: "temperature_2m",
        hourly: "temperature_2m",
        past_days: String(PAST_DAYS),
        forecast_days: "1",
        timezone: TIMEZONE,
    });

    return `${ENDPOINT}?${params.toString()}`;
};

/**
 * 응답을 이 앱이 다루는 단 하나의 형태로 바꿉니다.
 * 기대한 항목이 하나라도 없으면 ok:false를 돌려주고, 호출부는 이것을
 * "응답 형식 변경" 장애로 처리합니다 (카드 3의 다섯 번째 장애).
 */
const normalize = (json) => {
    const missing = [];

    const current = json?.current;
    const units = json?.current_units;
    const hourly = json?.hourly;

    if (typeof current?.temperature_2m !== "number") missing.push("current.temperature_2m");
    if (typeof current?.time !== "string") missing.push("current.time");
    if (typeof units?.temperature_2m !== "string") missing.push("current_units.temperature_2m");
    if (!Array.isArray(hourly?.time)) missing.push("hourly.time");
    if (!Array.isArray(hourly?.temperature_2m)) missing.push("hourly.temperature_2m");

    if (missing.length > 0) {
        return { ok: false, missing };
    }

    if (hourly.time.length !== hourly.temperature_2m.length) {
        return { ok: false, missing: ["hourly.time 과 hourly.temperature_2m 의 길이 불일치"] };
    }

    return {
        ok: true,
        value: current.temperature_2m,
        unit: units.temperature_2m,
        observedAt: current.time,
        series: pickDailySeries(hourly, current.time),
    };
};

/**
 * 시간별 배열에서 기준 시각(09시) 값만 하루에 하나씩 골라냅니다.
 * 두 날짜를 같은 시각끼리 비교해야 변화량이 의미를 갖습니다 (카드 5).
 */
const pickDailySeries = (hourly, currentStamp) => {
    const series = [];

    hourly.time.forEach((stamp, index) => {
        if (hourOfLocalStamp(stamp) !== REFERENCE_HOUR) {
            return;
        }

        // 두 문자열 모두 "YYYY-MM-DDTHH:mm" 형태의 현지 시각이므로 사전순 비교가 곧 시간순 비교입니다.
        // 아직 오지 않은 시각의 값은 관측이 아니라 예보이므로 기록하지 않습니다.
        if (stamp > currentStamp) {
            return;
        }

        const value = hourly.temperature_2m[index];
        if (typeof value !== "number") {
            // 결측치는 건너뜁니다. 없는 값을 있는 것처럼 채우지 않습니다.
            return;
        }

        series.push({ dateKey: dateKeyOfLocalStamp(stamp), observedAt: stamp, value });
    });

    return series;
};

export const provider = {
    key: "weather-openmeteo-seoul",
    label: "서울 현재 기온",
    purpose: "이 정보판은 서울의 기온이 어제와 얼마나 달라졌는지 확인하기 위한 것이다.",
    sourceName: "Open-Meteo 공개 기상 API",
    sourceNote: "인증키 없이 열람할 수 있는 공개 주소입니다.",
    digits: 1,
    buildSourceUrl,
    normalize,
};
