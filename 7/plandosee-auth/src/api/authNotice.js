/**
 * 로그인 화면에 한 번만 보여 줄 안내 글.
 *
 * "내 계정 삭제"가 끝나면 로그아웃되어 자료 화면(AccountSection 포함)이 통째로 사라집니다.
 * 그 화면에 있던 결과 메시지가 함께 사라지면 사용자는 무슨 일이 있었는지 알 수 없으므로,
 * 로그아웃 직전에 여기에 적어 두고 로그인 화면이 한 번 읽어 보여 줍니다.
 * sessionStorage는 막혀 있을 수 있어(사생활 보호 창 등) 모든 접근을 try/catch로 감쌉니다 —
 * 막혀 있으면 안내만 못 보여 줄 뿐, 삭제와 로그아웃 자체에는 영향이 없습니다.
 */
const KEY = "pds-auth-notice";

export const saveAuthNotice = (text) => {
    try {
        sessionStorage.setItem(KEY, text);
    } catch {
        /* 저장소를 못 쓰면 안내만 생략합니다 */
    }
};

export const peekAuthNotice = () => {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
};

export const clearAuthNotice = () => {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* 위와 같음 */
    }
};
