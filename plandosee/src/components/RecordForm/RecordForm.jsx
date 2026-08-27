import { useState } from "react";
import { MAX_MINUTES, TIMEZONE_LABEL, UNIT, checkForm, todayKey } from "../../core/validate";
import * as c from "../../styles/controls";
import * as s from "./styles";

const emptyForm = () => ({ date: todayKey(), subject: "", minutes: "", tag: "", memo: "" });

const toForm = (record) => ({
    date: record.date,
    subject: record.subject,
    minutes: String(record.minutes ?? ""),
    tag: record.tag ?? "",
    memo: record.memo ?? "",
});

/**
 * 추가·수정 입력.
 *
 * 같은 폼이 두 가지 일을 합니다 — editing이 null이면 추가, 있으면 그 id 한 건 수정.
 * 폼을 두 벌 두면 검사 규칙이 갈라지고, 한쪽만 고치는 실수가 생깁니다.
 */
function RecordForm({ editing, onAdd, onUpdate, onCancel }) {
    // 수정 대상이 바뀌면 부모가 key를 바꿔 이 컴포넌트를 다시 마운트합니다.
    // effect로 폼을 되돌리면 렌더가 두 번 도는데, 초기값으로 처리하면 한 번이면 됩니다.
    const [form, setForm] = useState(() => (editing ? toForm(editing) : emptyForm()));
    const [errors, setErrors] = useState({});

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const bump = (amount) =>
        setForm((prev) => {
            const current = Number(prev.minutes);
            const base = Number.isFinite(current) && current > 0 ? current : 0;
            return { ...prev, minutes: String(Math.min(base + amount, MAX_MINUTES)) };
        });

    const submit = (event) => {
        event.preventDefault();
        const checked = checkForm(form);

        if (!checked.ok) {
            setErrors(checked.errors);
            return;
        }

        setErrors({});
        if (editing) onUpdate(editing.id, checked.value);
        else onAdd(checked.value);

        // 추가한 뒤에는 날짜를 남겨 둡니다 — 같은 날 여러 건을 잇달아 넣는 게 보통입니다.
        if (!editing) setForm((prev) => ({ ...emptyForm(), date: prev.date }));
    };

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>{editing ? "기록 수정" : "기록 추가"}</h2>
                <span css={c.panelHint}>
                    단위 {UNIT} · 기준 시간대 {TIMEZONE_LABEL}
                </span>
            </div>

            {editing && (
                <p css={s.editing}>
                    <b>{editing.date}</b> · {editing.subject} 을(를) 고치는 중입니다. 저장하면 이 한
                    건만 바뀝니다.
                </p>
            )}

            <form css={s.form} onSubmit={submit} noValidate>
                <div css={s.field}>
                    <label css={s.labelText} htmlFor="f-date">
                        날짜
                    </label>
                    <input
                        id="f-date"
                        css={s.input(!!errors.date)}
                        type="date"
                        value={form.date}
                        onChange={set("date")}
                    />
                    {errors.date && <span css={s.error}>{errors.date}</span>}
                </div>

                <div css={s.field}>
                    <label css={s.labelText} htmlFor="f-subject">
                        과목
                    </label>
                    <input
                        id="f-subject"
                        css={s.input(!!errors.subject)}
                        type="text"
                        placeholder="알고리즘"
                        value={form.subject}
                        onChange={set("subject")}
                    />
                    {errors.subject && <span css={s.error}>{errors.subject}</span>}
                </div>

                <div css={s.field}>
                    <label css={s.labelText} htmlFor="f-minutes">
                        시간 ({UNIT})
                    </label>
                    <input
                        id="f-minutes"
                        css={s.input(!!errors.minutes)}
                        type="text"
                        inputMode="numeric"
                        placeholder="45"
                        value={form.minutes}
                        onChange={set("minutes")}
                    />
                    <span css={s.quick}>
                        {[10, 30, 60].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                css={s.quickButton}
                                onClick={() => bump(amount)}>
                                +{amount}
                            </button>
                        ))}
                    </span>
                    {errors.minutes && <span css={s.error}>{errors.minutes}</span>}
                </div>

                <div css={s.field}>
                    <label css={s.labelText} htmlFor="f-tag">
                        태그 <span style={{ opacity: 0.6 }}>(v2)</span>
                    </label>
                    <input
                        id="f-tag"
                        css={s.input(false)}
                        type="text"
                        placeholder="집중"
                        value={form.tag}
                        onChange={set("tag")}
                    />
                </div>

                <div css={[s.field, s.wide]}>
                    <label css={s.labelText} htmlFor="f-memo">
                        메모 (선택)
                    </label>
                    <input
                        id="f-memo"
                        css={s.input(!!errors.memo)}
                        type="text"
                        placeholder="무엇을 했는지 한 줄"
                        value={form.memo}
                        onChange={set("memo")}
                    />
                    {errors.memo && <span css={s.error}>{errors.memo}</span>}
                </div>

                <div css={s.actions}>
                    <button type="submit" css={c.primaryButton}>
                        {editing ? "수정 저장" : "추가"}
                    </button>
                    {editing && (
                        <button type="button" css={c.button} onClick={onCancel}>
                            취소
                        </button>
                    )}
                    <span css={c.panelHint}>
                        날짜·과목·시간은 필수입니다. 비면 저장되지 않고 칸 아래에 이유가 뜹니다.
                    </span>
                </div>
            </form>
        </section>
    );
}

export default RecordForm;
