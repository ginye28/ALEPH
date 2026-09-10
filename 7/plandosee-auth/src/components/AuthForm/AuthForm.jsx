import { useState } from "react";
import { signIn, signUp } from "../../api/auth";
import * as c from "../../styles/controls";
import * as f from "../../styles/form";
import * as s from "./styles";

const ERROR_TEXT = {
    "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "User already registered": "이미 가입된 이메일입니다.",
};

const describeError = (error) => ERROR_TEXT[error?.message] ?? error?.message ?? "알 수 없는 오류입니다.";

/**
 * 가입/로그인 폼 (카드 1). 존재하지 않는 계정과 비밀번호만 틀린 계정에 **같은** 오류 문구를
 * 보여줍니다 — GoTrue가 원래 그렇게 응답하고, 여기서도 번역만 할 뿐 구분해 보여주지 않습니다
 * (검사 20).
 */
function AuthForm() {
    const [mode, setMode] = useState("login"); // "login" | "signup"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);
    const [signedUp, setSignedUp] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setError(null);
        setSignedUp(false);
        setPending(true);
        const { error: authError } = mode === "signup" ? await signUp(email, password) : await signIn(email, password);
        setPending(false);
        if (authError) {
            setError(authError);
            return;
        }
        if (mode === "signup") setSignedUp(true);
    };

    return (
        <main css={s.page}>
            <section css={c.panel}>
                <div css={c.panelHead}>
                    <h1 css={c.panelTitle}>{mode === "signup" ? "가입하기" : "로그인"}</h1>
                    <span css={c.panelHint}>플랜두씨 다이어리 2 — 로그인해야 내 기록을 볼 수 있습니다</span>
                </div>

                <p css={c.note} data-testid="auth-no-login-notice">
                    로그인하지 않으면 자료 화면 자체가 열리지 않습니다. 계정마다 자기 계획·할일·실행기록만 보입니다.
                </p>

                <form css={f.form} onSubmit={submit} noValidate>
                    <div css={[f.field, f.wide]}>
                        <label css={f.labelText} htmlFor="auth-email">
                            이메일
                        </label>
                        <input
                            id="auth-email"
                            data-testid="auth-email"
                            css={f.input(false)}
                            type="email"
                            autoComplete="email"
                            placeholder="me@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div css={[f.field, f.wide]}>
                        <label css={f.labelText} htmlFor="auth-password">
                            비밀번호
                        </label>
                        <input
                            id="auth-password"
                            data-testid="auth-password"
                            css={f.input(false)}
                            type="password"
                            autoComplete={mode === "signup" ? "new-password" : "current-password"}
                            placeholder="6자 이상"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div css={f.wide}>
                            <span css={f.error} data-testid="auth-error">
                                {describeError(error)}
                            </span>
                        </div>
                    )}

                    {signedUp && (
                        <div css={f.wide}>
                            <p css={c.note} data-testid="auth-signup-success">
                                가입되었습니다. 자동으로 로그인됩니다.
                            </p>
                        </div>
                    )}

                    <div css={f.actions}>
                        <button type="submit" css={c.primaryButton} disabled={pending} data-testid="auth-submit">
                            {mode === "signup" ? "가입하기" : "로그인"}
                        </button>
                        <button
                            type="button"
                            css={c.button}
                            data-testid="auth-mode-toggle"
                            onClick={() => {
                                setMode((prev) => (prev === "signup" ? "login" : "signup"));
                                setError(null);
                                setSignedUp(false);
                            }}>
                            {mode === "signup" ? "이미 계정이 있습니다" : "처음이라면 가입하기"}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}

export default AuthForm;
