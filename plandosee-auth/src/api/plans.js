/**
 * 계획 API. 검사(`checkPlanForm`)를 통과한 값만 저장소에 넘깁니다.
 *
 * 계획은 절대 UPDATE하지 않습니다 — 고치는 것은 항상 새 개정본(revision)을 쌓는
 * 일이고, `plan_id`(정체성)는 그대로 두고 `revision_no`만 늘어납니다 (T06-C08).
 */
import { newId } from "../core/ids";
import { checkPlanForm } from "../core/validate";
import { db } from "./client";

export const listPlans = () => db.plans.listWithCurrent();
export const getPlan = (planId) => db.plans.get(planId);
export const planHistory = (planId) => db.plans.history(planId);

/** 새 계획. 돌아보기의 "고칠 점"에서 이어졌으면 그 review note id를 넘깁니다. */
export const createPlan = async (form, { carriedFromReviewId = null } = {}) => {
    const checked = checkPlanForm(form);
    if (!checked.ok) return { ok: false, errors: checked.errors };

    const { data, error } = await db.plans.createWithRevision({
        planId: newId(),
        revisionId: newId(),
        carriedFromReviewId,
        revision: checked.value,
    });
    if (error) return { ok: false, errors: { form: `저장하지 못했습니다: ${error.message}` } };
    return { ok: true, data };
};

/** 계획을 지웁니다 — 소프트 삭제라 개정 이력·할일·실행기록은 그대로 남고 목록에서만 빠집니다. */
export const deletePlan = async (planId) => {
    const { data, error } = await db.plans.softDelete(planId);
    if (error) return { ok: false, errors: { form: error.message } };
    return { ok: true, data };
};

/** 계획을 고칩니다 — 기존 개정본은 손대지 않고 새 개정본을 추가합니다. */
export const revisePlan = async (planId, form) => {
    const checked = checkPlanForm(form);
    if (!checked.ok) return { ok: false, errors: checked.errors };

    const { data, error } = await db.plans.addRevision({
        planId,
        revisionId: newId(),
        revision: checked.value,
    });
    if (error) return { ok: false, errors: { form: `저장하지 못했습니다: ${error.message}` } };
    return { ok: true, data };
};
