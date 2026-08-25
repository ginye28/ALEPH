import * as c from "../../styles/controls";
import { formatSigned, formatValue } from "../../utils/format";
import { REFERENCE_HOUR, TIMEZONE_LABEL } from "../../utils/timezone";
import * as s from "./styles";

const ARROW = { up: "▲", down: "▼", flat: "―" };

function DiffCard({ diff, digits, selectedKey, onClearSelection }) {
    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>이전 기록과의 차이</h2>
                <span css={c.panelHint}>
                    두 날짜 모두 {REFERENCE_HOUR}시 {TIMEZONE_LABEL} 기준
                </span>
            </div>

            {/* 개선 기능 — 이름과 사용 방법을 화면에서 바로 읽을 수 있게 둡니다. */}
            <div css={s.picker}>
                <span css={s.pickerText}>
                    <strong>비교 기준 고르기</strong>
                    아래 날짜별 기록에서 한 건을 누르면 그 날짜와 비교합니다
                    {selectedKey && <span css={s.selectedTag}>{selectedKey}</span>}
                </span>
                {selectedKey && (
                    <button type="button" css={s.clearButton} onClick={onClearSelection}>
                        선택 해제
                    </button>
                )}
            </div>

            {!diff.ok ? (
                <p css={s.blocked}>{diff.reason}</p>
            ) : (
                <>
                    <p css={s.delta(diff.direction)}>
                        <span css={s.arrow}>{ARROW[diff.direction]}</span>
                        <span css={s.amount}>{formatSigned(diff.delta, digits)}</span>
                        <span css={s.unit}>{diff.unit}</span>
                        <span css={s.direction}>{diff.directionLabel}</span>
                    </p>

                    <p css={s.equation}>
                        <span css={c.mono}>
                            {formatValue(diff.latest.value, digits)} {diff.unit}
                        </span>
                        <span css={s.operator}>−</span>
                        <span css={c.mono}>
                            {formatValue(diff.previous.value, digits)} {diff.unit}
                        </span>
                        <span css={s.operator}>=</span>
                        <span css={c.mono}>
                            {formatSigned(diff.delta, digits)} {diff.unit}
                        </span>
                    </p>

                    <p css={s.dates}>
                        {diff.previous.dateKey} → {diff.latest.dateKey}
                    </p>
                </>
            )}
        </section>
    );
}

export default DiffCard;
