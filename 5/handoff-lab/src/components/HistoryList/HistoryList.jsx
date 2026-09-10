import * as c from "../../styles/controls";
import { formatValue } from "../../utils/format";
import { REFERENCE_HOUR, formatStamp } from "../../utils/timezone";
import * as s from "./styles";

const ORIGIN_LABEL = {
    live: "직접 조회",
    backfill: "출처의 지난 기록",
};

function HistoryList({ records, digits, notes, selectable, selectedKey, onSelect }) {
    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>날짜별 기록</h2>
                <span css={c.panelHint}>
                    하루 한 건 · 매일 {REFERENCE_HOUR}시 값 ·{" "}
                    {selectable ? "누르면 비교 기준" : "2건 이상부터 비교 기준을 고를 수 있습니다"}
                </span>
            </div>

            {records.length === 0 ? (
                <p css={s.empty}>아직 저장된 기록이 없습니다.</p>
            ) : (
                <ul css={s.list} aria-label="날짜별 기록">
                    {records.map((record) => {
                        const selected = record.dateKey === selectedKey;

                        return (
                            <li key={`${record.providerKey}:${record.dateKey}`}>
                                <button
                                    type="button"
                                    css={s.row(selected)}
                                    disabled={!selectable}
                                    aria-pressed={selected}
                                    onClick={() => onSelect(record.dateKey)}>
                                    <span css={s.date}>{record.dateKey}</span>
                                    <span css={s.value}>
                                        {formatValue(record.value, digits)}
                                        <small>{record.unit}</small>
                                    </span>
                                    <span css={s.origin(record.origin)}>
                                        {ORIGIN_LABEL[record.origin]}
                                    </span>
                                    <span css={s.fetched}>{formatStamp(record.fetchedAt)} 조회</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {notes.length > 0 && (
                <ul css={s.notes}>
                    {notes.map((note) => (
                        <li key={note}>{note}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default HistoryList;
