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

const ROWS = [
    { label: "모델", read: (run) => (run.model === null ? "가림" : run.model) },
    { label: "시간 (분)", read: (run) => cell(run.minutes) },
    { label: "요청 (사람 메시지 수)", read: (run) => cell(run.requests) },
    { label: "재작업 (다시 실행한 검사 수)", read: (run) => cell(run.rework) },
    { label: "인계 이해 오류 (횟수)", read: (run) => cell(run.handoffMisreads) },
];

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

            {/* 어디서 멈췄고 무엇이 남았는지를 검사 번호로 보여줍니다. */}
            <div>
                <span css={c.label}>검사 10개 — 누가 어디까지 했는지</span>
                <ul css={s.checks}>
                    {checks.map((check) => {
                        const status = statusOf(check.n);
                        return (
                            <li key={check.n} css={s.check}>
                                <span css={s.checkNo}>{check.n}</span>
                                <span css={s.checkKind}>{check.kind}</span>
                                <span css={s.checkTitle}>{check.title}</span>
                                <span css={s.checkState(status.tone)}>{status.label}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div>
                <span css={c.label}>앞으로의 선택 기준</span>
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
