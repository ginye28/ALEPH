import { useEffect, useState } from "react";
import { getSession, onAuthStateChange } from "../../api/auth";
import AuthForm from "../AuthForm/AuthForm";
import * as s from "./styles";

/**
 * 로그인 문 (T07-C03·C21). 세션이 없으면 로그인 화면만 그리고, 그 뒤의 자료 화면은
 * 아예 렌더하지 않습니다 — "화면에서 숨긴다"가 아니라 "세션 없이는 그 화면 자체가 없다"입니다.
 * 실제 접근 통제는 이 컴포넌트가 아니라 서버의 RLS가 하고, 이건 그 위에 얹은 사용자 경험입니다.
 */
function AuthGate({ children }) {
    const [session, setSession] = useState(undefined); // undefined = 아직 확인 중

    useEffect(() => {
        let alive = true;
        getSession().then(({ data }) => {
            if (alive) setSession(data.session ?? null);
        });
        const { data } = onAuthStateChange((_event, nextSession) => {
            if (alive) setSession(nextSession ?? null);
        });
        return () => {
            alive = false;
            data?.subscription?.unsubscribe?.();
        };
    }, []);

    if (session === undefined) {
        return (
            <main css={s.loading} data-testid="auth-loading">
                불러오는 중…
            </main>
        );
    }

    if (!session) {
        return <AuthForm />;
    }

    return children;
}

export default AuthGate;
