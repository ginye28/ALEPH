/**
 * 돌아보기 API.
 *
 * `getReview`가 화면 숫자와 드릴다운 목록이 쓰는 유일한 계산이고,
 * `getReviewCrossCheck`는 실제 Postgres `plan_review()` 함수를 호출해
 * "서버가 직접 계산한 값과 같은가"를 검증하는 용도로만 씁니다 (check.mjs 전용).
 */
import { newId } from "../core/ids";
import { MAX_TEXT, checkText } from "../core/validate";
import { db } from "./client";

export const getReview = (planId, todayKey) => db.review(planId, todayKey);
export const getReviewCrossCheck = (planId, todayKey) => db.rpcPlanReview(planId, todayKey);
export const getReviewNote = (id) => db.reviewNotes.get(id);

/** "고칠 점" 한 줄. 다음 계획을 만들 때 이 id를 carriedFromReviewId로 넘기면 이어집니다. */
export const addReviewNote = async (planId, noteText) => {
    const checked = checkText(noteText, { max: MAX_TEXT, label: "고칠 점" });
    if (!checked.ok) return { ok: false, errors: { note: checked.reason } };

    const { data, error } = await db.reviewNotes.create({ id: newId(), planId, note: checked.value });
    if (error) return { ok: false, errors: { form: `저장하지 못했습니다: ${error.message}` } };
    return { ok: true, data };
};
