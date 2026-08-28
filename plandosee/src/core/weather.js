const BUSAN = { latitude: 35.1796, longitude: 129.0756 };

// WMO 날씨 코드 → 한글 설명 · 아이콘. Open-Meteo 문서의 코드표에서 자주 나오는 것만 옮겼습니다.
const CODE_MAP = {
    0: ["맑음", "☀️"],
    1: ["대체로 맑음", "🌤️"],
    2: ["구름 조금", "⛅"],
    3: ["흐림", "☁️"],
    45: ["안개", "🌫️"],
    48: ["안개", "🌫️"],
    51: ["약한 이슬비", "🌦️"],
    53: ["이슬비", "🌦️"],
    55: ["강한 이슬비", "🌦️"],
    61: ["약한 비", "🌧️"],
    63: ["비", "🌧️"],
    65: ["강한 비", "🌧️"],
    71: ["약한 눈", "🌨️"],
    73: ["눈", "🌨️"],
    75: ["강한 눈", "🌨️"],
    80: ["소나기", "🌦️"],
    81: ["소나기", "🌦️"],
    82: ["강한 소나기", "⛈️"],
    95: ["뇌우", "⛈️"],
    96: ["뇌우 · 우박", "⛈️"],
    99: ["뇌우 · 우박", "⛈️"],
};

/**
 * 부산 현재 날씨. 키가 필요 없는 공개 API(Open-Meteo)를 브라우저에서 바로 부릅니다 —
 * "서버 없이 브라우저에서만 동작한다"는 이 프로젝트의 설계 원칙과 맞습니다.
 *
 * 실패하면 null을 돌려줍니다. 화면은 그때 배지를 아예 빼고, 지어낸 값을 보여주지 않습니다.
 */
export const fetchBusanWeather = async () => {
    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${BUSAN.latitude}&longitude=${BUSAN.longitude}` +
        `&current=temperature_2m,weather_code&timezone=Asia%2FSeoul`;

    try {
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        const temp = data?.current?.temperature_2m;
        if (typeof temp !== "number") return null;

        const [label, icon] = CODE_MAP[data?.current?.weather_code] ?? ["-", "🌡️"];
        return { temp: Math.round(temp), label, icon };
    } catch {
        return null;
    }
};
