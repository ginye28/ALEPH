import { useState } from "react";
import * as c from "../../styles/controls";
import {
    BASELINE,
    ERROR_TEXT,
    FAILURE_FIXTURES,
    FIXTURES,
    SEQUENCES,
} from "../fixtures";
import { resetEvaluationState, runFixture } from "../evaluationState";
import * as s from "./styles";

const ASSET_PACKAGE = "aleph-t04-real-information-board-public-contract-v2";

/**
 * 합성 fixture 재생 화면.
 *
 * 채점자가 여기서 직접 순서를 눌러 상태 전이를 확인합니다.
 * 실제 공개 원천 기록(위쪽 정보판)과 저장소를 공유하지 않습니다 —
 * 계약의 reset은 "합성 평가 상태만" 비우기 때문입니다.
 */
function ReplayPanel() {
    const [state, setState] = useState(resetEvaluationState);
    const [log, setLog] = useState([]);

    const play = (ids, { reset = true } = {}) => {
        let next = reset ? resetEvaluationState() : state;
        const lines = reset ? [] : [...log];

        ids.forEach((id) => {
            next = runFixture(next, FIXTURES[id]);
            lines.push({
                id,
                freshness: next.status.freshness,
                errorCode: next.status.error_code,
                rows: next.daily_readings.length,
                value: next.current_reading ? next.current_reading.normalized_value : null,
            });
        });

        setState(next);
        setLog(lines);
    };

    const clearAll = () => {
        setState(resetEvaluationState());
        setLog([]);
    };

    const status = state.status;
    const freshness = status ? status.freshness : "—";
    const errorCode = status ? status.error_code : "—";
    const text = status ? ERROR_TEXT[status.error_code] : null;
    const lastGood = state.current_reading;
    const comparison = state.last_comparison;

    return (
        <section css={c.panel} id="replay">
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>합성 검사 재생</h2>
                <span css={c.panelHint}>공개 fixture 9종 · 실제 기록과 분리</span>
            </div>

            <p css={s.intro}>
                아래 순서를 누르면 공개 fixture가 그대로 재생됩니다. 값과 날짜는 합성 시계이며,
                위쪽 정보판의 <strong>실제 공개 원천 기록을 건드리지 않습니다.</strong>
            </p>

            <div css={s.assetLine}>
                <span>
                    자산 꾸러미 <code>{ASSET_PACKAGE}</code>
                </span>
                <span>
                    fixture <code>{Object.keys(FIXTURES).length}종</code>
                </span>
                <span>
                    SHA-256 <code>tools/verify-t04.mjs</code>가 매 실행마다 대조
                </span>
            </div>

            {/* 상태는 freshness와 error_code를 서로 다른 칸에 둡니다 (reading-status.schema.json) */}
            <div css={s.statusBox(freshness)}>
                <div css={s.statusCell}>
                    <span css={s.statusLabel}>freshness</span>
                    <span css={s.statusValue(freshness === "stale" ? "warn" : freshness === "fresh" ? "good" : null)}>
                        {freshness}
                    </span>
                </div>
                <div css={s.statusCell}>
                    <span css={s.statusLabel}>error_code</span>
                    <span css={s.statusValue(errorCode !== "none" && errorCode !== "—" ? "warn" : null)}>
                        {errorCode}
                    </span>
                </div>
                <div css={s.statusCell}>
                    <span css={s.statusLabel}>일별 행 수</span>
                    <span css={s.statusValue()}>{state.daily_readings.length}</span>
                </div>
                <div css={s.statusCell}>
                    <span css={s.statusLabel}>마지막 정상값</span>
                    <span css={s.statusValue()}>
                        {lastGood ? `${lastGood.normalized_value} ${lastGood.unit}` : "—"}
                    </span>
                </div>

                {/* 실패 종류마다 다른 문구와 다음 행동 (C12~C16·C18·C19) */}
                {text && status.freshness === "stale" && (
                    <p css={s.staleNote}>
                        <strong>오래된 값</strong> · {text.label} — {text.detail} {text.action}
                    </p>
                )}
            </div>

            <div css={s.group}>
                <span css={c.label}>재생 순서</span>
                <div css={s.row}>
                    {SEQUENCES.map((seq) => (
                        <button
                            key={seq.id}
                            type="button"
                            css={s.seqButton}
                            onClick={() => play(seq.steps)}>
                            <strong>{seq.label}</strong>
                            <small>
                                {seq.hint} · {seq.covers}
                            </small>
                        </button>
                    ))}
                </div>
            </div>

            <div css={s.group}>
                <span css={c.label}>실패 5종 — 정상 2회를 먼저 재생한 뒤 하나를 얹습니다</span>
                <div css={s.row}>
                    {FAILURE_FIXTURES.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            css={s.seqButton}
                            onClick={() => play([...BASELINE, item.id])}>
                            <strong>{item.label}</strong>
                            <small>{item.covers}</small>
                        </button>
                    ))}
                </div>
            </div>

            <div css={s.group}>
                <span css={c.label}>실패 상태에서의 다시 시도 (C19)</span>
                <div css={s.row}>
                    <button
                        type="button"
                        css={c.primaryButton}
                        disabled={!status || status.freshness !== "stale"}
                        onClick={() => play(["T04-RECOVER-D2"], { reset: false })}>
                        다시 시도 — T04-RECOVER-D2 재생
                    </button>
                    <button type="button" css={c.button} onClick={clearAll}>
                        reset
                    </button>
                </div>
            </div>

            <div css={s.group}>
                <span css={c.label}>일별 기록 (합성)</span>
                <div css={s.tableWrap}>
                    {state.daily_readings.length === 0 ? (
                        <p css={s.empty}>아직 재생하지 않았습니다.</p>
                    ) : (
                        <table css={s.table}>
                            <thead>
                                <tr>
                                    <th>record_id</th>
                                    <th>record_date</th>
                                    <th>normalized_value</th>
                                    <th>unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.daily_readings.map((row) => (
                                    <tr key={row.record_id}>
                                        <td>{row.record_id}</td>
                                        <td>{row.record_date}</td>
                                        <td>{row.normalized_value}</td>
                                        <td>{row.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <p css={c.note}>
                    전일 대비 —{" "}
                    {comparison.state === "comparable"
                        ? `${comparison.direction} ${comparison.magnitude} ${comparison.unit}`
                        : comparison.state === "unit_mismatch"
                          ? "단위가 달라 비교하지 않습니다"
                          : "비교할 두 날짜가 아직 없습니다"}
                </p>
            </div>

            {log.length > 0 && (
                <div css={s.group}>
                    <span css={c.label}>재생 기록</span>
                    <ul css={s.log}>
                        {log.map((line, i) => (
                            <li key={`${line.id}-${i}`}>
                                <span css={line.errorCode === "none" ? s.logOk : s.logBad}>
                                    {line.freshness}/{line.errorCode}
                                </span>{" "}
                                {line.id} · 행 {line.rows}건
                                {line.value === null ? "" : ` · 값 ${line.value}`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default ReplayPanel;
