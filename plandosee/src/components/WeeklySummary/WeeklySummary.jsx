import { formatMinutes } from "../../core/weekly";
import * as c from "../../styles/controls";
import * as s from "./styles";

/**
 * 주간 요약 (카드 4·5).
 *
 * 목록 바로 위에 둡니다 — 카드 5의 통과 기준이 "해당 행과 관련 요약값이
 * 같은 화면에서 함께 바뀐다"라서, 스크롤해야 보이면 채점자가 둘이 같이 바뀌는 걸 못 봅니다.
 */
function WeeklySummary({ summary, onMove }) {
    const top = summary.bySubject[0]?.minutes ?? 0;

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>주간 요약</h2>
                <span css={c.panelHint}>월요일 00:00 ~ 일요일 23:59 · Asia/Seoul</span>
            </div>

            <div css={s.range}>
                <button type="button" css={s.move} onClick={() => onMove(-7)}>
                    ← 지난주
                </button>
                <span css={s.rangeText} data-testid="week-range">
                    {summary.range}
                </span>
                <button type="button" css={s.move} onClick={() => onMove(7)}>
                    다음주 →
                </button>
            </div>

            <div css={s.stats}>
                <div css={s.stat}>
                    <span css={s.statLabel}>합계</span>
                    <span css={s.statValue("accent")} data-testid="week-total">
                        {summary.totalMinutes}분
                    </span>
                </div>
                <div css={s.stat}>
                    <span css={s.statLabel}>읽기 쉽게</span>
                    <span css={s.statValue()}>{formatMinutes(summary.totalMinutes)}</span>
                </div>
                <div css={s.stat}>
                    <span css={s.statLabel}>이번 주 기록</span>
                    <span css={s.statValue()} data-testid="week-count">
                        {summary.count}건
                    </span>
                </div>
                <div css={s.stat}>
                    <span css={s.statLabel}>보류</span>
                    <span css={s.statValue(summary.heldCount > 0 ? "warn" : null)} data-testid="held-count">
                        {summary.heldCount}건
                    </span>
                </div>
            </div>

            {summary.bySubject.length === 0 ? (
                <p css={s.empty}>이 주에는 집계할 기록이 없습니다.</p>
            ) : (
                <div css={s.bars}>
                    {summary.bySubject.map((item) => (
                        <div key={item.subject} css={s.barRow}>
                            <span css={s.barName}>{item.subject}</span>
                            <span css={s.barTrack}>
                                <span css={s.barFill(top === 0 ? 0 : item.minutes / top)} />
                            </span>
                            <span css={s.barValue}>{item.minutes}분</span>
                        </div>
                    ))}
                </div>
            )}

            <p css={c.note}>
                보류 {summary.heldCount}건은 합계에 들어가지 않습니다. 아래 <b>보류 목록</b>에서 이유를
                확인하세요.
            </p>
        </section>
    );
}

export default WeeklySummary;
