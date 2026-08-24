import { FAILURE_MODES } from "../../core/failureSim";
import * as c from "../../styles/controls";
import { formatSigned, formatValue } from "../../utils/format";
import { formatLocalStamp } from "../../utils/timezone";
import * as s from "./styles";

/**
 * 점검 도구. 배포 화면의 기본 상태에는 접혀 있고, ?debug=1 로 열면 펼쳐진 채 시작합니다.
 * 장애를 실제로 재현해 보여주기 위한 것이지 정보판의 일부가 아닙니다.
 */
function FailurePanel({ lastMode, isLoading, diff, digits, onSimulate, onRefill, onClear }) {
    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>점검 도구</h2>
                <span css={c.panelHint}>정보판을 쓰는 데는 필요 없습니다</span>
            </div>

            <div>
                <span css={c.label}>장애 5종 재현 — 누른 뒤 위 카드의 상태 문구를 확인하세요</span>
                <div css={s.grid}>
                    {FAILURE_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            css={s.modeButton(lastMode === mode.id)}
                            disabled={isLoading}
                            onClick={() => onSimulate(mode.id)}>
                            <strong>{mode.label}</strong>
                            <small>{mode.hint}</small>
                        </button>
                    ))}
                </div>
            </div>

            <div css={s.row}>
                <button type="button" css={c.button} disabled={isLoading} onClick={onRefill}>
                    지난 날짜 다시 불러오기
                </button>
                <button type="button" css={c.button} disabled={isLoading} onClick={onClear}>
                    기록 비우기
                </button>
                <span css={c.panelHint}>
                    기록을 비운 뒤 다시 확인하면 중복 방지 동작을 처음부터 볼 수 있습니다
                </span>
            </div>

            {diff.ok && (
                <div>
                    <span css={c.label}>대조표 — 원자료 · 저장값 · 계산 입력값 · 화면값</span>
                    <div css={s.tableWrap}>
                        <table css={s.table}>
                            <thead>
                                <tr>
                                    <th>날짜</th>
                                    <th>원자료 기준 시각</th>
                                    <th>저장값 (원본 정밀도)</th>
                                    <th>계산 입력값</th>
                                    <th>화면값</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[diff.previous, diff.latest].map((record) => (
                                    <tr key={record.dateKey}>
                                        <td>{record.dateKey}</td>
                                        <td>{formatLocalStamp(record.observedAt)}</td>
                                        <td>{record.value}</td>
                                        <td>{record.value}</td>
                                        <td>
                                            {formatValue(record.value, digits)} {record.unit}
                                        </td>
                                    </tr>
                                ))}
                                <tr css={s.resultRow}>
                                    <td>변화</td>
                                    <td>―</td>
                                    <td>{diff.rawDelta}</td>
                                    <td>
                                        {diff.latest.value} − {diff.previous.value}
                                    </td>
                                    <td>
                                        {formatSigned(diff.delta, digits)} {diff.unit} (
                                        {diff.directionLabel})
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p css={c.note}>
                        반올림은 화면값 열에서 한 번만 합니다. 저장값과 계산 입력값은 원본 정밀도를
                        그대로 두므로 손계산과 항상 일치합니다.
                    </p>
                </div>
            )}
        </section>
    );
}

export default FailurePanel;
