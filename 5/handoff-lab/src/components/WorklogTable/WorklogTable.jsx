import worklog from "../../../handoff/worklog.json";
import * as c from "../../styles/controls";
import * as s from "./styles";

const { caps, checks, runs, criteria } = worklog;

const numbers = (list) => (list.length === 0 ? null : list);

/** 아직 채우지 않은 칸은 지어내지 않고 빈 칸으로 둡니다. */
const cell = (value) => (value === null || value === undefined ? "–" : value);

const statusOf = (n) => {
    const byA = runs[0].passed.includes(n);
    const byB = runs[1].passed.includes(n);
    if (byB && !byA) return { label: "AI B 통과", tone: "b" };
    if (byA) return { label: "AI A 통과", tone: "a" };
    return { label: "남음", tone: "todo" };
};

const capMark = (ok) => (ok === true ? "이내 ✓" : ok === false ? "초과 ✗" : "–");

/**
 * 인계 흐름 — commit·시간·요청 수를 표에 흩어 놓지 않고 하나의 이야기로 잇습니다.
 * runs 배열에서 그대로 뽑아내므로 worklog.json이 바뀌면 여기도 같이 바뀝니다.
 */
const flowOf = (runs) => {
    const [a, b] = runs;
    return [
        { label: `AI ${a.ai} 시작`, detail: `커밋 ${a.startCommit}` },
        {
            label: `AI ${a.ai} 작업 중단`,
            detail: `${a.minutes}분 · 요청 ${a.requests}회 · 검사 ${a.passed.length}/10 통과 · 커밋 ${a.endCommit}`,
        },
        { label: "인계 문서 작성", detail: "HANDOFF.md — 첫 대화 전문 없이 이어받을 수 있게 정리" },
        {
            label: `AI ${b.ai} 시작`,
            detail: b.handoffOnly ? "인계 문서만 전달 (이전 대화 전문 없음)" : "이전 대화 맥락 포함해 전달",
        },
        {
            label: `AI ${b.ai} 완료`,
            detail: `${b.minutes}분 · 요청 ${b.requests}회 · 검사 ${b.passed.length}/10 통과 · 커밋 ${b.endCommit}`,
        },
    ];
};

/** 두 AI의 시간·요청·오류를 막대로 나란히 둡니다. 표의 숫자를 다시 그리는 것뿐, 새 숫자는 없습니다. */
const metricsOf = (runs) => {
    const [a, b] = runs;
    const pct = (value, max) => (max === 0 ? 0 : Math.max((value / max) * 100, value > 0 ? 4 : 0));

    const byMinutes = Math.max(a.minutes ?? 0, b.minutes ?? 0);
    const byRequests = Math.max(a.requests ?? 0, b.requests ?? 0);
    const byErrors = Math.max(a.runsWithFailure ?? 0, b.runsWithFailure ?? 0, 1);

    return [
        {
            label: "시간 (분)",
            a: { value: a.minutes, pct: pct(a.minutes, byMinutes) },
            b: { value: b.minutes, pct: pct(b.minutes, byMinutes) },
        },
        {
            label: "요청 (회)",
            a: { value: a.requests, pct: pct(a.requests, byRequests) },
            b: { value: b.requests, pct: pct(b.requests, byRequests) },
        },
        {
            label: "오류 난 회차",
            a: { value: a.runsWithFailure, pct: pct(a.runsWithFailure, byErrors) },
            b: { value: b.runsWithFailure, pct: pct(b.runsWithFailure, byErrors) },
        },
    ];
};

const ROWS = [
    { label: "모델", read: (run) => (run.model === null ? "가림" : run.model) },
    { label: "시간 (분)", read: (run) => `${cell(run.minutes)} · 상한 ${capMark(run.withinTimeCap)}` },
    { label: "요청 (사람 메시지 수)", read: (run) => `${cell(run.requests)} · 상한 ${capMark(run.withinRequestCap)}` },
    // T05-C25 — 실패한 검사 번호가 아니라 실패가 있었던 실행 회차 수를 셉니다.
    {
        label: "오류 (실패가 있었던 실행 회차)",
        read: (run) =>
            run.totalRuns === undefined || run.totalRuns === null
                ? "–"
                : `${cell(run.runsWithFailure)} / ${run.totalRuns}회`,
    },
    { label: "재작업 (다시 실행한 검사 수)", read: (run) => cell(run.rework) },
    { label: "인계 이해 오류 (횟수)", read: (run) => cell(run.handoffMisreads) },
];

const flow = flowOf(runs);
const metrics = metricsOf(runs);

