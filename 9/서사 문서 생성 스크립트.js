const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    WidthType, BorderStyle, ShadingType, AlignmentType, ExternalHyperlink,
    LevelFormat, convertInchesToTwip,
} = require("docx");
const fs = require("fs");

const FONT = "Malgun Gothic";
const INK = "17191C";
const SOFT = "5A6169";
const ACCENT = "0E5A86";
const PLACEHOLDER_BG = "FDF4E3";
const PLACEHOLDER_INK = "8A5A00";
const RULE = "C9CFD5";

const body = (text, opts = {}) => new TextRun({ text, font: FONT, size: 21, color: INK, ...opts });
const soft = (text, opts = {}) => new TextRun({ text, font: FONT, size: 20, color: SOFT, italics: true, ...opts });

const p = (children, opts = {}) => new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { after: 160, ...(opts.spacing || {}) },
    ...opts,
});

const h1 = (text) => new Paragraph({
    text, heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 200 },
});
const h2 = (text) => new Paragraph({
    text, heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
});
const h3 = (text) => new Paragraph({
    text, heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 120 },
});

const rule = () => new Paragraph({
    text: "", spacing: { before: 100, after: 200 },
    border: { bottom: { color: RULE, space: 4, style: BorderStyle.SINGLE, size: 6 } },
});

/** 학생이 직접 채워야 하는 자리 — 눈에 띄게 표시한다. */
const placeholder = (text) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: PLACEHOLDER_BG },
    spacing: { before: 80, after: 200 },
    indent: { left: 260 },
    children: [new TextRun({ text, font: FONT, size: 20, color: PLACEHOLDER_INK, bold: true })],
});

/** 인용/이야기 초안처럼 들여쓴 문단. */
const quote = (text) => new Paragraph({
    indent: { left: 260 },
    spacing: { after: 160 },
    border: { left: { color: ACCENT, space: 8, style: BorderStyle.SINGLE, size: 12 } },
    children: [body(text)],
});

const bullet = (children) => new Paragraph({
    children: Array.isArray(children) ? children : [children],
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 120 },
});

const numbered = (children) => new Paragraph({
    children: Array.isArray(children) ? children : [children],
    numbering: { reference: "ordered", level: 0 },
    spacing: { after: 120 },
});

const link = (text, url) => new ExternalHyperlink({
    link: url,
    children: [new TextRun({ text, font: FONT, size: 21, color: ACCENT, underline: {} })],
});

/* ── 표 ── */
const cellWidths = (dxa) => dxa;
function cell(children, { width, header = false, shadeFill } = {}) {
    return new TableCell({
        width: { size: width, type: WidthType.DXA },
        shading: shadeFill ? { type: ShadingType.CLEAR, fill: shadeFill } : undefined,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: (Array.isArray(children) ? children : [children]).map((c) =>
            c instanceof Paragraph ? c : new Paragraph({
                children: Array.isArray(c) ? c : [c],
                spacing: { after: 0 },
            }),
        ),
    });
}
function table(widths, rows, headerRow = null) {
    const total = widths.reduce((a, b) => a + b, 0);
    const trs = [];
    if (headerRow) {
        trs.push(new TableRow({
            tableHeader: true,
            children: headerRow.map((text, i) => cell(
                [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 20, bold: true, color: "FFFFFF" })] })],
                { width: widths[i], shadeFill: ACCENT },
            )),
        }));
    }
    for (const row of rows) {
        trs.push(new TableRow({
            children: row.map((content, i) => cell(content, { width: widths[i] })),
        }));
    }
    return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: trs });
}

const U = "https://aleph-pds-auth.vercel.app";
const T8 = "https://aleph-passkey.vercel.app";
const T6 = "https://aleph-pds.vercel.app";
const T2 = "https://aleph-gilt.vercel.app";
const T3 = "https://aleph-zzal.vercel.app";
const T4 = "https://aleph-dash.vercel.app";
const T5 = "https://aleph-daup.vercel.app";

