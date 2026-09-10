import { useEffect, useState } from "react";
import { getSession, onAuthStateChange } from "../api/auth";

/** AuthGate가 이미 세션 유무로 화면을 가르지만, 화면 안에서 로그인한 이메일을 보여주려면
 * (헤더·계정 섹션) 이 훅으로 다시 구독합니다. AuthGate와 별개로 구독해도 값은 항상 같습니다 —
 * 둘 다 같은 client.js의 세션을 보는 것뿐입니다. */
export function useSession() {
    const [session, setSession] = useState(null);

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

    return session;
}
