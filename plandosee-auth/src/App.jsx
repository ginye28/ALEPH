import { Global } from "@emotion/react";
import AuthGate from "./components/AuthGate/AuthGate";
import Diary from "./pages/Diary/Diary";
import { reset } from "./styles/reset";

function App() {
    return (
        <>
            <Global styles={reset} />
            <AuthGate>
                <Diary />
            </AuthGate>
        </>
    );
}

export default App;
