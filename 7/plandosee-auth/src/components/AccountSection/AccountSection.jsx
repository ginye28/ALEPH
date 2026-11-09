import { useState } from "react";
import { deleteMyData, signOut } from "../../api/auth";
import * as c from "../../styles/controls";
import * as s from "./styles";

/**
 * 로그아웃 + 계정 삭제 (카드 5, T07-C134).
 *
 * auth.users 레코드 자체를 지우려면 service_role 관리자 API가 필요해 클라이언트에서
 * 직접 호출할 수 없습니다. 그래서 "삭제"는 내 소유 데이터 행(계획·이력·할일·실행기록·
 * 고칠점)을 전부 지우는 것까지만 하고, 가입 정보(이메일)는 별도 절차로 지워진다는
 * 사실을 화면에 그대로 밝힙니다 — 다 막았다고 적지 않습니다.
 */
function AccountSection({ email, onSignedOut }) {
    const [confirming, setConfirming] = useState(false);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState(null);

    const handleDelete = async () => {
        setPending(true);
        const { data, error } = await deleteMyData();
        setPending(false);
        setConfirming(false);
        if (error) {
            setMessage({ tone: "bad", text: `지우지 못했습니다: ${error.message}` });
            return;
        }
        // "오류가 없었다"만으로 성공이라고 말하지 않습니다 — 서버가 돌려준 지운 행 수를 그대로 밝힙니다.
        // 지운 행 수가 오지 않았다면(예: 서버 함수가 옛 버전) 지워졌다고 확인할 수 없으니 그대로 말합니다.
        if (!data) {
            setMessage({ tone: "bad", text: "요청은 오류 없이 끝났지만 서버가 지운 행 수를 알려주지 않아, 지워졌다고 확인할 수 없습니다." });
            return;
        }
        const counts = data;
        const summary = [
            ["계획", counts.plans],
            ["계획 개정본", counts.plan_revisions],
            ["할일", counts.tasks],
            ["실행기록", counts.execution_records],
            ["고칠 점", counts.review_notes],
        ]
            .map(([label, n]) => `${label} ${Number(n ?? 0)}건`)
            .join(" · ");
        setMessage({ tone: "good", text: `내 데이터를 지웠습니다 — ${summary}. 화면에 남은 목록은 새로고침하면 사라집니다.` });
    };

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>내 계정</h2>
                <span css={c.panelHint}>{email}</span>
            </div>

            <button type="button" css={c.button} data-testid="account-signout" onClick={() => signOut().then(onSignedOut)}>
                로그아웃
            </button>

            <hr css={s.divider} />

            <div css={s.dangerZone}>
                <p css={s.dangerLabel}>⚠ 위험 구역</p>
                <p css={c.note}>
                    <b>계정 삭제</b>는 내 계획·할일·실행기록·고칠 점을 전부 지웁니다. 다만{" "}
                    <b>가입 정보(이메일) 자체는 이 버튼으로 지워지지 않고 별도 절차가 필요합니다</b>{" "}
                    — Auth 계정 레코드의 하드 삭제는 관리자 권한이 있어야 해 이 화면에서는 못 만들었습니다.
                </p>

                {!confirming && (
                    <button type="button" css={c.dangerButton} data-testid="account-delete-start" onClick={() => setConfirming(true)}>
                        내 계정 삭제
                    </button>
                )}

                {confirming && (
                    <div css={c.note}>
                        <p>정말 지울까요? 계획·할일·실행기록이 전부 사라지고 되돌릴 수 없습니다.</p>
                        <button type="button" css={c.dangerButton} data-testid="account-delete-confirm" disabled={pending} onClick={handleDelete}>
                            네, 지웁니다 — 되돌릴 수 없습니다
                        </button>{" "}
                        <button type="button" css={c.button} onClick={() => setConfirming(false)}>
                            취소
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <p css={c.note} data-testid="account-message" style={{ color: message.tone === "bad" ? "var(--bad)" : undefined }}>
                    {message.text}
                </p>
            )}
        </section>
    );
}

export default AccountSection;
