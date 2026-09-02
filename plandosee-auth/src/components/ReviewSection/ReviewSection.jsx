import { useState } from "react";
import { formatMinutes } from "../../core/dates";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";

const STAT_ITEMS = [
    { key: "planCount", label: "전체 할 일", filter: "all" },
    { key: "doneCount", label: "완료", filter: "done" },
    { key: "overdueCount", label: "지연", filter: "overdue" },
    { key: "blockedCount", label: "막힘", filter: "blocked" },
];

/**
 * 돌아보기 — 집계 숫자를 누르면 그 숫자가 나온 목록으로 이동합니다 (T06-C83).
 * 숫자와 목록은 `reviewFilters.js`의 같은 조건식에서 나오므로 서로 어긋나지 않습니다.
 */
function ReviewSection({ sectionRef, plan, stats, onFilterClick, activeFilter, onAddNote, onCarryToNewPlan }) {
    const [noteText, setNoteText] = useState("");
    const [savedNote, setSavedNote] = useState(null);
    const [error, setError] = useState(null);

    if (!plan) {
        return (
            <section css={c.panel} ref={sectionRef}>
                <div css={c.panelHead}>
                    <h2 css={c.panelTitle}>돌아보기</h2>
                </div>
                <p css={c.note}>먼저 계획을 하나 선택합니다.</p>
            </section>
        );
    }

    const submitNote = async (event) => {
        event.preventDefault();
        const result = await onAddNote(plan.id, noteText);
        if (!result.ok) {
            setError(result.errors.note ?? result.errors.form);
            return;
        }
        setError(null);
        setSavedNote(result.data);
        setNoteText("");
    };

    return (
        <section css={c.panel} ref={sectionRef}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>돌아보기</h2>
                <span css={c.panelHint}>{plan.current?.title}</span>
            </div>

            <div css={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {STAT_ITEMS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        data-testid={`review-stat-${item.key}`}
                        onClick={() => onFilterClick(item.filter)}
                        css={[
                            f.smallButton,
                            {
                                padding: "14px 10px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                fontSize: 13,
                                border: activeFilter === item.filter ? "1px solid var(--accent)" : undefined,
                            },
                        ]}>
                        <span css={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{stats[item.key]}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            <table css={f.table} aria-label="돌아보기 시간 집계">
                <tbody>
                    <tr>
                        <th>예상 시간 합계</th>
                        <td data-testid="review-estimated-total">{formatMinutes(stats.estimatedTotal)}</td>
                    </tr>
                    <tr>
                        <th>실제 시간 합계</th>
                        <td data-testid="review-actual-total">{formatMinutes(stats.actualTotal)}</td>
                    </tr>
                    <tr>
                        <th>차이 (실제 − 예상)</th>
                        <td data-testid="review-diff">
                            {stats.diff > 0 ? "+" : ""}
                            {formatMinutes(Math.abs(stats.diff))}
                            {stats.diff > 0 ? " 초과" : stats.diff < 0 ? " 절약" : ""}
                        </td>
                    </tr>
                </tbody>
            </table>

            <form css={f.form} onSubmit={submitNote} noValidate>
                <div css={[f.field, f.wide]}>
                    <label css={f.labelText} htmlFor="review-note">
                        고칠 점 한 줄
                    </label>
                    <input
                        id="review-note"
                        css={f.input(!!error)}
                        type="text"
                        placeholder="예: 마감일을 너무 낙관적으로 잡았다 — 다음엔 1.5배로"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                    />
                    {error && <span css={f.error}>{error}</span>}
                </div>
                <div css={f.actions}>
                    <button type="submit" css={c.primaryButton}>
                        고칠 점 저장
                    </button>
                    {savedNote && (
                        <button type="button" css={c.button} onClick={() => onCarryToNewPlan(savedNote)}>
                            이 고칠 점으로 다음 계획 만들기
                        </button>
                    )}
                </div>
            </form>
            {savedNote && (
                <p css={c.note} data-testid="review-note-saved">
                    저장됨 — “{savedNote.note}”
                </p>
            )}
        </section>
    );
}

export default ReviewSection;
