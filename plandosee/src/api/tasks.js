/**
 * 할 일 API.
 *
 * 완료·되돌리기·삭제는 값을 검사할 게 없는 상태 전이라 검사를 거치지 않고 바로
 * 저장소를 부릅니다 — 저장소 쪽(각 backend의 `complete`/`softDelete`)이 이미
 * WHERE로 가드돼 있어 몇 번을 다시 눌러도 안전합니다.
 */
import { newId } from "../core/ids";
import { checkTaskForm } from "../core/validate";
import { db } from "./client";

export const listTasks = (options) => db.tasks.list(options);
export const getTask = (id) => db.tasks.get(id);

export const createTask = async (planId, form) => {
    const checked = checkTaskForm(form);
    if (!checked.ok) return { ok: false, errors: checked.errors };

    const { data, error } = await db.tasks.create({ id: newId(), planId, ...checked.value });
    if (error) return { ok: false, errors: { form: `저장하지 못했습니다: ${error.message}` } };
    return { ok: true, data };
};

export const updateTask = async (id, form) => {
    const checked = checkTaskForm(form);
    if (!checked.ok) return { ok: false, errors: checked.errors };

    const { data, error } = await db.tasks.update(id, checked.value);
    if (error) return { ok: false, errors: { form: `저장하지 못했습니다: ${error.message}` } };
    return { ok: true, data };
};

const asResult = ({ data, error }) => (error ? { ok: false, errors: { form: error.message } } : { ok: true, data });

export const completeTask = (id) => db.tasks.complete(id).then(asResult);
export const reopenTask = (id) => db.tasks.reopen(id).then(asResult);
export const deleteTask = (id) => db.tasks.softDelete(id).then(asResult);
