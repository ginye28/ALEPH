import * as s from "./styles";

function MainLayout({children}) {
    
    return <>
        <div css={s.layout}>
            <div css={s.container}>
                <div css={s.containerBorder}>
                    {children}
                </div>
            </div>
        </div>
    </>
}

export default MainLayout;