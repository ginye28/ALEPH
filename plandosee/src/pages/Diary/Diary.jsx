import { useCallback, useEffect, useRef, useState } from "react";
import { exportAllData } from "../../api/exportAll";
import { createExecution, listExecutionsByTask } from "../../api/executionRecords";
import { addReviewNote, getReview } from "../../api/reviews";
import { createPlan, listPlans, planHistory, revisePlan } from "../../api/plans";
import { completeTask, createTask, deleteTask, listTasks, reopenTask, updateTask } from "../../api/tasks";
import { backendMode } from "../../api/client";
import { filterTasks } from "../../api/reviewFilters";
import ExecutionSection from "../../components/ExecutionSection/ExecutionSection";
import ExportSection from "../../components/ExportSection/ExportSection";
import PlanSection from "../../components/PlanSection/PlanSection";
import ReviewSection from "../../components/ReviewSection/ReviewSection";
import TaskSection from "../../components/TaskSection/TaskSection";
import { TIMEZONE_LABEL, todayKey } from "../../core/validate";
import * as c from "../../styles/controls";
import * as s from "./styles";

const DEFAULT_FILTERS = { search: "", status: "all", priority: "all", sortBy: "createdAt", sortDir: "desc" };

const scrollTo = (ref) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollBy({ top: box.top - 20, behavior: reduceMotion ? "auto" : "smooth" });
};

