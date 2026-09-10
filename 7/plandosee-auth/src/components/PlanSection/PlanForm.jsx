import { useState } from "react";
import { PRIORITIES, PRIORITY_LABEL, TIMEZONE_LABEL } from "../../core/validate";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";

const emptyForm = () => ({
    title: "",
    periodStart: "",
    periodEnd: "",
    priority: "medium",
    successCriteria: "",
    estimatedMinutes: "",
    note: "",
});

const toForm = (revision) => ({
    title: revision.title,
    periodStart: revision.periodStart,
    periodEnd: revision.periodEnd,
    priority: revision.priority,
    successCriteria: revision.successCriteria,
    estimatedMinutes: String(revision.estimatedMinutes ?? ""),
    note: revision.note ?? "",
});

/**
 * 새 계획 만들기 / 기존 계획 고치기. 같은 폼이 두 가지 일을 합니다 —
 * `revising`이 없으면 새 계획, 있으면 그 계획에 새 개정본을 하나 더 쌓습니다.
 * 어느 쪽이든 이전 개정본은 절대 건드리지 않습니다.
 */
function PlanForm({ revising, carryNote, onCreate, onRevise, onCancel }) {
    const [form, setForm] = useState(() => (revising ? toForm(revising.current) : emptyForm()));
    const [errors, setErrors] = useState({});
    const [pending, setPending] = useState(false);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setPending(true);
        const result = revising ? await onRevise(revising.id, form) : await onCreate(form);
        setPending(false);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setErrors({});
        if (revising) {
            onCancel(); // 저장이 끝났으니 "고치기" 모드를 나갑니다 — 새 계획 폼으로 돌아갑니다.
        } else {
            setForm(emptyForm());
        }
    };

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>{revising ? "계획 고치기" : "새 계획"}</h2>
                <span css={c.panelHint}>기준 시간대 {TIMEZONE_LABEL}</span>
            </div>

            {revising && (
                <p css={c.note}>
                    <b>계획 ID는 그대로 두고 내용만 새 개정본으로 저장됩니다.</b> 지금 이 계획은
                    개정 {revising.current.revisionNo}판이고, 저장하면 {revising.current.revisionNo + 1}판이
                    쌓입니다. 처음 계획은 이력에서 계속 볼 수 있습니다.
                </p>
            )}

            {!revising && carryNote && (
                <p css={c.note}>
                    <b>지난 돌아보기에서 넘어온 개선점</b> — “{carryNote.note}”. 이 계획은 그 개선점에서
                    이어집니다.
                </p>
            )}

            <form css={f.form} onSubmit={submit} noValidate>
                <div css={[f.field, f.wide]}>
                    <label css={f.labelText} htmlFor="plan-title">
                        제목
                    </label>
                    <input
                        id="plan-title"
                        css={f.input(!!errors.title)}
                        type="text"
                        placeholder="예: ALEPH 과제 6 진행"
                        value={form.title}
                        onChange={set("title")}
                    />
                    {errors.title && <span css={f.error}>{errors.title}</span>}
                </div>

                <div css={f.field}>
                    <label css={f.labelText} htmlFor="plan-start">
                        시작일
                    </label>
                    <input
                        id="plan-start"
                        css={f.input(!!errors.periodStart)}
                        type="date"
                        value={form.periodStart}
                        onChange={set("periodStart")}
                    />
                    {errors.periodStart && <span css={f.error}>{errors.periodStart}</span>}
                </div>

                <div css={f.field}>
                    <label css={f.labelText} htmlFor="plan-end">
                        종료일
                    </label>
                    <input
                        id="plan-end"
                        css={f.input(!!errors.periodEnd)}
                        type="date"
                        value={form.periodEnd}
                        onChange={set("periodEnd")}
                    />
                    {errors.periodEnd && <span css={f.error}>{errors.periodEnd}</span>}
                </div>

                <div css={f.field}>
                    <label css={f.labelText} htmlFor="plan-priority">
                        우선순위
                    </label>
                    <select id="plan-priority" css={f.select(false)} value={form.priority} onChange={set("priority")}>
                        {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                                {PRIORITY_LABEL[p]}
                            </option>
                        ))}
                    </select>
                </div>

                <div css={f.field}>
                    <label css={f.labelText} htmlFor="plan-estimated">
                        예상 시간 (분)
                    </label>
                    <input
                        id="plan-estimated"
                        css={f.input(!!errors.estimatedMinutes)}
                        type="text"
                        inputMode="numeric"
                        placeholder="600"
                        value={form.estimatedMinutes}
                        onChange={set("estimatedMinutes")}
                    />
                    {errors.estimatedMinutes && <span css={f.error}>{errors.estimatedMinutes}</span>}
                </div>

                <div css={[f.field, f.wide]}>
                    <label css={f.labelText} htmlFor="plan-success">
                        성공 기준
                    </label>
                    <textarea
                        id="plan-success"
                        css={f.textarea(!!errors.successCriteria)}
                        placeholder="무엇이 되면 이 계획을 완료로 볼지 한두 문장으로"
                        value={form.successCriteria}
                        onChange={set("successCriteria")}
                    />
                    {errors.successCriteria && <span css={f.error}>{errors.successCriteria}</span>}
                </div>

                <div css={[f.field, f.wide]}>
                    <label css={f.labelText} htmlFor="plan-note">
                        메모 (선택)
                    </label>
                    <input
                        id="plan-note"
                        css={f.input(false)}
                        type="text"
                        value={form.note}
                        onChange={set("note")}
                    />
                </div>

                {errors.form && (
                    <div css={f.wide}>
                        <span css={f.error}>{errors.form}</span>
                    </div>
                )}

                <div css={f.actions}>
                    <button type="submit" css={c.primaryButton} disabled={pending}>
                        {revising ? "개정본 저장" : "계획 만들기"}
                    </button>
                    {revising && (
                        <button type="button" css={c.button} onClick={onCancel}>
                            취소
                        </button>
                    )}
                </div>
            </form>
        </section>
    );
}

export default PlanForm;