function WorklogTable() {
    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>두 AI 작업 기록</h2>
                <span css={c.panelHint}>같은 검사 10개 · 같은 기록 단위</span>
            </div>

            <p css={s.caps}>
                상한 요청 <strong>{caps.requests}회</strong> · <strong>{caps.minutes}분</strong> ·
                중단 {caps.stopAt} — 작업 시작 전에 정하고 커밋했습니다.
            </p>

            {/* 커밋·시간·요청 수를 표로 흩어 놓기 전에, 무슨 일이 있었는지부터 순서대로 보여줍니다. */}
            <ol css={s.flow}>
                {flow.map((step, index) => (
                    <li key={index} css={s.flowStep}>
                        <span css={s.flowLabel}>{step.label}</span>
                        <span css={s.flowDetail}>{step.detail}</span>
                    </li>
                ))}
            </ol>

            <div css={s.tableWrap}>
                <table css={s.table}>
                    <thead>
                        <tr>
                            <th>항목</th>
                            {runs.map((run) => (
                                <th key={run.ai}>AI {run.ai}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row) => (
                            <tr key={row.label}>
                                <td>{row.label}</td>
                                {runs.map((run) => (
                                    <td key={run.ai} css={c.mono}>
                                        {row.read(run)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        <tr>
                            <td>통과 검사</td>
                            {runs.map((run) => (
                                <td key={run.ai}>
                                    {numbers(run.passed)?.map((n) => (
                                        <span key={n} css={s.chip("pass")}>
                                            {n}
                                        </span>
                                    )) ?? "–"}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td>남긴 오류</td>
                            {runs.map((run) => (
                                <td key={run.ai}>
                                    {numbers(run.failed)?.map((n) => (
                                        <span key={n} css={s.chip("fail")}>
                                            {n}
                                        </span>
                                    )) ?? "–"}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td>메모</td>
                            {runs.map((run) => (
                                <td key={run.ai}>{run.note}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 표 숫자를 막대로 다시 보여줍니다 — 새 값은 아니고, 차이를 눈으로 바로 재려는 것뿐입니다. */}
            <div>
                <span css={c.label}>정량 비교 — 위 표와 같은 숫자</span>
                <div css={s.metrics}>
                    {metrics.map((metric) => (
                        <div key={metric.label} css={s.metricRow}>
                            <span css={s.metricLabel}>{metric.label}</span>
                            <div css={s.metricBars}>
                                {runs.map((run, index) => {
                                    const side = index === 0 ? metric.a : metric.b;
                                    return (
                                        <div key={run.ai} css={s.metricBarLine}>
                                            <span css={s.metricAi}>{run.ai}</span>
                                            <span css={s.metricTrack}>
                                                <span css={s.metricFill(index === 0 ? "a" : "b", side.pct)} />
                                            </span>
                                            <span css={s.metricValue}>{cell(side.value)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 어디서 멈췄고 무엇이 남았는지를 검사 번호로 보여줍니다. */}
            <div>
                <span css={c.label}>검사 10개 — 누가 어디까지 했는지</span>
                <ul css={s.checks}>
                    {checks.map((check) => {
                        const status = statusOf(check.n);
                        return (
                            <li key={check.n} css={s.check}>
                                <div css={s.checkHead}>
                                    <span css={s.checkNo}>{check.n}</span>
                                    <span css={s.checkKind}>{check.kind}</span>
                                    <span css={s.checkTitle}>{check.title}</span>
                                    <span css={s.checkState(status.tone)}>{status.label}</span>
                                </div>
                                {/* id·입력·기대값 — 검사마다 관찰 가능한 기대값이 있음을 그대로 보여줍니다. */}
                                {check.id && (
                                    <p css={s.checkDetail}>
                                        <code>{check.id}</code> · 입력: {check.input} · 기대값:{" "}
                                        {check.expected}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div>
                <span css={c.label}>앞으로의 선택 기준</span>
                <p css={s.reasoning}>
                    모델 이름은 가린 채, 위 표와 검사 결과만 보고 정했습니다. 빠른 쪽이 항상 이기는
                    게 아니라 — 남은 작업의 성격(새로 짜는 일인지, 좁혀진 버그를 고치는 일인지)에
                    따라 어느 쪽을 먼저 쓸지가 갈렸습니다.
                </p>
                {criteria.length === 0 ? (
                    <p css={s.pending}>
                        아직 확정하지 않았습니다. 두 AI 기록을 같은 단위로 채운 뒤, 모델 이름을 가린
                        표만 보고 정합니다.
                    </p>
                ) : (
                    <ol css={s.criteria}>
                        {criteria.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}

export default WorklogTable;
