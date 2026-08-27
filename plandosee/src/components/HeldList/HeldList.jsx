import * as c from "../../styles/controls";
import * as s from "./styles";

/**
 * 보류 목록 (카드 4).
 *
 * 잘못된 값을 조용히 버리면 사용자는 자기 기록이 사라진 줄 압니다.
 * 남기되 집계에는 넣지 않고, 행마다 이유를 씁니다.
 */
function HeldList({ held, onRemove }) {
    if (held.length === 0) return null;

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>보류 목록</h2>
                <span css={c.panelHint}>{held.length}건 · 집계에 들어가지 않습니다</span>
            </div>

            <div css={s.tableWrap}>
                <table css={s.table} aria-label="보류 목록">
                    <thead>
                        <tr>
                            <th>날짜</th>
                            <th>과목</th>
                            <th>값</th>
                            <th>보류 이유</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {held.map((item, index) => (
                            <tr key={`${item.record?.id ?? "no-id"}-${index}`}>
                                <td css={s.mono}>{String(item.record?.date ?? "-")}</td>
                                <td>{String(item.record?.subject ?? "-")}</td>
                                <td css={s.mono}>{String(item.record?.minutes ?? "-")}</td>
                                <td css={s.reason}>{item.reason}</td>
                                <td>
                                    <button
                                        type="button"
                                        css={s.smallButton}
                                        onClick={() => onRemove(item.record?.id)}
                                        disabled={!item.record?.id}>
                                        삭제
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p css={c.note}>
                형식이 맞지 않아 합계에서 뺀 기록입니다. 고치려면 삭제한 뒤 다시 넣으세요.
            </p>
        </section>
    );
}

export default HeldList;
