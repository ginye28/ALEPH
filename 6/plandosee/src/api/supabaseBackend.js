/**
 * Supabase 백엔드.
 *
 * `memoryBackend.js`와 정확히 같은 메서드 이름·반환 모양(`{data, error}`, camelCase 필드)을
 * 냅니다. DB 컬럼은 snake_case라 각 함수 끝에서 한 번만 변환합니다.
 *
 * 생성 액션은 전부 클라이언트가 미리 만든 id로 upsert합니다 — 중복 요청이 와도
 * 기본키 제약이 실제 방지막이 되어, 몇 번을 다시 보내도 한 행만 남습니다.
 * 완료·소프트삭제 같은 상태 전이는 WHERE로 가드한 UPDATE만 쓰고, 0행이 바뀌어도
 * (=이미 그 상태) 성공으로 보고 현재 값을 다시 읽어 돌려줍니다.
 */
import { PRIORITY_WEIGHT } from "../core/priority";
import { computeReview } from "./reviewFilters";

const planFromDb = (row) => ({
    id: row.id,
    createdAt: row.created_at,
    carriedFromReviewId: row.carried_from_review_id,
    deletedAt: row.deleted_at,
});

const revisionFromDb = (row) => ({
    id: row.id,
    planId: row.plan_id,
    revisionNo: row.revision_no,
    title: row.title,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    priority: row.priority,
    successCriteria: row.success_criteria,
    estimatedMinutes: row.estimated_minutes,
    note: row.note,
    createdAt: row.created_at,
});

