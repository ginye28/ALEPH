import { useState } from "react";
import { PRIORITY_LABEL } from "../../core/validate";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";
import TaskForm from "./TaskForm";

const SORT_OPTIONS = [
    { value: "createdAt", label: "만든 순서" },
    { value: "dueDate", label: "마감일" },
    { value: "priority", label: "우선순위" },
    { value: "estimatedMinutes", label: "예상 시간" },
];

const REVIEW_FILTER_LABEL = { done: "완료", overdue: "지연", blocked: "막힘" };

/**
 * 할 일 CRUD + 검색/필터/정렬.
 *
 * 정렬 기준과 동점 처리 규칙을 화면에 그대로 적어 둡니다 — "정렬이 볼 때마다 달라진다"는
 * 대개 기준이 안 적혀 있거나 동점 처리가 없어서 생깁니다 (설계 원칙 4).
 */
function TaskSection({
    sectionRef,
    planId,
    tasks,
    filters,
    onFiltersChange,
    reviewFilter,
    onClearReviewFilter,
    onCreate,
    onUpdate,
    onComplete,
    onReopen,
    onDelete,
    selectedTaskId,
    onSelectTask,
}) {
    const [editingId, setEditingId] = useState(null);
    const editing = editingId ? tasks.find((t) => t.id === editingId) : null;

    const setFilter = (key) => (event) => onFiltersChange({ ...filters, [key]: event.target.value });

    const handleUpdate = async (id, form) => {
        const result = await onUpdate(id, form);
        if (result.ok) setEditingId(null);
        return result;
    };

    if (!planId) {
        return (
            <section css={c.panel} ref={sectionRef}>
                <div css={c.panelHead}>
                    <h2 css={c.panelTitle}>할 일</h2>
                </div>
                <p css={c.note}>먼저 위에서 계획을 하나 선택하거나 만듭니다.</p>
            </section>
        );
    }

    return (
        <section css={c.panel} ref={sectionRef}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>할 일</h2>
                <span css={c.panelHint} data-testid="sort-criterion">
                    정렬: {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label} ·{" "}
                    {filters.sortDir === "asc" ? "오름차순" : "내림차순"} · 값이 같으면 id 순
                </span>
            </div>

            {reviewFilter && (
                <p css={c.note} data-testid="review-filter-banner">
                    <b>돌아보기에서 걸러봄 — {REVIEW_FILTER_LABEL[reviewFilter]}</b>인 할 일만 보입니다.{" "}
                    <button type="button" css={f.smallButton} onClick={onClearReviewFilter}>
                        필터 해제
                    </button>
                </p>
            )}

            <div css={f.form}>
                <div css={f.field}>
                    <label css={f.labelText} htmlFor="task-search">
                        검색 (제목)
                    </label>
                    <input
                        id="task-search"
                        css={f.input(false)}
                        type="text"
                        placeholder="제목으로 찾기"
                        value={filters.search}
                        onChange={setFilter("search")}
                    />
                </div>
                <div css={f.field}>
                    <label css={f.labelText} htmlFor="task-status-filter">
                        상태
                    </label>
                    <select id="task-status-filter" css={f.select(false)} value={filters.status} onChange={setFilter("status")}>
                        <option value="all">전체</option>
                        <option value="todo">진행 중</option>
                        <option value="done">완료</option>
                    </select>
                </div>
                <div css={f.field}>
                    <label css={f.labelText} htmlFor="task-priority-filter">
                        우선순위
                    </label>
                    <select id="task-priority-filter" css={f.select(false)} value={filters.priority} onChange={setFilter("priority")}>
                        <option value="all">전체</option>
                        <option value="low">낮음</option>
                        <option value="medium">보통</option>
                        <option value="high">높음</option>
                    </select>
                </div>
                <div css={f.field}>
                    <label css={f.labelText} htmlFor="task-sort">
                        정렬 기준
                    </label>
                    <select id="task-sort" css={f.select(false)} value={filters.sortBy} onChange={setFilter("sortBy")}>
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div css={f.field}>
                    <label css={f.labelText} htmlFor="task-sort-dir">
                        방향
                    </label>
                    <select id="task-sort-dir" css={f.select(false)} value={filters.sortDir} onChange={setFilter("sortDir")}>
                        <option value="desc">내림차순</option>
                        <option value="asc">오름차순</option>
                    </select>
                </div>
            </div>

            <table css={f.table} aria-label="할 일 목록">
                <thead>
                    <tr>
                        <th>제목</th>
                        <th>마감일</th>
                        <th>우선순위</th>
                        <th>태그</th>
                        <th>예상 시간</th>
                        <th>상태</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.length === 0 && (
                        <tr>
                            <td colSpan={7} css={c.panelHint}>
                                조건에 맞는 할 일이 없습니다.
                            </td>
                        </tr>
                    )}
                    {tasks.map((task) => {
                        const done = task.status === "done";
                        return (
                        <tr key={task.id} data-testid="task-row" data-task-id={task.id} css={done ? f.doneRow : undefined}>
                            <td css={done ? f.doneTitle : undefined}>{task.title}</td>
                            <td>{task.dueDate ?? "-"}</td>
                            <td>{PRIORITY_LABEL[task.priority]}</td>
                            <td>
                                {task.tags.map((t) => (
                                    <span key={t} css={f.tag}>
                                        {t}
                                    </span>
                                ))}
                            </td>
                            <td>{task.estimatedMinutes}분</td>
                            <td data-testid="task-status" css={done ? f.statusDone : undefined}>{done ? "완료" : "진행 중"}</td>
                            <td>
                                <span css={f.rowActions}>
                                    <button type="button" css={f.smallButton} onClick={() => onSelectTask(task.id)}>
                                        {selectedTaskId === task.id ? "실행기록 선택됨" : "실행기록"}
                                    </button>
                                    <button type="button" css={f.smallButton} onClick={() => setEditingId(task.id)}>
                                        수정
                                    </button>
                                    {task.status === "done" ? (
                                        <button type="button" css={f.smallButton} onClick={() => onReopen(task.id)}>
                                            되돌리기
                                        </button>
                                    ) : (
                                        <button type="button" css={f.smallButton} onClick={() => onComplete(task.id)}>
                                            완료
                                        </button>
                                    )}
                                    <button type="button" css={f.smallButton} onClick={() => onDelete(task.id)}>
                                        삭제
                                    </button>
                                </span>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>

            {editing && (
                <p css={c.note}>
                    <b>{editing.title}</b>을(를) 고치는 중입니다.
                </p>
            )}
            <TaskForm
                key={editingId ?? "new"}
                editing={editing}
                onCreate={(form) => onCreate(planId, form)}
                onUpdate={handleUpdate}
                onCancel={() => setEditingId(null)}
            />
        </section>
    );
}

export default TaskSection;
