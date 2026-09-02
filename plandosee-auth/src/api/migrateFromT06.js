/**
 * 과제 6(plandosee) "전체 내보내기" JSON을 이 앱(과제 7)으로 가져옵니다.
 *
 * 로그인한 클라이언트로 실행해야 합니다 — user_id를 이 코드가 직접 넣지 않고, 각 표의
 * stamp_owner() 트리거가 항상 auth.uid()로 채우게 둡니다(설계도 원칙 4). 그래서
 * service_role 키나 관리자 API 없이도 "내 계정으로 가져온" 데이터가 됩니다.
 *
 * plans.carried_from_review_id는 review_notes(id)를 가리키는데 review_notes.plan_id는
 * 다시 plans(id)를 가리켜 순환합니다 — 원본 스키마와 동일하게, 먼저 carried_from_review_id를
 * 비운 채로 plans를 넣고, review_notes까지 다 넣은 뒤 마지막에 되돌립니다.
 *
 * id는 원본 그대로 유지합니다(업서트) — 다시 실행해도 같은 행에 합쳐질 뿐 중복되지 않습니다.
 */
import { supabase } from "./client";

const toPlanRow = (p) => ({ id: p.id, created_at: p.createdAt, carried_from_review_id: null, deleted_at: p.deletedAt });

const toRevisionRow = (r) => ({
    id: r.id,
    plan_id: r.planId,
    revision_no: r.revisionNo,
    title: r.title,
    period_start: r.periodStart,
    period_end: r.periodEnd,
    priority: r.priority,
    success_criteria: r.successCriteria,
    estimated_minutes: r.estimatedMinutes,
    note: r.note || null,
    created_at: r.createdAt,
});

const toTaskRow = (t) => ({
    id: t.id,
    plan_id: t.planId,
    title: t.title,
    detail: t.detail,
    due_date: t.dueDate,
    priority: t.priority,
    tags: t.tags ?? [],
    estimated_minutes: t.estimatedMinutes,
    status: t.status,
    completed_at: t.completedAt,
    deleted_at: t.deletedAt,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
});

const toExecutionRow = (e) => ({
    id: e.id,
    task_id: e.taskId,
    started_at: e.startedAt,
    ended_at: e.endedAt,
    actual_minutes: e.actualMinutes,
    blocked_reason: e.blockedReason,
    created_at: e.createdAt,
});

const toNoteRow = (n) => ({ id: n.id, plan_id: n.planId, note: n.note, created_at: n.createdAt });

/** @param {ReturnType<typeof import("./exportAll").exportAllData>} exportedData */
export const migrateFromT06 = async (exportedData) => {
    const log = [];

    const plans = exportedData.plans.map(toPlanRow);
    const revisions = exportedData.planRevisions.map(toRevisionRow);
    const tasks = exportedData.tasks.map(toTaskRow);
    const executions = exportedData.executionRecords.map(toExecutionRow);
    const notes = exportedData.reviewNotes.map(toNoteRow);

    let res = await supabase.from("plans").upsert(plans, { onConflict: "id" }).select();
    if (res.error) return { data: null, error: res.error, step: "plans" };
    log.push(`plans: ${res.data.length}건`);

    res = await supabase.from("plan_revisions").upsert(revisions, { onConflict: "id" }).select();
    if (res.error) return { data: null, error: res.error, step: "plan_revisions" };
    log.push(`plan_revisions: ${res.data.length}건`);

    res = await supabase.from("tasks").upsert(tasks, { onConflict: "id" }).select();
    if (res.error) return { data: null, error: res.error, step: "tasks" };
    log.push(`tasks: ${res.data.length}건`);

    res = await supabase.from("execution_records").upsert(executions, { onConflict: "id" }).select();
    if (res.error) return { data: null, error: res.error, step: "execution_records" };
    log.push(`execution_records: ${res.data.length}건`);

    res = await supabase.from("review_notes").upsert(notes, { onConflict: "id" }).select();
    if (res.error) return { data: null, error: res.error, step: "review_notes" };
    log.push(`review_notes: ${res.data.length}건`);

    // 순환을 되돌립니다 — review_notes가 이제 있으니 원래 가리키던 값으로 복원합니다.
    for (const p of exportedData.plans) {
        if (!p.carriedFromReviewId) continue;
        const { error } = await supabase.from("plans").update({ carried_from_review_id: p.carriedFromReviewId }).eq("id", p.id);
        if (error) return { data: null, error, step: "plans.carried_from_review_id 복원" };
        log.push(`plans(${p.id.slice(0, 8)}).carried_from_review_id 복원`);
    }

    return { data: { log }, error: null };
};

if (typeof window !== "undefined") {
    window.__migrateFromT06 = migrateFromT06;
}
