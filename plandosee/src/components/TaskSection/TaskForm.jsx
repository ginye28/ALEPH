import { useState } from "react";
import { PRIORITIES, PRIORITY_LABEL } from "../../core/validate";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";

const emptyForm = () => ({ title: "", detail: "", dueDate: "", priority: "medium", tags: "", estimatedMinutes: "" });

const toForm = (task) => ({
    title: task.title,
    detail: task.detail ?? "",
    dueDate: task.dueDate ?? "",
    priority: task.priority,
    tags: (task.tags ?? []).join(", "),
    estimatedMinutes: String(task.estimatedMinutes ?? ""),
});

function TaskForm({ editing, onCreate, onUpdate, onCancel }) {
    const [form, setForm] = useState(() => (editing ? toForm(editing) : emptyForm()));
    const [errors, setErrors] = useState({});
    const [pending, setPending] = useState(false);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setPending(true);
        const result = editing ? await onUpdate(editing.id, form) : await onCreate(form);
        setPending(false);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setErrors({});
        if (!editing) setForm(emptyForm());
    };

    return (
        <form css={f.form} onSubmit={submit} noValidate>
            <div css={[f.field, f.wide]}>
                <label css={f.labelText} htmlFor="task-title">
                    제목
                </label>
                <input
                    id="task-title"
                    css={f.input(!!errors.title)}
                    type="text"
                    placeholder="예: 스키마 SQL 작성"
                    value={form.title}
                    onChange={set("title")}
                />
                {errors.title && <span css={f.error}>{errors.title}</span>}
            </div>

            <div css={f.field}>
                <label css={f.labelText} htmlFor="task-due">
                    마감일 (선택)
                </label>
                <input id="task-due" css={f.input(!!errors.dueDate)} type="date" value={form.dueDate} onChange={set("dueDate")} />
                {errors.dueDate && <span css={f.error}>{errors.dueDate}</span>}
            </div>

            <div css={f.field}>
                <label css={f.labelText} htmlFor="task-priority">
                    우선순위
                </label>
                <select id="task-priority" css={f.select(false)} value={form.priority} onChange={set("priority")}>
                    {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                            {PRIORITY_LABEL[p]}
                        </option>
                    ))}
                </select>
            </div>

            <div css={f.field}>
                <label css={f.labelText} htmlFor="task-estimated">
                    예상 시간 (분)
                </label>
                <input
                    id="task-estimated"
                    css={f.input(!!errors.estimatedMinutes)}
                    type="text"
                    inputMode="numeric"
                    placeholder="90"
                    value={form.estimatedMinutes}
                    onChange={set("estimatedMinutes")}
                />
                {errors.estimatedMinutes && <span css={f.error}>{errors.estimatedMinutes}</span>}
            </div>

            <div css={f.field}>
                <label css={f.labelText} htmlFor="task-tags">
                    태그 (쉼표로 구분, 선택)
                </label>
                <input
                    id="task-tags"
                    css={f.input(!!errors.tags)}
                    type="text"
                    placeholder="백엔드, 급함"
                    value={form.tags}
                    onChange={set("tags")}
                />
                {errors.tags && <span css={f.error}>{errors.tags}</span>}
            </div>

            <div css={[f.field, f.wide]}>
                <label css={f.labelText} htmlFor="task-detail">
                    설명 (선택)
                </label>
                <input id="task-detail" css={f.input(!!errors.detail)} type="text" value={form.detail} onChange={set("detail")} />
                {errors.detail && <span css={f.error}>{errors.detail}</span>}
            </div>

            {errors.form && (
                <div css={f.wide}>
                    <span css={f.error}>{errors.form}</span>
                </div>
            )}

            <div css={f.actions}>
                <button type="submit" css={c.primaryButton} disabled={pending}>
                    {editing ? "수정 저장" : "할 일 추가"}
                </button>
                {editing && (
                    <button type="button" css={c.button} onClick={onCancel}>
                        취소
                    </button>
                )}
            </div>
        </form>
    );
}

export default TaskForm;
