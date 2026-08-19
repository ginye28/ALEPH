export const TIME_LIMIT_MS = 30000;

export const WARNING_MS = 5000;

export const OSI_LAYERS = [
    { level: 1, name: "물리", note: "케이블과 전기 신호로 비트를 실어 나릅니다." },
    { level: 2, name: "데이터 링크", note: "MAC 주소로 같은 망 안에서 프레임을 전달합니다." },
    { level: 3, name: "네트워크", note: "IP 주소로 목적지까지 경로를 정합니다." },
    { level: 4, name: "전송", note: "TCP·UDP로 종단 간 연결과 신뢰성을 맡습니다." },
    { level: 5, name: "세션", note: "연결을 열고 유지하고 끊는 단계입니다." },
    { level: 6, name: "표현", note: "암호화·압축·인코딩을 처리합니다." },
    { level: 7, name: "응용", note: "HTTP·DNS 같은 서비스가 직접 동작합니다." },
];

export const WELL_KNOWN_PORTS = [
    { port: 80, service: "HTTP", note: "암호화되지 않은 웹 통신이라 가로채기에 취약합니다." },
    { port: 8080, service: "TOMCAT", note: "톰캣 서버가 기본으로 여는 포트입니다." },
    { port: 5173, service: "Vite", note: "Vite 개발 서버의 기본 포트입니다." },
    { port: 443, service: "HTTPS", note: "TLS로 암호화된 웹 통신에 씁니다." },
    { port: 21, service: "FTP", note: "파일 전송용이지만 평문이라 SFTP를 권합니다." },
    { port: 22, service: "SSH", note: "암호화된 원격 접속과 파일 전송에 씁니다." },
    { port: 53, service: "DNS", note: "도메인 이름을 IP 주소로 바꿔 줍니다." },
    { port: 3306, service: "MySQL", note: "MySQL 접속 포트라 외부 공개를 피해야 합니다." },
];

const pickNumbers = (count) => {
    let pool = [];
    while (pool.length < count) {
        const num = Math.floor(Math.random() * 9) + 1;
        if (pool.includes(num)) {
            continue;
        }
        pool = [...pool, num];
    }
    return pool;
};

const shuffle = (list) => {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ result[i], result[j] ] = [ result[j], result[i] ];
    }
    return result;
};

export const DIFFICULTIES = {
    basic: {
        key: "basic",
        label: "1단계",
        name: "숫자 맞추기",
        rule: "같은 숫자 카드 두 장을 찾으세요.",
        columns: 6,
        timeLimitMs: TIME_LIMIT_MS,
        createSeeds: () => pickNumbers(6).flatMap(num => ([
            { pairKey: `num-${num}`, label: `${num}`, sub: "", note: "" },
            { pairKey: `num-${num}`, label: `${num}`, sub: "", note: "" },
        ])),
    },
    osi: {
        key: "osi",
        label: "2단계",
        name: "OSI 7계층",
        rule: "계층 이름과 계층 번호를 짝지으세요.",
        columns: 7,
        timeLimitMs: TIME_LIMIT_MS,
        createSeeds: () => OSI_LAYERS.flatMap(layer => ([
            {
                pairKey: `osi-${layer.level}`,
                label: layer.name,
                sub: "계층 이름",
                note: `${layer.level}계층 ${layer.name} · ${layer.note}`,
            },
            {
                pairKey: `osi-${layer.level}`,
                label: `${layer.level}계층`,
                sub: "계층 번호",
                note: `${layer.level}계층 ${layer.name} · ${layer.note}`,
            },
        ])),
    },
    port: {
        key: "port",
        label: "3단계",
        name: "포트 번호",
        rule: "포트 번호와 서비스 이름을 짝지으세요.",
        columns: 8,
        timeLimitMs: TIME_LIMIT_MS,
        createSeeds: () => WELL_KNOWN_PORTS.flatMap(item => ([
            {
                pairKey: `port-${item.port}`,
                label: `${item.port}`,
                sub: "포트",
                note: `${item.port} · ${item.service} — ${item.note}`,
            },
            {
                pairKey: `port-${item.port}`,
                label: item.service,
                sub: "서비스",
                note: `${item.port} · ${item.service} — ${item.note}`,
            },
        ])),
    },
};

export const DIFFICULTY_LIST = [ DIFFICULTIES.basic, DIFFICULTIES.osi, DIFFICULTIES.port ];

export const createDeck = (difficulty) =>
    shuffle(difficulty.createSeeds()).map((seed, index) => ({
        id: index + 1,
        pairKey: seed.pairKey,
        label: seed.label,
        sub: seed.sub,
        note: seed.note,
        isOpen: false,
        isAnswer: false,
    }));
