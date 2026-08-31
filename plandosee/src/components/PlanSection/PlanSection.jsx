import { Fragment, useState } from "react";
import { PRIORITY_LABEL } from "../../core/validate";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";
import PlanForm from "./PlanForm";

/**
 * 계획 목록 + 이력 + 새 계획/고치기 폼.
 *
 * 계획을 골라도 화면에는 언제나 "현재 개정본"만 강조하고, 이력은 접어서 보여줍니다 —
 * 그래도 처음 계획(1판)이 그대로 남아 있다는 걸 펼치면 바로 확인할 수 있습니다 (T06-C08).
 */
function PlanSection({ sectionRef, plans, selectedPlanId, onSelectPlan, history, onCreate, onRevise, carryNote }) {
    const [revisingId, setRevisingId] = useState(null);
    const [historyOpenFor, setHistoryOpenFor] = useState(null);

    const revising = revisingId ? plans.find((p) => p.id === revisingId) : null;

    return (
        <section css={c.panel} ref={sectionRef}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>계획</h2>
                <span css={c.panelHint}>계획은 고쳐도 지워지지 않고, 새 개정본으로 쌓입니다</span>
            </div>

            {plans.length === 0 && <p css={c.note}>아직 계획이 없습니다. 아래에서 하나 만듭니다.</p>}

            <table css={f.table} aria-label="계획 목록">
                <thead>
                    <tr>
                        <th>제목</th>
                        <th>기간</th>
                        <th>우선순위</th>
                        <th>예상 시간</th>
                        <th>개정</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {plans.map((plan) => (
                        <Fragment key={plan.id}>
                            <tr
                                data-testid={plan.id === selectedPlanId ? "plan-row-selected" : undefined}
                                css={{ background: plan.id === selectedPlanId ? "var(--accent-bg)" : "transparent" }}>
                                <td>{plan.current?.title ?? "-"}</td>
                                <td>
                                    {plan.current?.periodStart} ~ {plan.current?.periodEnd}
                                </td>
                                <td>{PRIORITY_LABEL[plan.current?.priority] ?? "-"}</td>
                                <td>{plan.current?.estimatedMinutes}분</td>
                                <td data-testid="plan-revision-no">{plan.current?.revisionNo}판</td>
                                <td>
                                    <span css={f.rowActions}>
                                        <button type="button" css={f.smallButton} onClick={() => onSelectPlan(plan.id)}>
                                            {plan.id === selectedPlanId ? "선택됨" : "선택"}
                                        </button>
                                        <button
                                            type="button"
                                            css={f.smallButton}
                                            onClick={() => setHistoryOpenFor((prev) => (prev === plan.id ? null : plan.id))}>
                                            이력 {historyOpenFor === plan.id ? "숨기기" : "보기"}
                                        </button>
                                        <button type="button" css={f.smallButton} onClick={() => setRevisingId(plan.id)}>
                                            고치기
                                        </button>
                                    </span>
                                </td>
                            </tr>
                            {historyOpenFor === plan.id && (
                                <tr>
                                    <td colSpan={6}>
                                        <table css={f.table} aria-label="계획 이력">
                                            <thead>
                                                <tr>
                                                    <th>개정</th>
                                                    <th>제목</th>
                                                    <th>기간</th>
                                                    <th>우선순위</th>
                                                    <th>예상 시간</th>
                                                    <th>저장 시각</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(history[plan.id] ?? []).map((rev) => (
                                                    <tr key={rev.id} data-testid={rev.revisionNo === 1 ? "plan-first-revision" : undefined}>
                                                        <td>{rev.revisionNo}판{rev.revisionNo === 1 ? " (처음)" : ""}</td>
                                                        <td>{rev.title}</td>
                                                        <td>
                                                            {rev.periodStart} ~ {rev.periodEnd}
                                                        </td>
                                                        <td>{PRIORITY_LABEL[rev.priority]}</td>
                                                        <td>{rev.estimatedMinutes}분</td>
                                                        <td css={c.mono}>{rev.createdAt?.slice(0, 16).replace("T", " ")}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    ))}
                </tbody>
            </table>

            <PlanForm
                key={revising?.id ?? "new"}
                revising={revising}
                carryNote={carryNote}
                onCreate={onCreate}
                onRevise={onRevise}
                onCancel={() => setRevisingId(null)}
            />
        </section>
    );
}

export default PlanSection;
