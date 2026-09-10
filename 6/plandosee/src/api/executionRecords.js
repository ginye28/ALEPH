/**
 * 실행 기록 API.
 *
 * 시각은 화면에서 KST 벽시계 시각(`datetime-local`)으로 받아 `kstLocalToISO`로
 * 못박아 저장합니다 — 기기 시간대가 KST가 아니어도 항상 같은 시각으로 저장됩니다.
 */
import { kstLocalToISO } from "../core/dates";
import { newId } from "../core/ids";
import { checkExecutionForm } from "../core/validate";
import { db } from "./client";

export const listExecutionsByTask = (taskId) => db.executionRecords.listByTask(taskId);
export const listExecutionsByPlan = (planId) => db.executionRecords.listByPlan(planId);

export const createExecution = async (taskId, form) => {
    const checked = checkExecutionForm(form);
    if (!checked.ok) return { ok: false, errors: checked.errors };

    const startedAt = kstLocalToISO(checked.value.startedAt);
    if (!startedAt) return { ok: false, errors: { startedAt: "시작 시각을 확인해주세요" } };
    const endedAt = checked.value.endedAt ? kstLocalToISO(checked.value.endedAt) : null;

    const { data, error } = await db.executionRecords.create({
        id: newId(),
        taskId,
        startedAt,
        endedAt,
        actualMinutes: checked.value.actualMinutes,
        blockedReason: checked.value.blockedReason,
    });
    if (error) return { ok: false, errors: { form: `저장하지 못했습니다: ${error.message}` } };
    return { ok: true, data };
};
