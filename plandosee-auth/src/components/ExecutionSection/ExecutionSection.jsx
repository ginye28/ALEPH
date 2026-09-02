import { useState } from "react";
import { formatKstDateTime } from "../../core/dates";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";

const emptyForm = () => ({ startedAt: "", endedAt: "", actualMinutes: "", blockedReason: "" });

/**
 * 실행 기록 — 계획·할일 값은 절대 건드리지 않는 별도 로그입니다 (T06-C27).
 * 어느 할 일에 붙어 있는지 항상 제목과 함께 보여줍니다.
 */
function ExecutionSection({ sectionRef, task, records, onCreate }) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [pending, setPending] = useState(false);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        if (!task) return;
        setPending(true);
        const result = await onCreate(task.id, form);
        setPending(false);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setErrors({});
        setForm(emptyForm());
    };

    return (
        <section css={c.panel} ref={sectionRef}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>실행 기록</h2>
                <span css={c.panelHint}>{task ? `할 일 — ${task.title}` : "할 일 목록에서 실행기록을 선택하세요"}</span>
            </div>

            {!task && <p css={c.note}>위 할 일 목록에서 “실행기록”을 눌러 어느 할 일에 적을지 고릅니다.</p>}

            {task && (
                <>
                    <table css={f.table} aria-label="실행 기록 목록">
                        <thead>
                            <tr>
                                <th>시작</th>
                                <th>끝</th>
                                <th>실제 걸린 시간</th>
                                <th>막힌 이유</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan={4} css={c.panelHint}>
                                        아직 실행 기록이 없습니다.
                                    </td>
                                </tr>
                            )}
                            {records.map((record) => (
                                <tr key={record.id} data-testid="execution-row">
                                    <td css={c.mono}>{formatKstDateTime(record.startedAt)}</td>
                                    <td css={c.mono}>{record.endedAt ? formatKstDateTime(record.endedAt) : "-"}</td>
                                    <td>{record.actualMinutes}분</td>
                                    <td>{record.blockedReason ?? "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <form css={f.form} onSubmit={submit} noValidate>
                        <div css={f.field}>
                            <label css={f.labelText} htmlFor="exec-start">
                                시작 시각 (KST)
                            </label>
                            <input
                                id="exec-start"
                                css={f.input(!!errors.startedAt)}
                                type="datetime-local"
                                value={form.startedAt}
                                onChange={set("startedAt")}
                            />
                            {errors.startedAt && <span css={f.error}>{errors.startedAt}</span>}
                        </div>
                        <div css={f.field}>
                            <label css={f.labelText} htmlFor="exec-end">
                                끝난 시각 (선택)
                            </label>
                            <input
                                id="exec-end"
                                css={f.input(!!errors.endedAt)}
                                type="datetime-local"
                                value={form.endedAt}
                                onChange={set("endedAt")}
                            />
                            {errors.endedAt && <span css={f.error}>{errors.endedAt}</span>}
                        </div>
                        <div css={f.field}>
                            <label css={f.labelText} htmlFor="exec-minutes">
                                실제 걸린 시간 (분)
                            </label>
                            <input
                                id="exec-minutes"
                                css={f.input(!!errors.actualMinutes)}
                                type="text"
                                inputMode="numeric"
                                placeholder="45"
                                value={form.actualMinutes}
                                onChange={set("actualMinutes")}
                            />
                            {errors.actualMinutes && <span css={f.error}>{errors.actualMinutes}</span>}
                        </div>
                        <div css={[f.field, f.wide]}>
                            <label css={f.labelText} htmlFor="exec-blocked">
                                막힌 이유 (선택)
                            </label>
                            <input
                                id="exec-blocked"
                                css={f.input(!!errors.blockedReason)}
                                type="text"
                                placeholder="예: API 문서가 없어 구조를 다시 확인함"
                                value={form.blockedReason}
                                onChange={set("blockedReason")}
                            />
                            {errors.blockedReason && <span css={f.error}>{errors.blockedReason}</span>}
                        </div>

                        {errors.form && (
                            <div css={f.wide}>
                                <span css={f.error}>{errors.form}</span>
                            </div>
                        )}

                        <div css={f.actions}>
                            <button type="submit" css={c.primaryButton} disabled={pending}>
                                기록 추가
                            </button>
                        </div>
                    </form>
                </>
            )}
        </section>
    );
}

export default ExecutionSection;