function Diary() {
    const [plans, setPlans] = useState([]);
    const [history, setHistory] = useState({});
    const [selectedPlanId, setSelectedPlanId] = useState(null);

    const [taskFilters, setTaskFilters] = useState(DEFAULT_FILTERS);
    const [tasks, setTasks] = useState([]);
    const [reviewFilter, setReviewFilter] = useState(null);

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [executionRecords, setExecutionRecords] = useState([]);

    const [reviewStats, setReviewStats] = useState(null);
    const [carryNote, setCarryNote] = useState(null);

    const planSectionRef = useRef(null);
    const taskSectionRef = useRef(null);
    const executionSectionRef = useRef(null);
    const reviewSectionRef = useRef(null);

    const refreshPlans = useCallback(async () => {
        const { data } = await listPlans();
        const rows = data ?? [];
        setPlans(rows);
        const entries = await Promise.all(rows.map(async (p) => [p.id, (await planHistory(p.id)).data ?? []]));
        setHistory(Object.fromEntries(entries));
        return rows;
    }, []);

    const refreshTasks = useCallback(async (planId, filters) => {
        if (!planId) {
            setTasks([]);
            return;
        }
        const { data } = await listTasks({ planId, ...filters });
        setTasks(data ?? []);
    }, []);

    const refreshReview = useCallback(async (planId) => {
        if (!planId) {
            setReviewStats(null);
            return;
        }
        const { data } = await getReview(planId, todayKey());
        setReviewStats(data);
    }, []);

    // 첫 로드
    useEffect(() => {
        refreshPlans().then((rows) => {
            if (rows.length > 0) setSelectedPlanId(rows[0].id);
        });
    }, [refreshPlans]);

    // check.mjs가 window.__db로 직접 만든 계획을 화면(React 상태)에도 반영시키는 용도입니다.
    // 새로고침 없이 다시 읽어야 메모리 백엔드의 상태가 그대로 유지됩니다.
    useEffect(() => {
        window.__reloadPlans = async () => {
            const rows = await refreshPlans();
            if (rows.length > 0 && !selectedPlanId) setSelectedPlanId(rows[0].id);
        };
    }, [refreshPlans, selectedPlanId]);

    // 선택한 계획·필터가 바뀌면 할일·돌아보기를 다시 읽습니다.
    useEffect(() => {
        refreshTasks(selectedPlanId, taskFilters);
        refreshReview(selectedPlanId);
        setSelectedTaskId(null);
        setReviewFilter(null);
    }, [selectedPlanId, taskFilters, refreshTasks, refreshReview]);

    useEffect(() => {
        if (!selectedTaskId) {
            setExecutionRecords([]);
            return;
        }
        listExecutionsByTask(selectedTaskId).then(({ data }) => setExecutionRecords(data ?? []));
    }, [selectedTaskId]);

    const afterTaskMutation = async () => {
        await Promise.all([refreshTasks(selectedPlanId, taskFilters), refreshReview(selectedPlanId)]);
    };

    const handleCreatePlan = async (form) => {
        const result = await createPlan(form, { carriedFromReviewId: carryNote?.id ?? null });
        if (result.ok) {
            setCarryNote(null);
            const rows = await refreshPlans();
            const created = rows.find((p) => p.id === result.data.plan.id);
            if (created) setSelectedPlanId(created.id);
        }
        return result;
    };

    const handleRevisePlan = async (planId, form) => {
        const result = await revisePlan(planId, form);
        if (result.ok) await refreshPlans();
        return result;
    };

    const handleCreateTask = async (planId, form) => {
        const result = await createTask(planId, form);
        if (result.ok) await afterTaskMutation();
        return result;
    };

    const handleUpdateTask = async (id, form) => {
        const result = await updateTask(id, form);
        if (result.ok) await afterTaskMutation();
        return result;
    };

    const handleComplete = async (id) => {
        await completeTask(id);
        await afterTaskMutation();
    };

    const handleReopen = async (id) => {
        await reopenTask(id);
        await afterTaskMutation();
    };

    const handleDelete = async (id) => {
        await deleteTask(id);
        if (selectedTaskId === id) setSelectedTaskId(null);
        await afterTaskMutation();
    };

    const handleSelectTask = (id) => {
        setSelectedTaskId((prev) => (prev === id ? null : id));
        scrollTo(executionSectionRef);
    };

    const handleCreateExecution = async (taskId, form) => {
        const result = await createExecution(taskId, form);
        if (result.ok) {
            const { data } = await listExecutionsByTask(taskId);
            setExecutionRecords(data ?? []);
            await refreshReview(selectedPlanId);
        }
        return result;
    };

    const handleReviewFilterClick = (filter) => {
        setReviewFilter(filter === "all" ? null : filter);
        scrollTo(taskSectionRef);
    };

    const handleAddNote = (planId, text) => addReviewNote(planId, text);

    const handleCarryToNewPlan = (note) => {
        setCarryNote(note);
        scrollTo(planSectionRef);
    };

    const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
    const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
    const visibleTasks = reviewFilter
        ? filterTasks(tasks, reviewFilter, { todayKey: todayKey(), blockedIds: reviewStats?.blockedIds ?? new Set() })
        : tasks;

    return (
        <main css={s.page}>
            <header css={s.masthead}>
                <div>
                    <h1 css={s.title}>플랜두씨 다이어리 2</h1>
                    <p css={s.subtitle}>
                        계획(Plan) → 실제로 한 일(Do) → 돌아보기(See) · 기준 시간대 {TIMEZONE_LABEL}
                    </p>
                </div>
                <div css={s.stampRow}>
                    <span css={s.stamp}>오늘 {todayKey()}</span>
                    {backendMode === "memory" && <span css={s.stamp}>⚠ Supabase 미설정 — 임시 메모리 저장소</span>}
                </div>
            </header>

            <p css={s.noLoginBanner} data-testid="no-login-banner">
                지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만
                넣으세요.
            </p>

            <div css={s.sections}>
                <PlanSection
                    sectionRef={planSectionRef}
                    plans={plans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlan={setSelectedPlanId}
                    history={history}
                    onCreate={handleCreatePlan}
                    onRevise={handleRevisePlan}
                    carryNote={carryNote}
                />

                <TaskSection
                    sectionRef={taskSectionRef}
                    planId={selectedPlanId}
                    tasks={visibleTasks}
                    filters={taskFilters}
                    onFiltersChange={setTaskFilters}
                    reviewFilter={reviewFilter}
                    onClearReviewFilter={() => setReviewFilter(null)}
                    onCreate={handleCreateTask}
                    onUpdate={handleUpdateTask}
                    onComplete={handleComplete}
                    onReopen={handleReopen}
                    onDelete={handleDelete}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={handleSelectTask}
                />

                <ExecutionSection
                    sectionRef={executionSectionRef}
                    task={selectedTask}
                    records={executionRecords}
                    onCreate={handleCreateExecution}
                />

                <ReviewSection
                    sectionRef={reviewSectionRef}
                    plan={selectedPlan}
                    stats={reviewStats ?? { planCount: 0, doneCount: 0, overdueCount: 0, blockedCount: 0, estimatedTotal: 0, actualTotal: 0, diff: 0 }}
                    onFilterClick={handleReviewFilterClick}
                    activeFilter={reviewFilter}
                    onAddNote={handleAddNote}
                    onCarryToNewPlan={handleCarryToNewPlan}
                />

                <ExportSection onExportAll={exportAllData} />
            </div>

            <footer css={s.footer}>
                <p css={c.note}>
                    계획·할일·실행기록은 서버의 실제 데이터베이스에 저장됩니다. 잠그는 일(로그인)은
                    과제 7에서 합니다.
                </p>
            </footer>
        </main>
    );
}

export default Diary;
