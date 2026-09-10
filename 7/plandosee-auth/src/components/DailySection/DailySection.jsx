import { dailyTotals } from "../../core/dailyTotals";
import { formatMinutes } from "../../core/dates";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";

/**
 * 날짜별 실제 시간 — 5일 쓰기 기록을 화면에서 직접 보여 줍니다 (7.md 카드 5, T07-C132).
 *
 * 돌아보기(ReviewSection)는 계획 하나 안에서의 시간 합계를 봅니다. 이 표는 그 경계를
 * 넘어 **내 실행기록 전체를 날짜로 묶습니다** — 카드 5가 묻는 것이 "며칠에 걸쳐
 * 얼마나 했는가"이기 때문입니다.
 *
 * 평균만 보여 주면 유난히 튀는 하루가 가려지므로(T07-C25) 날짜별 값을 항상 함께 싣고,
 * 기록이 없는 날은 0분으로 채우지 않아 표에 아예 나타나지 않습니다(T07-C23).
 */
function DailySection({ records }) {
    const { days, total, average, dayCount, recordCount } = dailyTotals(records);

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>날짜별 실제 시간</h2>
                <span css={c.panelHint}>
                    그날 실행기록의 실제 걸린 시간 합계 · 단위 분 · Asia/Seoul 기준
                </span>
            </div>

            {dayCount === 0 ? (
                <p css={c.note} data-testid="daily-empty">
                    아직 실행기록이 없습니다. 할 일을 고르고 실행기록을 남기면 여기에 날짜별로 쌓입니다.
                </p>
            ) : (
                <>
                    <div css={f.tableWrap}>
                        <table css={f.table} aria-label="날짜별 실제 시간">
                            <thead>
                                <tr>
                                    <th>날짜 (KST)</th>
                                    <th>그날 실행기록</th>
                                    <th>실제 시간 합계</th>
                                </tr>
                            </thead>
                            <tbody>
                                {days.map((day) => (
                                    <tr key={day.date} data-testid="daily-row" data-date={day.date} data-minutes={day.minutes}>
                                        <td>{day.date}</td>
                                        <td>{day.count}건</td>
                                        <td>{day.minutes}분</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th>합계</th>
                                    <td data-testid="daily-record-count">{recordCount}건</td>
                                    <td data-testid="daily-total">{total}분</td>
                                </tr>
                                <tr>
                                    <th>하루 평균</th>
                                    <td data-testid="daily-day-count">{dayCount}일</td>
                                    <td data-testid="daily-average">{average.toFixed(1)}분</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <p css={c.note}>
                        기록이 있는 서로 다른 날짜 <b>{dayCount}일</b>의 합계 <b>{formatMinutes(total)}</b>,
                        하루 평균 <b>{average.toFixed(1)}분</b>입니다. 기록이 없는 날은 0분으로 채우지 않고
                        세지 않으므로, 평균은 <b>기록이 있는 날 수</b>로 나눈 값입니다.
                    </p>
                </>
            )}
        </section>
    );
}

export default DailySection;
