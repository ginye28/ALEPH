/**
 * 인메모리 백엔드.
 *
 * Supabase 자격증명이 없을 때 자동으로 대신 켜집니다 (`client.js`). `supabaseBackend.js`와
 * 정확히 같은 메서드 이름·반환 모양을 가져야 합니다 — 화면 쪽 코드는 어느 쪽이 켜졌는지
 * 몰라도 되게 만드는 게 이 파일의 유일한 존재 이유입니다.
 *
 * "쓰고 나서 다시 읽기" 원칙(구 `storage/records.js`의 `saveAll`)을 여기서도 지킵니다 —
 * 모든 변경은 저장한 값을 그대로 복사해 돌려줍니다. 화면은 보낸 값이 아니라
 * 저장소가 돌려준 값을 그립니다.
 */
import { PRIORITY_WEIGHT } from "../core/priority";
import { computeReview } from "./reviewFilters";

const clone = (value) => JSON.parse(JSON.stringify(value));

export const createMemoryBackend = () => {
    const state = {
        plans: [], // { id, createdAt, carriedFromReviewId }
        planRevisions: [], // { id, planId, revisionNo, title, periodStart, periodEnd, priority, successCriteria, estimatedMinutes, note, createdAt }
        tasks: [], // { id, planId, title, detail, dueDate, priority, tags, estimatedMinutes, status, completedAt, deletedAt, createdAt, updatedAt }
        executionRecords: [], // { id, taskId, startedAt, endedAt, actualMinutes, blockedReason, createdAt }
        reviewNotes: [], // { id, planId, note, createdAt }
    };

    const currentRevisionOf = (planId) => {
        const revisions = state.planRevisions.filter((r) => r.planId === planId);
        if (revisions.length === 0) return null;
        return revisions.reduce((latest, r) => (r.revisionNo > latest.revisionNo ? r : latest));
    };

    const livingTasksOf = (planId) => state.tasks.filter((t) => t.planId === planId && !t.deletedAt);

    const plans = {
        async createWithRevision({ planId, revisionId, carriedFromReviewId = null, revision }) {
            if (!state.plans.some((p) => p.id === planId)) {
                state.plans.push({ id: planId, createdAt: new Date().toISOString(), carriedFromReviewId, deletedAt: null });
            }
            if (!state.planRevisions.some((r) => r.id === revisionId)) {
                state.planRevisions.push({
                    id: revisionId,
                    planId,
                    revisionNo: 1,
                    createdAt: new Date().toISOString(),
                    ...revision,
                });
            }
            return { data: { plan: clone(state.plans.find((p) => p.id === planId)), revision: clone(currentRevisionOf(planId)) }, error: null };
        },
        async addRevision({ planId, revisionId, revision }) {
            if (state.planRevisions.some((r) => r.id === revisionId)) {
                return { data: clone(currentRevisionOf(planId)), error: null };
            }
            const nextNo = (currentRevisionOf(planId)?.revisionNo ?? 0) + 1;
            const row = { id: revisionId, planId, revisionNo: nextNo, createdAt: new Date().toISOString(), ...revision };
            state.planRevisions.push(row);
            return { data: clone(row), error: null };
        },
        async listWithCurrent() {
            const rows = state.plans
                .filter((p) => !p.deletedAt)
                .map((p) => ({ ...p, current: currentRevisionOf(p.id) }));
            rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
            return { data: clone(rows), error: null };
        },
        async history(planId) {
            const rows = state.planRevisions
                .filter((r) => r.planId === planId)
                .sort((a, b) => a.revisionNo - b.revisionNo);
            return { data: clone(rows), error: null };
        },
        async get(planId) {
            const plan = state.plans.find((p) => p.id === planId) ?? null;
            return { data: plan ? clone(plan) : null, error: null };
        },
        async softDelete(planId) {
            const row = state.plans.find((p) => p.id === planId);
            if (!row) return { data: null, error: { message: "계획을 찾지 못했습니다" } };
            if (!row.deletedAt) row.deletedAt = new Date().toISOString();
            return { data: clone(row), error: null };
        },
    };

    const tasks = {
        async create(task) {
            if (state.tasks.some((t) => t.id === task.id)) {
                return { data: clone(state.tasks.find((t) => t.id === task.id)), error: null };
            }
            const now = new Date().toISOString();
            const row = {
                status: "todo",
                completedAt: null,
                deletedAt: null,
                createdAt: now,
                updatedAt: now,
                ...task,
            };
            state.tasks.push(row);
            return { data: clone(row), error: null };
        },
        async update(id, patch) {
            const row = state.tasks.find((t) => t.id === id);
            if (!row) return { data: null, error: { message: "할 일을 찾지 못했습니다" } };
            Object.assign(row, patch, { updatedAt: new Date().toISOString() });
            return { data: clone(row), error: null };
        },
        async complete(id) {
            const row = state.tasks.find((t) => t.id === id);
            if (!row) return { data: null, error: { message: "할 일을 찾지 못했습니다" } };
            // WHERE status <> 'done' 가드와 같은 뜻 — 이미 완료면 아무 것도 바뀌지 않습니다.
            if (row.status !== "done") {
                row.status = "done";
                row.completedAt = new Date().toISOString();
                row.updatedAt = row.completedAt;
            }
            return { data: clone(row), error: null };
        },
        async reopen(id) {
            const row = state.tasks.find((t) => t.id === id);
            if (!row) return { data: null, error: { message: "할 일을 찾지 못했습니다" } };
            if (row.status !== "todo") {
                row.status = "todo";
                row.completedAt = null;
                row.updatedAt = new Date().toISOString();
            }
            return { data: clone(row), error: null };
        },
        async softDelete(id) {
            const row = state.tasks.find((t) => t.id === id);
            if (!row) return { data: null, error: { message: "할 일을 찾지 못했습니다" } };
            row.deletedAt = new Date().toISOString();
            return { data: clone(row), error: null };
        },
        async get(id) {
            const row = state.tasks.find((t) => t.id === id) ?? null;
            return { data: row ? clone(row) : null, error: null };
        },
        async list({ planId, search = "", status = "all", priority = "all", sortBy = "createdAt", sortDir = "desc" } = {}) {
            let rows = state.tasks.filter((t) => !t.deletedAt && (!planId || t.planId === planId));

            const needle = search.trim().toLowerCase();
            if (needle) {
                rows = rows.filter(
                    (t) => t.title.toLowerCase().includes(needle) || (t.detail ?? "").toLowerCase().includes(needle),
                );
            }
            if (status !== "all") rows = rows.filter((t) => t.status === status);
            if (priority !== "all") rows = rows.filter((t) => t.priority === priority);

            const dir = sortDir === "asc" ? 1 : -1;
            const key = (t) => {
                if (sortBy === "priority") return PRIORITY_WEIGHT[t.priority] ?? 0;
                if (sortBy === "dueDate") return t.dueDate ?? "9999-99-99";
                if (sortBy === "estimatedMinutes") return t.estimatedMinutes;
                return t.createdAt;
            };
            rows = [...rows].sort((a, b) => {
                const av = key(a);
                const bv = key(b);
                if (av < bv) return -1 * dir;
                if (av > bv) return 1 * dir;
                return a.id < b.id ? -1 : 1; // 결정적 동점 처리 — 값이 같아도 순서가 매번 같습니다.
            });
            return { data: clone(rows), error: null };
        },
        async listAllByPlan(planId) {
            return { data: clone(livingTasksOf(planId)), error: null };
        },
    };

    const executionRecords = {
        async create(record) {
            if (state.executionRecords.some((r) => r.id === record.id)) {
                return { data: clone(state.executionRecords.find((r) => r.id === record.id)), error: null };
            }
            const row = { createdAt: new Date().toISOString(), ...record };
            state.executionRecords.push(row);
            return { data: clone(row), error: null };
        },
        async listByTask(taskId) {
            const rows = state.executionRecords
                .filter((r) => r.taskId === taskId)
                .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
            return { data: clone(rows), error: null };
        },
        async listByPlan(planId) {
            const taskIds = new Set(livingTasksOf(planId).map((t) => t.id));
            const rows = state.executionRecords.filter((r) => taskIds.has(r.taskId));
            return { data: clone(rows), error: null };
        },
    };

    const reviewNotes = {
        async create({ id, planId, note }) {
            if (state.reviewNotes.some((r) => r.id === id)) {
                return { data: clone(state.reviewNotes.find((r) => r.id === id)), error: null };
            }
            const row = { id, planId, note, createdAt: new Date().toISOString() };
            state.reviewNotes.push(row);
            return { data: clone(row), error: null };
        },
        async get(id) {
            const row = state.reviewNotes.find((r) => r.id === id) ?? null;
            return { data: row ? clone(row) : null, error: null };
        },
    };

    const review = async (planId, todayKey) => {
        const planTasks = livingTasksOf(planId);
        const taskIds = new Set(planTasks.map((t) => t.id));
        const records = state.executionRecords.filter((r) => taskIds.has(r.taskId));
        return { data: computeReview(planTasks, records, todayKey), error: null };
    };

    // 실제 배포에서는 Postgres 함수가 계산하지만, 인메모리 환경에서는 같은 계산을 그대로 재사용합니다 —
    // check.mjs가 "화면 숫자 == RPC 숫자"를 두 배경 모두에서 같은 방식으로 검사할 수 있게 합니다.
    const rpcPlanReview = review;

    const exportAll = async () => ({
        data: clone({
            exportedAt: new Date().toISOString(),
            plans: state.plans,
            planRevisions: state.planRevisions,
            tasks: state.tasks,
            executionRecords: state.executionRecords,
            reviewNotes: state.reviewNotes,
        }),
        error: null,
    });

    return { plans, tasks, executionRecords, reviewNotes, review, rpcPlanReview, exportAll };
};
