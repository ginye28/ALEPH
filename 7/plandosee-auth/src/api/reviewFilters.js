/**
 * 돌아보기 집계와 드릴다운이 같은 조건식을 공유합니다 (설계 원칙 10).
 *
 * 숫자를 세는 조건과 "그 숫자를 눌렀을 때 보여줄 목록"의 조건이 따로 정의되면
 * 언젠가 둘이 어긋납니다. 그래서 조건은 여기 한 곳에만 있고, 집계도 목록도
 * 전부 이 함수를 거쳐서만 나옵니다.
 */

/** 막힌 이유가 하나라도 적힌 실행 기록이 붙은 할 일 id 집합. */
export const blockedTaskIdSet = (executionRecords) =>
    new Set(
        executionRecords
            .filter((r) => r.blockedReason && r.blockedReason.trim() !== "")
            .map((r) => r.taskId),
    );

/**
 * 할 일 하나가 분류 하나에 속하는지.
 * `todayKey`는 반드시 KST 기준 날짜 문자열이어야 합니다 — 기기·서버 시계를 쓰지 않습니다.
 */
export const matchesFilter = (task, filter, { todayKey, blockedIds }) => {
    switch (filter) {
        case "done":
            return task.status === "done";
        case "overdue":
            // 완료된 할 일은 지연으로 두 번 세지 않습니다.
            return task.status !== "done" && !!task.dueDate && task.dueDate < todayKey;
        case "blocked":
            return blockedIds.has(task.id);
        default:
            return true;
    }
};

/** 계획 하나의 돌아보기 집계. tasks·executionRecords는 이미 그 계획·삭제되지 않은 것만 걸러 온 것이어야 합니다. */
export const computeReview = (tasks, executionRecords, todayKey) => {
    const blockedIds = blockedTaskIdSet(executionRecords);
    const actualByTask = new Map();
    executionRecords.forEach((r) => {
        actualByTask.set(r.taskId, (actualByTask.get(r.taskId) ?? 0) + (Number(r.actualMinutes) || 0));
    });

    const count = (filter) => tasks.filter((t) => matchesFilter(t, filter, { todayKey, blockedIds })).length;
    const estimatedTotal = tasks.reduce((sum, t) => sum + (Number(t.estimatedMinutes) || 0), 0);
    const actualTotal = tasks.reduce((sum, t) => sum + (actualByTask.get(t.id) ?? 0), 0);

    return {
        planCount: tasks.length,
        doneCount: count("done"),
        overdueCount: count("overdue"),
        blockedCount: count("blocked"),
        estimatedTotal,
        actualTotal,
        diff: actualTotal - estimatedTotal,
        blockedIds,
    };
};

export const filterTasks = (tasks, filter, { todayKey, blockedIds }) =>
    filter === "all" ? tasks : tasks.filter((t) => matchesFilter(t, filter, { todayKey, blockedIds }));
