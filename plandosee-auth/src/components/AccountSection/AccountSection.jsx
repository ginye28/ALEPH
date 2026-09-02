import { useState } from "react";
import { deleteMyData, signOut } from "../../api/auth";
import * as c from "../../styles/controls";

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
        const { error } = await deleteMyData();
        setPending(false);
        setConfirming(false);
        if (error) {
            setMessage({ tone: "bad", text: `지우지 못했습니다: ${error.message}` });
            return;
        }
        setMessage({ tone: "good", text: "내 데이터를 모두 지웠습니다." });
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

            <p css={c.note}>
                <b>계정 삭제</b>는 내 계획·할일·실행기록·고칠 점을 전부 지웁니다. 다만{" "}
                <b>가입 정보(이메일) 자체는 이 버튼으로 지워지지 않고 별도 절차가 필요합니다</b>{" "}
                — Auth 계정 레코드의 하드 삭제는 관리자 권한이 있어야 해 이 화면에서는 못 만들었습니다.
            </p>

            {!confirming && (
                <button type="button" css={c.button} data-testid="account-delete-start" onClick={() => setConfirming(true)}>
                    내 계정 삭제
                </button>
            )}

            {confirming && (
                <div css={c.note}>
                    <p>정말 지울까요? 계획·할일·실행기록이 전부 사라지고 되돌릴 수 없습니다.</p>
                    <button type="button" css={c.primaryButton} data-testid="account-delete-confirm" disabled={pending} onClick={handleDelete}>
                        네, 지웁니다
                    </button>{" "}
                    <button type="button" css={c.button} onClick={() => setConfirming(false)}>
                        취소
                    </button>
                </div>
            )}

            {message && (
                <p css={c.note} data-testid="account-message" style={{ color: message.tone === "bad" ? "var(--bad)" : undefined }}>
                    {message.text}
                </p>
            )}
        </section>
    );
}

export default AccountSection;