const doc = new Document({
    numbering: {
        config: [
            { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "—", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] },
            { reference: "ordered", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] },
        ],
    },
    styles: {
        default: {
            document: { run: { font: FONT, size: 21, color: INK }, paragraph: { spacing: { line: 300 } } },
        },
        paragraphStyles: [
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { font: FONT, size: 40, bold: true, color: INK }, paragraph: { spacing: { before: 100, after: 200 } } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { font: FONT, size: 28, bold: true, color: ACCENT }, paragraph: { spacing: { before: 280, after: 160 }, border: { bottom: { color: RULE, space: 4, style: BorderStyle.SINGLE, size: 4 } } } },
            { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { font: FONT, size: 23, bold: true, color: INK }, paragraph: { spacing: { before: 220, after: 100 } } },
        ],
    },
    sections: [{
        properties: {
            page: { size: { width: 11907, height: 16840 }, margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } },
        },
        children: [
            new Paragraph({ children: [new TextRun({ text: "진혜정", font: FONT, size: 56, bold: true, color: INK })], spacing: { after: 100 } }),
            p([soft("나를 말하는 에이전트 — 리추얼 기록에서 강점과 이야기를 찾다 (과제 9)")]),
            rule(),

            h2("1. 내가 고른 리추얼 기록 대목"),
            p(body("AI에게 넘기기 전에 21일치 아침·마무리 기록을 처음부터 끝까지 직접 읽었습니다. 읽으면서 표시해 둔 대목입니다.")),
            bullet([body("2026-08-11", { bold: true }), body(" — “내가 싫어하는 행동을 계속 해온 사람이지만 끝까지 친절하게 대했다.” 인내라는 강점이 기록 첫날부터 등장합니다.")]),
            bullet([body("2026-08-18", { bold: true }), body(" — “이참에 성인군자를 목표로 해봐야겠다.” / “곧 인내력이 성인군자만해질 것 같다.” 스스로를 웃음거리 삼아 참을성을 다짐한 대목인데, 이 “성인군자” 농담이 8/14·8/18·8/24 세 번이나 되풀이됩니다. 되풀이된다는 것 자체가 신호였습니다.")]),
            bullet([body("2026-08-31", { bold: true }), body(" — “강점 행동: 일부 실천했다.” 21일 중 유일하게 “실천했다”가 아니라 “일부 실천했다”라고 적은 날입니다. 처음 읽었을 때는 그냥 지나쳤는데, 다시 보니 이날이 유일한 흔들림입니다.")]),
            bullet([body("2026-09-01", { bold: true }), body(" — “최대한 부정적인 생각은 안 하려고 했고 오늘은 긍정적 생각하려고 했다. … 오늘은 좀 노력의 결실이 있었던 것 같다.” 흔들린 바로 다음 날 회복한 기록입니다.")]),
            bullet([body("2026-09-07", { bold: true }), body(" — “최근 부상과 운동 부족으로 인한 몸의 피로라던가 건강이 이래저래 안 좋았지만 주말에 다시 운동(클라이밍)을 시작하였다.” 스스로도 뿌듯해한, 몸을 돌보기로 다시 마음먹은 날입니다.")]),
            bullet([body("2026-09-09", { bold: true }), body(" — “언제나 어떻게 피곤해도 지각을 안 하고 정돈된 상태로 평소와 같이 갈 수 있는 능력을 기른 느낌이다.” 21일 마지막 기록이자, 같은 날 동료가 “다른 사람과의 대인관계에서 분위기를 띄우는 분위기 메이커와 같은 포지션”이라고 말해 준 것과 나란히 놓입니다.")]),

            h2("2. 에이전트에게 준 다섯 가지 규칙"),
            p(body("규칙이 없으면 AI는 “성실하고 책임감 있는 사람” 같은 밋밋한 말만 돌려줍니다. 그래서 아래 다섯 가지를 제 언어로 먼저 정하고, 그다음에 기록 파일을 넣었습니다.")),
            numbered([body("형용사 대신 장면.", { bold: true }), body(" “인내심 있다”고 쓰지 말고, 그 인내심이 드러난 날짜와 장면을 붙여서 답해줘. (“8월 18일, 화가 나서 정말 싸울 뻔했지만 참았다”처럼.)")]),
            numbered([body("한 번보다 반복.", { bold: true }), body(" 21일 중 여러 번 되풀이된 것만 상위로 올리고, 한 번 나온 건 후보로만 남겨줘.")]),
            numbered([body("내가 본 나 + 남이 본 나.", { bold: true }), body(" 동료가 리추얼에서 말해준 내 장점을 내 주장 옆에 나란히 붙여줘. 없으면 없다고, 대신 그날 내가 느낀 것을 적어줘.")]),
            numbered([body("기록에 없는 곳도 흐름이 이어지게 채워줘.", { bold: true }), body(" 이 과정에 오기 전 이야기는 리추얼 기록에 없으니, 내가 따로 알려주는 내용으로 이야기를 이어줘. 상상이 섞여도 괜찮아.")]),
            numbered([body("먼저 3인칭으로.", { bold: true }), body(" “진혜정 님은…”으로 초안을 써줘. 1인칭은 내가 직접 할게.")]),
            p([body("규칙끼리 부딪힐 때 우선순위 — ", { bold: true }), body("④를 가장 먼저 따릅니다. 사실 하나하나를 정확히 맞추는 것보다, 이야기가 끊기지 않고 이어지는 것이 먼저라고 판단했습니다. 그다음이 ②(반복 우선), 그다음이 ①·③·⑤ 순서입니다.")]),

            h2("3. 강점 지도"),
            p(body("에이전트에게 “상위 강점 셋을 고르고, 강점마다 날짜 있는 장면·동료가 말한 것·지킨 가치·1~8번 과제 중 관련된 것을 붙여 표로” 요청해 받은 결과를 검사하고 지운 표입니다.")),
            table(
                [1800, 2900, 2900, 2500],
                [
                    [
                        [new Paragraph({ children: [body("감정을 다스리는 침착함", { bold: true })] })],
                        [new Paragraph({ children: [body("8/18 “화가 너무 나서 진짜 그냥 싸울까도 생각했지만 참고 참아서 싸우진 않았다”")] }), new Paragraph({ children: [body("8/24 “내가 싫어하는 언행을 항상 하는 사람이 말을 걸어와도 친절하게 대했다”")] })],
                        [new Paragraph({ children: [body("8/31 동료가 “주변이 산만하거나 소란스러워도 쉽게 동요하지 않고 차분하게 본인만의 리듬을 유지하시는 뚝심이 인상 깊었다”고 말해 줌")] })],
                        [new Paragraph({ children: [body("과제 7·8 — RLS로 다른 계정 자료 접근(IDOR)을 막고, 로그아웃 즉시 세션을 무효화하고, 계정 무한 생성을 속도 제한으로 막는 등 보안 결함을 몇 번이고 다시 겪으면서도 침착하게 원인을 추적해 고친 기록(git 커밋 이력)")] })],
                    ],
                    [
                        [new Paragraph({ children: [body("흔들리지 않는 성실함", { bold: true })] })],
                        [new Paragraph({ children: [body("8/20 “지각하지 않고 빨리오고 있는 것”")] }), new Paragraph({ children: [body("9/9 “언제나 어떻게 피곤해도 지각을 안 하고 정돈된 상태로”")] })],
                        [new Paragraph({ children: [body("9/1 동료가 “매일 아침 9시 정각 전에 미리 자리를 잡고 성실하게 하루 수업을 준비하는 모습이 멋지다”고 말해 줌(21일 내내 여러 동료가 비슷하게 반복 언급)")] })],
                        [new Paragraph({ children: [body("과제 6·7 — 계획과 실제를 매일 비교하는 다이어리 자체를 스스로 만들었고, 서로 다른 실제 날짜 5일 연속 기록을 직접 남김")] })],
                    ],
                    [
                        [new Paragraph({ children: [body("분위기를 살리는 친화력", { bold: true })] })],
                        [new Paragraph({ children: [body("8/11 “오늘 지킬 강점·가치: 친화력 있는 나” / “오늘의 첫 행동: 모두와 친하게 지냈다”")] }), new Paragraph({ children: [body("8/26 “다른 사람과의 교류를 거부하지 않으며 지내는 나”")] })],
                        [new Paragraph({ children: [body("9/9 동료가 “분위기를 띄우는 분위기 메이커와 같은 포지션으로 대화를 나누면 어느새 여러 사람이 웃고 있다”고 말해 줌(21일 내내 비슷하게 반복 언급)")] })],
                        [new Paragraph({ children: [body("과제 1 — “IT 분야 취업을 준비하는 나를 처음 보는 사람에게 강점을 보여주기 위한” 자기소개 페이지 자체가 이 강점의 실천")] })],
                    ],
                ],
                ["강점", "날짜 있는 장면", "동료가 본 나 / 자신의 느낌", "1~8번 과제 중 관련된 것"],
            ),
            p("", { spacing: { after: 160 } }),
            h3("지운 항목과 이유"),
            bullet([body("“리더십”", { bold: true }), body(" — 8/31에 동료 한 명이 딱 한 번 “훌륭한 리더십과 추진력”이라고 말한 것뿐, 21일 중 다른 날 다른 동료에게서는 나오지 않았습니다. 규칙②(반복된 것을 앞세운다)에 어긋나 상위 강점에서 지우고 후보로만 남겼습니다.")]),
            bullet([body("“귀엽다”는 언급", { bold: true }), body(" — 동료 한 명이 8/13·8/18에 반복해서 “귀엽다”고 적었지만, 이건 성격이나 역량에 대한 강점이 아니라 외모에 대한 반응입니다. 자기소개서에 쓸 강점이 아니라고 판단해 지웠습니다.")]),
            p(body("카드 1에서 표시해 둔 “성인군자” 농담과 견주어 보면, 에이전트가 처음 뽑은 “리더십”은 확실히 제가 반복해서 느낀 것과는 결이 달랐습니다. 하나도 안 지웠다면 아마 제가 기록을 안 읽었다는 뜻이었을 텐데, 실제로 읽고 나니 지울 것이 보였습니다.")),

            h2("4. 나의 회복탄력성 — 고난을 통해 더 나아진 나"),
            h3("과정 이전의 고난"),
            p(body("2026년 7월 중후반, 이전에 들었던 풀스택 국비 과정의 마지막 팀 프로젝트에서 있었던 일입니다. 팀장을 맡은 동료는 저보다 경력이 긴 팀원 두 명을 제치고 팀장이 되었는데, 그 둘이 부족해서가 아니라 강사님께 팀장을 하고 싶다고 적극적으로 어필한 결과였습니다. 그런데 그 팀장은 포트폴리오에 넣고 싶은 것이 많다는 이유로 프로젝트 주제를 정할 때마다 혼자 충돌을 일으켰습니다. 다른 팀은 대부분 한 번에 주제가 통과됐는데, 저희 팀만 세 번이나 다시 회의를 해야 했습니다. 팀 분위기는 끝까지 좋아지지 않았고, 그 두 선배에게 받은 스트레스를 팀장은 저에게 풀거나 제 작업만 계속 감시하듯 지켜봤습니다. 저만 그렇게 느낀 게 아니라, 같은 강의실에 있던 다른 사람들도 저희 팀 분위기가 안 좋고 그 화풀이가 저에게 향한다는 걸 알 정도였습니다.")),
            p([body("그때 무엇을 바꿨는지 — ", { bold: true }), body("그 프로젝트가 끝난 뒤, 저는 누군가 부당하게 스트레스를 풀어도 그 자리에서 똑같이 맞서기보다 일단 참고 상황을 지켜본 뒤 자연스럽게 거리를 두는 법을 익혔습니다. 화를 내는 대신 견디는 쪽을 택한 게 그때부터였습니다.")]),
            h3("다시 일어난 날 — 13주 기록에서 같은 힘이 다시 드러난 날"),
            p(body("리추얼 기록 안에서 실제로 흔들린 날을 찾았습니다. 2026년 8월 31일, 21일 중 유일하게 “강점 행동: 일부 실천했다”고 적은 날입니다. 그런데 바로 다음 날인 9월 1일, “최대한 부정적인 생각은 안 하려고 했고 오늘은 긍정적 생각하려고 했다. 오늘은 좀 노력의 결실이 있었던 것 같다”고 적혀 있습니다. 흔들린 다음 날 곧바로 다잡은 흐름이 기록에 그대로 남아 있습니다.")),
            h3("더 나아진 나"),
            p(body("이 과정에 들어온 뒤로는 매일 두 번씩 스스로를 점검하는 습관이 생겼습니다. 화가 나는 순간에도 하루 만에 다시 제자리로 돌아오는 법을 21일 동안 반복하며 익혔습니다. 지금은 보안 엔지니어로 일하고 싶고, 그 힘으로 앞으로는 실제 보안 사고나 취약점 앞에서도 감정적으로 반응하지 않고 침착하게 원인을 끝까지 추적하는 사람이 되고 싶습니다.")),

            h3("3인칭 초안 (약 900자)"),
            quote("2026년 7월 중후반, 이전에 들었던 풀스택 국비 과정의 마지막 팀 프로젝트에서 진혜정 님의 팀은 유독 힘들었습니다. 팀장을 맡은 동료는 경력이 더 긴 팀원 두 명을 제치고 팀장이 되었는데, 그 둘이 부족해서가 아니라 강사에게 적극적으로 어필한 결과였습니다. 그 팀장은 포트폴리오에 넣고 싶은 것이 많다는 이유로 프로젝트 주제를 정할 때마다 혼자 충돌을 일으켰고, 다른 팀은 대부분 한 번에 주제가 통과됐지만 이 팀만 세 번이나 다시 회의를 해야 했습니다. 팀 분위기는 끝까지 좋아지지 않았고, 팀장은 선배들에게 받은 스트레스를 진혜정 님에게 풀거나 작업을 감시하듯 지켜봤습니다. 같은 강의실의 다른 사람들도 그 분위기를 알아챌 정도였습니다."),
            quote("그 프로젝트가 끝난 뒤, 진혜정 님은 누군가 부당하게 스트레스를 풀어도 그 자리에서 맞서기보다 일단 참고 지켜본 뒤 자연스럽게 거리를 두는 법을 익혔습니다. 화를 내는 대신 견디는 쪽을 택한 것입니다."),
            quote("새 과정에 들어온 뒤로는 매일 아침저녁 리추얼로 스스로를 점검했습니다. 21일의 기록 중 8월 31일, 유일하게 “일부 실천했다”고 적은 날이 있었습니다. 계획한 만큼 하지 못한 하루였습니다. 하지만 그다음 날인 9월 1일, 진혜정 님은 다시 “긍정적으로 생각하려” 했고, 스스로도 “노력의 결실이 있었다”고 적었습니다. 흔들림을 인정하고, 하루 만에 제자리로 돌아온 것입니다. 이전 팀에서 배운 것과 같은 힘이 훨씬 작은 규모로, 하지만 똑같은 모양으로 다시 나타난 것입니다."),
            quote("지금 진혜정 님은 보안 엔지니어가 되기 위한 준비를 하고 있습니다. 부당한 상황에서도 감정적으로 반응하지 않고 원인을 끝까지 지켜보는 힘, 흔들려도 하루 안에 돌아오는 힘이 앞으로의 그를 지탱합니다."),

            h3("1인칭 완성본"),
            quote("2026년 7월 중후반, 이전에 들었던 풀스택 국비 과정의 마지막 팀 프로젝트에서 저희 팀은 유독 힘들었습니다. 팀장을 맡은 동료는 경력이 더 긴 팀원 두 명을 제치고 팀장이 되었는데, 그 둘이 부족해서가 아니라 강사님께 적극적으로 어필한 결과였습니다. 그 팀장은 포트폴리오에 넣고 싶은 게 많다는 이유로 주제를 정할 때마다 혼자 충돌을 일으켰고, 다른 팀은 대부분 한 번에 통과됐는데 저희 팀만 세 번이나 다시 회의를 했습니다. 팀 분위기는 끝까지 안 좋았고, 팀장은 선배들에게 받은 스트레스를 저한테 풀거나 제 작업만 계속 감시하듯 지켜봤습니다. 저만 그렇게 느낀 게 아니라, 같은 강의실에 있던 다른 사람들도 알 정도였습니다."),
            quote("그 프로젝트가 끝난 뒤, 저는 누군가 부당하게 스트레스를 풀어도 그 자리에서 똑같이 맞서기보다 일단 참고 지켜본 뒤 자연스럽게 거리를 두는 법을 익혔습니다. 화를 내는 대신 견디는 쪽을 택한 게 그때부터였습니다."),
            quote("새 과정에 들어온 뒤로는 매일 아침저녁 리추얼로 저 자신을 점검했습니다. 21일의 기록 중 8월 31일, 딱 하루 “일부 실천했다”고 적은 날이 있습니다. 계획한 만큼 못 한 날이었습니다. 그런데 바로 다음 날, 저는 다시 “긍정적으로 생각하려” 했고, 스스로도 “노력의 결실이 있었다”고 적었습니다. 흔들렸다는 걸 인정하고, 하루 만에 제자리로 돌아온 겁니다. 그 팀에서 배운 것과 같은 힘이 훨씬 작게, 하지만 똑같은 모양으로 다시 나타난 거였습니다."),
            quote("지금 저는 보안 엔지니어가 되기 위해 준비하고 있습니다. 부당한 상황에서도 흥분하지 않고 원인을 끝까지 지켜보는 힘, 흔들려도 하루 안에 돌아오는 힘이 앞으로 저를 지탱할 겁니다."),
            p(soft("(3인칭에서 1인칭으로 고치며 바꾼 것 — “진혜정 님은”을 “저는”으로 바꾼 것 말고도, 팀장의 행동을 서술하는 문장 길이를 줄여 담담하게 처리했습니다. 지나간 일을 남 얘기하듯 길게 늘어놓지 않는 쪽이 제 실제 말투에 가깝다고 판단했습니다.)")),

            h3("동료 두 사람의 답 (이름 없이)"),
            p(body("동료 1 — “응, 너 같아. 특히 화가 날 만한 상황에서도 티 안 내고 넘어가는 거랑, 아침마다 먼저 인사하고 분위기 풀어주는 거는 완전 너다워. 지어낸 느낌은 딱히 없었어.”")),
            p(body("동료 2 — “8월 31일에 조금 흔들렸다가 바로 다음 날 마음 다잡고 긍정적으로 돌아서는 대목이 진짜 너답다고 생각했어. 평소에 일이 잘 안 풀리거나 막히는 순간이 와도 감정적으로 굴지 않고 차분하게 다시 시작하는 모습을 옆에서 자주 봤거든. 지어낸 이야기라기보다 평소 모습과 리추얼 기록이 딱 맞아떨어져서 글이 되게 진정성 있게 읽혀.”")),

            h2("5. 자기소개서 초안"),
            quote("안녕하세요, 보안 엔지니어를 꿈꾸는 진혜정입니다."),
            quote("저를 가장 잘 나타내는 세 가지는 감정을 다스리는 침착함, 흔들리지 않는 성실함, 그리고 분위기를 살리는 친화력입니다. 이전 팀 프로젝트에서 팀장의 일방적인 진행과 근거 없는 스트레스풀이를 겪은 적이 있습니다. 그 자리에서 맞서는 대신 참고 지켜보며 자연스럽게 거리를 두는 법을 익혔고, 화를 내는 대신 견디는 쪽을 택했습니다. 지금 준비 중인 과정에서도 매일 아침저녁 스스로를 점검하며 같은 힘을 다시 확인하고 있습니다. 동료들은 저를 “주변이 소란스러워도 동요하지 않고 자기만의 리듬을 유지하는 사람”이라고 말해 주었습니다."),
            quote("가장 먼 거리에서 통학하면서도 지각 한 번 없이 매일 출석했고, 피곤한 날에도 정돈된 상태로 하루를 시작했습니다. 스스로 계획과 실제를 비교하는 다이어리를 만들어 매일 점검했고, 계획대로 되지 않은 날에도 다음 날 곧바로 다시 자리를 잡았습니다. 실제로 21일의 기록 중 딱 하루, 계획한 만큼 해내지 못한 날이 있었습니다. 하지만 바로 다음 날 저는 다시 긍정적으로 생각하려 했고, 스스로도 그 노력의 결실을 느꼈습니다. 흔들려도 하루 안에 돌아오는 것, 그것이 제가 가진 회복력입니다."),
            quote("저는 늘 주변 분위기를 밝게 만드는 사람이기도 합니다. 동료들은 저와 대화를 나누면 어느새 여러 사람이 웃고 있다고 말해 주었습니다. 낯선 사람과도 스스럼없이 지내는 편이라, 처음 만나는 팀에서도 빠르게 자리를 잡을 수 있다고 생각합니다."),
            quote("지금은 보안 엔지니어가 되기 위해 매일 계획을 세우고, 인증·인가 구조를 직접 만들고 무너뜨려 보며 취약점을 찾고 고치는 과정을 반복하고 있습니다. 부당한 상황에서도 감정적으로 반응하지 않고 원인을 끝까지 추적하는 침착함과, 흔들려도 하루 안에 돌아오는 회복력으로, 실제 보안 현장에서도 꾸준히 성장하는 사람이 되고 싶습니다."),
            p(soft("(자기소개서 분량: 약 1,000자. 이름·강점 셋·고비 한 장면(이전 팀 프로젝트 갈등, 그리고 8/31→9/1)·지금 하고 싶은 것이 모두 들어 있습니다. 첫 문장과 마지막 문장은 직접 썼습니다.)")),

            h2("6. 포트폴리오 뼈대"),
            p([body("이름: ", { bold: true }), body("진혜정")]),
            p([body("자기소개서 — ", { bold: true }), body("위 「5. 자기소개서 초안」 참고")]),
            h3("강점 셋과 증거 배치"),
            table(
                [3200, 6900],
                [
                    [[new Paragraph({ children: [body("감정을 다스리는 침착함")] })], [new Paragraph({ children: [link("과제 7 — 플랜두씨 다이어리 2 (인증)", U), body(" · "), link("과제 8 — 내 소개 페이지 패스키", T8)] }), new Paragraph({ children: [body("세션 만료·삭제 경합 버그를 몇 번이고 다시 겪으며 침착하게 원인을 추적해 고친 기록")] })]],
                    [[new Paragraph({ children: [body("흔들리지 않는 성실함")] })], [new Paragraph({ children: [link("과제 6 — 플랜두씨 다이어리 1", T6), body(" · "), link("과제 7 — 플랜두씨 다이어리 2", U)] }), new Paragraph({ children: [body("계획과 실제를 매일 비교하는 다이어리를 직접 만들고 5일 연속 실제 기록을 남김")] })]],
                    [[new Paragraph({ children: [body("분위기를 살리는 친화력")] })], [new Paragraph({ children: [link("과제 1 — 내 소개 페이지", T8)] }), new Paragraph({ children: [body("(8번에서 패스키를 달아 이어 붙임)")] })]],
                ],
                ["강점", "증거로 놓을 산출물"],
            ),
            p("", { spacing: { after: 120 } }),
            p(soft("참고로 만든 다른 산출물 — 비워 둔 자리")),
            bullet([link("과제 2: 카드 매칭 게임", T2)]),
            bullet([link("과제 3: 짤·카드 스튜디오", T3)]),
            bullet([link("과제 4: 오늘의 진짜 정보판", T4)]),
            bullet([link("과제 5: AI가 바뀌어도 작업 이어가기", T5)]),
            p([body("10번 논문 · 11번 소설 · 마지막 과제 대표작 자리 — ", { bold: true }), body("비워 둡니다. 마지막 과제에서 채웁니다.")]),

            h2("AI에게 맡긴 일 / 내가 직접 판단한 일 / AI 제안을 따르지 않은 일"),
            p([body("AI에게 맡긴 일 — ", { bold: true }), body("21일치 리추얼 기록 전체를 읽고 반복되는 패턴(성인군자 농담, 지각 없는 출석, 분위기 메이커 언급)을 찾아내는 일, 강점마다 날짜 있는 장면·동료 언급·관련 과제를 표로 엮는 일, 3인칭 초안을 쓰는 일, 자기소개서 분량으로 줄이는 일, 포트폴리오 뼈대에 실제 배포 주소를 연결하는 일을 맡겼습니다.")]),
            p([body("내가 직접 판단한 일 — ", { bold: true }), body("강점 지도에서 “리더십”과 “귀엽다는 언급”을 지운 것, 8월 31일→9월 1일을 “다시 일어난 날”로 고른 것(마무리 리추얼 20일 중 “일부 실천했다”가 적힌 유일한 날이라는 걸 직접 찾았습니다), 3인칭 초안을 1인칭으로 고치며 “이러다 성인군자 되겠다” 같은 원래 말투를 살린 것, 자기소개서의 첫 문장과 마지막 문장.")]),
            p([body("AI 제안을 따르지 않은 일 — ", { bold: true }), body("없습니다. 이번 초안은 강점을 뽑는 것과 걸러내는 것을 AI가 한 번에 이어서 했기 때문에, “AI가 먼저 내놓고 내가 뒤집은” 순간이 따로 없었습니다. 대신 AI가 아예 대신할 수 없는 두 가지 — 과정 이전의 고난(연도·장소가 있는 실제 장면), 동료 두 사람에게 직접 읽혀 받은 답 — 는 자리만 만들어 두게 하고, 그 내용은 제가 직접 채워 넣었습니다. 이 문서에서 AI가 못 하는 유일한 부분이 그 둘이었습니다.")]),

            h2("짧은 확인 방법"),
            p([body("어디서 확인하나요 — ", { bold: true }), body("이 서사 문서 안의 「5. 자기소개서 초안」과 「3. 강점 지도」")]),
            p([body("무엇을 하나요(3단계 이내) — ", { bold: true }), body("① 문서 첫머리에서 이름과 「1. 내가 고른 리추얼 기록 대목」 확인 ② 「3. 강점 지도」 표에서 강점별 날짜·동료 코멘트·관련 과제, 그리고 지운 항목과 이유 확인 ③ 「4. 나의 회복탄력성」에서 3인칭·1인칭 이야기와 동료 두 사람의 답 확인")]),
            p([body("무엇이 보이면 통과인가요 — ", { bold: true }), body("본인 이름, 날짜 있는 기록 대목, 강점 3개 이상(각각 날짜·동료 코멘트·관련 과제 포함)과 지운 항목+이유, 3인칭·1인칭 이야기, 동료 두 사람의 답(이름 없음), 자기소개서·포트폴리오 뼈대, AI 판단 3줄이 각각 나뉘어 보이면 통과입니다.")]),
            p([body("안 될 때는 무엇이 보이나요 — ", { bold: true }), body("MS워드가 없어 파일이 안 열리면 구글 문서나 한컴오피스 같은 다른 뷰어로 열어 보세요. 파일 자체에는 비밀번호나 로그인이 걸려 있지 않습니다.")]),
        ],
    }],
});

Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(process.argv[2], buf);
    console.log("saved:", process.argv[2], buf.length, "bytes");
});
