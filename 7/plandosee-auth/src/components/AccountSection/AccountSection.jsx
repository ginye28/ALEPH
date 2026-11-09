import { useState } from "react";
import { deleteMyData, signOut } from "../../api/auth";
import { clearAuthNotice, saveAuthNotice } from "../../api/authNotice";
import * as c from "../../styles/controls";
import * as s from "./styles";

/**
 * 로그아웃 + 계정 삭제 (카드 5, T07-C134).
 *
 * "삭제"는 서버 함수 delete_my_data()가 내 소유 데이터 행(계획·이력·할일·실행기록·고칠점)을
 * 전부 지우고 가입 레코드(auth.users)까지 지우는 것입니다. 서버가 돌려준 지운 행 수로 계정까지
 * 지워졌는지 확인하고, 확인되지 않으면 지웠다고 말하지 않습니다. 성공하면 이 계정은 더 이상
 * 존재하지 않으므로 로그아웃해 로그인 화면으로 돌려보냅니다.
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

        // 서버 함수가 가입 레코드까지 지웠다고 알려 주지 않으면(예: 서버에 옛 함수가 남아 있음)
        // 계정이 지워졌다고 말하지 않습니다.
        if (counts.account !== 1) {
            setMessage({
                tone: "bad",
                text: `내 데이터는 지웠습니다 — ${summary}. 그러나 서버가 가입 레코드를 지웠다고 알려 주지 않아, 계정이 지워졌다고 확인할 수 없습니다.`,
            });
            return;
        }

        // 계정이 사라졌으니 로그아웃해서 로그인 화면으로 돌려보냅니다. 자료 화면이 사라지면 이 컴포넌트의
        // 메시지도 같이 사라지므로, 결과는 로그인 화면이 한 번 읽어 보여 줄 수 있게 로그아웃 직전에 적어 둡니다.
        // (서버에서 이미 세션이 사라져 signOut 요청이 401/403/404를 받아도 supabase-js가 무시하고
        // 이 브라우저의 로컬 세션을 지웁니다.)
        saveAuthNotice(`계정을 삭제하고 로그아웃했습니다 — ${summary}. 같은 이메일로 다시 쓰려면 새로 가입해야 합니다.`);
        const { error: signOutError } = await signOut();
        if (signOutError) {
            clearAuthNotice();
            setMessage({
                tone: "bad",
                text: `계정은 삭제했습니다 — ${summary}. 다만 이 브라우저에서 로그아웃하지 못했습니다: ${signOutError.message}. 페이지를 새로고침해 주세요.`,
            });
            return;
        }
        onSignedOut?.();
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
                    <b>계정 삭제</b>는 내 계획·할일·실행기록·고칠 점을 전부 지우고 <b>가입 정보(이메일·비밀번호)까지 지웁니다.</b>{" "}
                    지운 뒤에는 같은 이메일로 로그인할 수 없고 새로 가입해야 하며, 다른 기기의 로그인도 끊깁니다.
                </p>

                {!confirming && (
                    <button type="button" css={c.dangerButton} data-testid="account-delete-start" onClick={() => setConfirming(true)}>
                        내 계정 삭제
                    </button>
                )}

                {confirming && (
                    <div css={c.note}>
                        <p>정말 지울까요? 계정과 모든 기록이 사라지고 되돌릴 수 없습니다.</p>
                        <button type="button" css={c.dangerButton} data-testid="account-delete-confirm" disabled={pending} onClick={handleDelete}>
                            네, 계정을 지웁니다 — 되돌릴 수 없습니다
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