const taskFromDb = (row) => ({
    id: row.id,
    planId: row.plan_id,
    title: row.title,
    detail: row.detail,
    dueDate: row.due_date,
    priority: row.priority,
    tags: row.tags ?? [],
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    completedAt: row.completed_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const executionFromDb = (row) => ({
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    actualMinutes: row.actual_minutes,
    blockedReason: row.blocked_reason,
    createdAt: row.created_at,
});

const reviewNoteFromDb = (row) => ({
    id: row.id,
    planId: row.plan_id,
    note: row.note,
    createdAt: row.created_at,
});

export const createSupabaseBackend = (supabase) => {
    const plans = {
        async createWithRevision({ planId, revisionId, carriedFromReviewId = null, revision }) {
            const { data: planRow, error: planError } = await supabase
                .from("plans")
                .upsert({ id: planId, carried_from_review_id: carriedFromReviewId }, { onConflict: "id" })
                .select()
                .single();
            if (planError) return { data: null, error: planError };

            const { data: revRow, error: revError } = await supabase
                .from("plan_revisions")
                .upsert(
                    {
                        id: revisionId,
                        plan_id: planId,
                        revision_no: 1,
                        title: revision.title,
                        period_start: revision.periodStart,
                        period_end: revision.periodEnd,
                        priority: revision.priority,
                        success_criteria: revision.successCriteria,
                        estimated_minutes: revision.estimatedMinutes,
                        note: revision.note,
                    },
                    { onConflict: "id" },
                )
                .select()
                .single();
            if (revError) return { data: null, error: revError };

            return { data: { plan: planFromDb(planRow), revision: revisionFromDb(revRow) }, error: null };
        },

        async addRevision({ planId, revisionId, revision }) {
            const { data: latest, error: latestError } = await supabase
                .from("plan_revisions")
                .select("revision_no")
                .eq("plan_id", planId)
                .order("revision_no", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (latestError) return { data: null, error: latestError };

            const nextNo = (latest?.revision_no ?? 0) + 1;
            const { data, error } = await supabase
                .from("plan_revisions")
                .upsert(
                    {
                        id: revisionId,
                        plan_id: planId,
                        revision_no: nextNo,
                        title: revision.title,
                        period_start: revision.periodStart,
                        period_end: revision.periodEnd,
                        priority: revision.priority,
                        success_criteria: revision.successCriteria,
                        estimated_minutes: revision.estimatedMinutes,
                        note: revision.note,
                    },
                    { onConflict: "id" },
                )
                .select()
                .single();
            if (error) return { data: null, error };
            return { data: revisionFromDb(data), error: null };
        },

        async listWithCurrent() {
            const { data: planRows, error: planError } = await supabase
                .from("plans")
                .select("*")
                .is("deleted_at", null)
                .order("created_at", { ascending: false });
            if (planError) return { data: null, error: planError };

            const { data: currentRows, error: currentError } = await supabase.from("plan_current").select("*");
            if (currentError) return { data: null, error: currentError };

            const currentByPlan = new Map(currentRows.map((r) => [r.plan_id, revisionFromDb(r)]));
            return {
                data: planRows.map((p) => ({ ...planFromDb(p), current: currentByPlan.get(p.id) ?? null })),
                error: null,
            };
        },

        async history(planId) {
            const { data, error } = await supabase
                .from("plan_revisions")
                .select("*")
                .eq("plan_id", planId)
                .order("revision_no", { ascending: true });
            if (error) return { data: null, error };
            return { data: data.map(revisionFromDb), error: null };
        },

        async get(planId) {
            const { data, error } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
            if (error) return { data: null, error };
            return { data: data ? planFromDb(data) : null, error: null };
        },

        async softDelete(planId) {
            const { data, error } = await supabase
                .from("plans")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", planId)
                .is("deleted_at", null)
                .select();
            if (error) return { data: null, error };
            if (data.length > 0) return { data: planFromDb(data[0]), error: null };
            return plans.get(planId); // 이미 지워짐 — 현재 값을 그대로 돌려줍니다.
        },
    };

    const tasks = {
        async create(task) {
            const { data, error } = await supabase
                .from("tasks")
                .upsert(
                    {
                        id: task.id,
                        plan_id: task.planId,
                        title: task.title,
                        detail: task.detail,
                        due_date: task.dueDate,
                        priority: task.priority,
                        tags: task.tags ?? [],
                        estimated_minutes: task.estimatedMinutes,
                    },
                    { onConflict: "id" },
                )
                .select()
                .single();
            if (error) return { data: null, error };
            return { data: taskFromDb(data), error: null };
        },

        async update(id, patch) {
            const row = {};
            if (patch.title !== undefined) row.title = patch.title;
            if (patch.detail !== undefined) row.detail = patch.detail;
            if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
            if (patch.priority !== undefined) row.priority = patch.priority;
            if (patch.tags !== undefined) row.tags = patch.tags;
            if (patch.estimatedMinutes !== undefined) row.estimated_minutes = patch.estimatedMinutes;
            row.updated_at = new Date().toISOString();

            const { data, error } = await supabase.from("tasks").update(row).eq("id", id).select().single();
            if (error) return { data: null, error };
            return { data: taskFromDb(data), error: null };
        },

        async complete(id) {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("tasks")
                .update({ status: "done", completed_at: now, updated_at: now })
                .eq("id", id)
                .neq("status", "done")
                .select();
            if (error) return { data: null, error };
            if (data.length > 0) return { data: taskFromDb(data[0]), error: null };
            return tasks.get(id); // 이미 완료 — 두 번째 호출은 0행에 적용되므로 현재 값을 그대로 돌려줍니다.
        },

        async reopen(id) {
            const { data, error } = await supabase
                .from("tasks")
                .update({ status: "todo", completed_at: null, updated_at: new Date().toISOString() })
                .eq("id", id)
                .eq("status", "done")
                .select();
            if (error) return { data: null, error };
            if (data.length > 0) return { data: taskFromDb(data[0]), error: null };
            return tasks.get(id);
        },

        async softDelete(id) {
            const { data, error } = await supabase
                .from("tasks")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id)
                .is("deleted_at", null)
                .select();
            if (error) return { data: null, error };
            if (data.length > 0) return { data: taskFromDb(data[0]), error: null };
            return tasks.get(id);
        },

        async get(id) {
            const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
            if (error) return { data: null, error };
            return { data: data ? taskFromDb(data) : null, error: null };
        },

        async list({ planId, search = "", status = "all", priority = "all", sortBy = "createdAt", sortDir = "desc" } = {}) {
            let query = supabase.from("tasks").select("*").is("deleted_at", null);
            if (planId) query = query.eq("plan_id", planId);
            if (status !== "all") query = query.eq("status", status);
            if (priority !== "all") query = query.eq("priority", priority);
            const needle = search.trim();
            if (needle) query = query.ilike("title", `%${needle}%`);

            const ascending = sortDir === "asc";
            if (sortBy !== "priority") {
                const column = sortBy === "dueDate" ? "due_date" : sortBy === "estimatedMinutes" ? "estimated_minutes" : "created_at";
                query = query.order(column, { ascending, nullsFirst: false }).order("id", { ascending: true });
            }

            const { data, error } = await query;
            if (error) return { data: null, error };
            let rows = data.map(taskFromDb);

            // Postgres 텍스트 정렬은 'high'<'low'<'medium' 순이라 뜻이 없어, 우선순위만 이 자리에서
            // 같은 가중치로 다시 정렬합니다 — memoryBackend와 동일한 규칙, 동점 처리도 동일합니다.
            if (sortBy === "priority") {
                const dir = ascending ? 1 : -1;
                rows = rows.sort((a, b) => {
                    const av = PRIORITY_WEIGHT[a.priority] ?? 0;
                    const bv = PRIORITY_WEIGHT[b.priority] ?? 0;
                    if (av !== bv) return (av - bv) * dir;
                    return a.id < b.id ? -1 : 1;
                });
            }
            return { data: rows, error: null };
        },

        async listAllByPlan(planId) {
            const { data, error } = await supabase.from("tasks").select("*").eq("plan_id", planId).is("deleted_at", null);
            if (error) return { data: null, error };
            return { data: data.map(taskFromDb), error: null };
        },
    };

    const executionRecords = {
        async create(record) {
            const { data, error } = await supabase
                .from("execution_records")
                .upsert(
                    {
                        id: record.id,
                        task_id: record.taskId,
                        started_at: record.startedAt,
                        ended_at: record.endedAt,
                        actual_minutes: record.actualMinutes,
                        blocked_reason: record.blockedReason,
                    },
                    { onConflict: "id" },
                )
                .select()
                .single();
            if (error) return { data: null, error };
            return { data: executionFromDb(data), error: null };
        },

        async listByTask(taskId) {
            const { data, error } = await supabase
                .from("execution_records")
                .select("*")
                .eq("task_id", taskId)
                .order("started_at", { ascending: false });
            if (error) return { data: null, error };
            return { data: data.map(executionFromDb), error: null };
        },

        async listByPlan(planId) {
            const { data: planTasks, error: taskError } = await tasks.listAllByPlan(planId);
            if (taskError) return { data: null, error: taskError };
            const ids = planTasks.map((t) => t.id);
            if (ids.length === 0) return { data: [], error: null };

            const { data, error } = await supabase.from("execution_records").select("*").in("task_id", ids);
            if (error) return { data: null, error };
            return { data: data.map(executionFromDb), error: null };
        },
    };

    const reviewNotes = {
        async create({ id, planId, note }) {
            const { data, error } = await supabase
                .from("review_notes")
                .upsert({ id, plan_id: planId, note }, { onConflict: "id" })
                .select()
                .single();
            if (error) return { data: null, error };
            return { data: reviewNoteFromDb(data), error: null };
        },
        async get(id) {
            const { data, error } = await supabase.from("review_notes").select("*").eq("id", id).maybeSingle();
            if (error) return { data: null, error };
            return { data: data ? reviewNoteFromDb(data) : null, error: null };
        },
    };

    // 화면에 쓰는 집계는 항상 이 JS 계산을 씁니다 — 드릴다운 목록과 같은 함수를 거치므로
    // 숫자와 목록이 어긋날 수 없습니다. 아래 rpcPlanReview는 별도의 서버 계산 검증용입니다.
    const review = async (planId, todayKey) => {
        const [{ data: planTasks, error: taskError }, { data: records, error: recError }] = await Promise.all([
            tasks.listAllByPlan(planId),
            executionRecords.listByPlan(planId),
        ]);
        if (taskError) return { data: null, error: taskError };
        if (recError) return { data: null, error: recError };
        return { data: computeReview(planTasks, records, todayKey), error: null };
    };

    // 실제 Postgres 함수를 호출합니다 — check.mjs가 "화면 숫자 == DB가 직접 계산한 숫자"를
    // 교차검증하는 용도입니다.
    const rpcPlanReview = async (planId, todayKey) => {
        const { data, error } = await supabase.rpc("plan_review", { p_plan_id: planId, p_today: todayKey });
        if (error) return { data: null, error };
        const row = data?.[0];
        if (!row) return { data: null, error: { message: "plan_review가 빈 결과를 돌려줬습니다" } };
        return {
            data: {
                planCount: row.plan_count,
                doneCount: row.done_count,
                overdueCount: row.overdue_count,
                blockedCount: row.blocked_count,
                estimatedTotal: row.estimated_total,
                actualTotal: row.actual_total,
                diff: row.diff,
            },
            error: null,
        };
    };

    const exportAll = async () => {
        const [plansRes, revisionsRes, tasksRes, executionRes, notesRes] = await Promise.all([
            supabase.from("plans").select("*"),
            supabase.from("plan_revisions").select("*"),
            supabase.from("tasks").select("*"),
            supabase.from("execution_records").select("*"),
            supabase.from("review_notes").select("*"),
        ]);
        const firstError = [plansRes, revisionsRes, tasksRes, executionRes, notesRes].find((r) => r.error)?.error;
        if (firstError) return { data: null, error: firstError };

        return {
            data: {
                exportedAt: new Date().toISOString(),
                plans: plansRes.data.map(planFromDb),
                planRevisions: revisionsRes.data.map(revisionFromDb),
                tasks: tasksRes.data.map(taskFromDb),
                executionRecords: executionRes.data.map(executionFromDb),
                reviewNotes: notesRes.data.map(reviewNoteFromDb),
            },
            error: null,
        };
    };

    return { plans, tasks, executionRecords, reviewNotes, review, rpcPlanReview, exportAll };
};
