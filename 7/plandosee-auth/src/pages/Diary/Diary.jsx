import { useCallback, useEffect, useRef, useState } from "react";
import { exportAllData } from "../../api/exportAll";
import { createExecution, listAllExecutions, listExecutionsByTask } from "../../api/executionRecords";
import { addReviewNote, getReview } from "../../api/reviews";
import { createPlan, deletePlan, listPlans, planHistory, revisePlan } from "../../api/plans";
import { completeTask, createTask, deleteTask, listTasks, reopenTask, updateTask } from "../../api/tasks";
import { backendMode } from "../../api/client";
import { filterTasks } from "../../api/reviewFilters";
import { useSession } from "../../hooks/useSession";
import AccountSection from "../../components/AccountSection/AccountSection";
import DailySection from "../../components/DailySection/DailySection";
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

// 계획 목록과 각 계획의 개정 이력을 서버에서 읽기만 합니다(상태는 건드리지 않습니다).
const loadPlansWithHistory = async () => {
    const { data } = await listPlans();
    const rows = data ?? [];
    const entries = await Promise.all(rows.map(async (p) => [p.id, (await planHistory(p.id)).data ?? []]));
    return { rows, history: Object.fromEntries(entries) };
};

function Diary() {
    const session = useSession();
    const [plans, setPlans] = useState([]);
    const [history, setHistory] = useState({});
    const [selectedPlanId, setSelectedPlanId] = useState(null);

    const [taskFilters, setTaskFilters] = useState(DEFAULT_FILTERS);
    const [tasks, setTasks] = useState([]);
    const [reviewFilter, setReviewFilter] = useState(null);

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [executionRecords, setExecutionRecords] = useState([]);
    // 날짜별 집계(카드 5)는 계획·할일 경계를 넘어 내 실행기록 전체를 봅니다.
    const [allExecutions, setAllExecutions] = useState([]);

    const [reviewStats, setReviewStats] = useState(null);
    const [carryNote, setCarryNote] = useState(null);

    const planSectionRef = useRef(null);
    const taskSectionRef = useRef(null);
    const executionSectionRef = useRef(null);
    const reviewSectionRef = useRef(null);

    const refreshPlans = useCallback(async () => {
        const { rows, history: nextHistory } = await loadPlansWithHistory();
        setPlans(rows);
        setHistory(nextHistory);
        return rows;
    }, []);

    // 계획이 선택되지 않았을 때 화면에 보이는 할일·돌아보기는 아래에서 값을 비워 그립니다(selectedPlanId ? … : …).
    // 그래서 여기서는 계획이 없으면 아무것도 읽지 않고 돌아갑니다.
    const refreshTasks = useCallback(async (planId, filters) => {
        if (!planId) return;
        const { data } = await listTasks({ planId, ...filters });
        setTasks(data ?? []);
    }, []);

    const refreshReview = useCallback(async (planId) => {
        if (!planId) return;
        const { data } = await getReview(planId, todayKey());
        setReviewStats(data);
    }, []);

    // 첫 로드
    const refreshAllExecutions = useCallback(async () => {
        const { data } = await listAllExecutions();
        setAllExecutions(data ?? []);
    }, []);

    useEffect(() => {
        let cancelled = false;
        loadPlansWithHistory().then(({ rows, history: nextHistory }) => {
            if (cancelled) return;
            setPlans(rows);
            setHistory(nextHistory);
            if (rows.length > 0) setSelectedPlanId(rows[0].id);
        });
        listAllExecutions().then(({ data }) => {
            if (!cancelled) setAllExecutions(data ?? []);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // check.mjs가 window.__db로 직접 만든 계획을 화면(React 상태)에도 반영시키는 용도입니다.
    // 새로고침 없이 다시 읽어야 메모리 백엔드의 상태가 그대로 유지됩니다.
    useEffect(() => {
        window.__reloadPlans = async () => {
            const rows = await refreshPlans();
            if (rows.length > 0 && !selectedPlanId) setSelectedPlanId(rows[0].id);
        };
        // 날짜별 집계도 같은 이유로 다시 읽을 수 있게 열어 둡니다 — check.mjs가 window.__db로
        // 직접 심은 실행기록을 화면이 서버에서 다시 읽어 그리는지 보려면 필요합니다(검사 40).
        window.__reloadDaily = refreshAllExecutions;
    }, [refreshPlans, refreshAllExecutions, selectedPlanId]);

    // 선택한 계획·필터가 바뀌면 고른 할일과 돌아보기 필터를 풉니다. 효과 안에서 setState를 부르면
    // 한 번 더 그려지므로, React 문서가 권하는 방식대로 "이전 값과 달라졌는지"를 그리는 중에 비교해 바로 바꿉니다.
    const planFilterKey = `${selectedPlanId}|${JSON.stringify(taskFilters)}`;
    const [prevPlanFilterKey, setPrevPlanFilterKey] = useState(planFilterKey);
    if (planFilterKey !== prevPlanFilterKey) {
        setPrevPlanFilterKey(planFilterKey);
        setSelectedTaskId(null);
        setReviewFilter(null);
    }

    // 선택한 계획·필터가 바뀌면 할일·돌아보기를 다시 읽습니다.
    // 응답이 늦게 도착했을 때 이미 다른 계획으로 바뀐 화면을 덮어쓰지 않도록 취소 표시를 둡니다.
    useEffect(() => {
        if (!selectedPlanId) return;
        let cancelled = false;
        listTasks({ planId: selectedPlanId, ...taskFilters }).then(({ data }) => {
            if (!cancelled) setTasks(data ?? []);
        });
        getReview(selectedPlanId, todayKey()).then(({ data }) => {
            if (!cancelled) setReviewStats(data);
        });
        return () => {
            cancelled = true;
        };
    }, [selectedPlanId, taskFilters]);

    useEffect(() => {
        if (!selectedTaskId) return;
        let cancelled = false;
        listExecutionsByTask(selectedTaskId).then(({ data }) => {
            if (!cancelled) setExecutionRecords(data ?? []);
        });
        return () => {
            cancelled = true;
        };
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

    const handleDeletePlan = async (planId) => {
        const result = await deletePlan(planId);
        if (result.ok) {
            const rows = await refreshPlans();
            if (selectedPlanId === planId) setSelectedPlanId(rows[0]?.id ?? null);
        }
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
            await refreshAllExecutions();
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
    // 계획이나 할일을 고르지 않았으면 예전에 읽어 둔 값이 남아 있어도 비어 있는 것으로 그립니다.
    const shownTasks = selectedPlanId ? tasks : [];
    const shownStats = selectedPlanId ? reviewStats : null;
    const shownRecords = selectedTaskId ? executionRecords : [];
    const selectedTask = shownTasks.find((t) => t.id === selectedTaskId) ?? null;
    const visibleTasks = reviewFilter
        ? filterTasks(shownTasks, reviewFilter, { todayKey: todayKey(), blockedIds: shownStats?.blockedIds ?? new Set() })
        : shownTasks;

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
                    {session?.user?.email && <span css={s.stamp} data-testid="session-email">{session.user.email}</span>}
                    {backendMode === "memory" && <span css={s.stamp}>⚠ Supabase 미설정 — 임시 메모리 저장소</span>}
                </div>
            </header>

            <div css={s.sections}>
                <PlanSection
                    sectionRef={planSectionRef}
                    plans={plans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlan={setSelectedPlanId}
                    history={history}
                    onCreate={handleCreatePlan}
                    onRevise={handleRevisePlan}
                    onDelete={handleDeletePlan}
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
                    records={shownRecords}
                    onCreate={handleCreateExecution}
                />

                <ReviewSection
                    sectionRef={reviewSectionRef}
                    plan={selectedPlan}
                    stats={shownStats ?? { planCount: 0, doneCount: 0, overdueCount: 0, blockedCount: 0, estimatedTotal: 0, actualTotal: 0, diff: 0 }}
                    onFilterClick={handleReviewFilterClick}
                    activeFilter={reviewFilter}
                    onAddNote={handleAddNote}
                    onCarryToNewPlan={handleCarryToNewPlan}
                />

                <DailySection records={allExecutions} />

                <ExportSection onExportAll={exportAllData} />

                <AccountSection email={session?.user?.email ?? ""} onSignedOut={() => {}} />
            </div>

            <footer css={s.footer}>
                <p css={c.note}>
                    계획·할일·실행기록은 서버의 실제 데이터베이스에 저장되고, 로그인한 내 계정
                    소유의 행만 서버(RLS)가 돌려줍니다.
                </p>
            </footer>
        </main>
    );
}

export default Diary;
