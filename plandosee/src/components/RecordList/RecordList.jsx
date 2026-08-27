import { UNIT } from "../../core/validate";
import * as c from "../../styles/controls";
import * as s from "./styles";

/**
 * 기록 목록. 행을 가리키는 것은 언제나 `id`입니다 (설계 원칙 2).
 * 순번으로 가리키면 정렬만 바꿔도 수정·삭제가 다른 행에 갑니다.
 */
function RecordList({ records, editingId, onEdit, onRemove }) {
    // 날짜 내림차순, 같은 날은 넣은 순서대로.
    const sorted = [...records].sort((a, b) =>
        a.date === b.date
            ? String(a.createdAt).localeCompare(String(b.createdAt))
            : b.date.localeCompare(a.date),
    );

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>기록 목록</h2>
                <span css={c.panelHint}>{records.length}건 · 수정·삭제는 그 행 한 건에만 반영됩니다</span>
            </div>

            {sorted.length === 0 ? (
                <p css={s.empty}>
                    아직 기록이 없습니다.
                    <br />
                    아래 <b>자료 도구</b>에서 합성 자료를 넣거나 위에서 한 건 추가해 보세요.
                </p>
            ) : (
                <div css={s.tableWrap}>
                    <table css={s.table} aria-label="기록 목록">
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>과목</th>
                                <th>시간</th>
                                <th>태그</th>
                                <th>메모</th>
                                <th>id</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((record) => (
                                <tr key={record.id} css={s.row(record.id === editingId)}>
                                    <td css={s.num}>{record.date}</td>
                                    <td>{record.subject}</td>
                                    <td css={s.num}>
                                        {record.minutes} {record.unit ?? UNIT}
                                    </td>
                                    <td>{record.tag ? <span css={s.tag}>{record.tag}</span> : ""}</td>
                                    <td css={s.memo}>{record.memo}</td>
                                    <td css={s.idCell}>{String(record.id).slice(0, 8)}</td>
                                    <td>
                                        <span css={s.rowActions}>
                                            <button
                                                type="button"
                                                css={s.smallButton(false)}
                                                onClick={() => onEdit(record.id)}>
                                                수정
                                            </button>
                                            <button
                                                type="button"
                                                css={s.smallButton(true)}
                                                onClick={() => onRemove(record.id)}>
                                                삭제
                                            </button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default RecordList;
