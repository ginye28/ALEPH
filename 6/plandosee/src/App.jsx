import { Global } from "@emotion/react";
import Diary from "./pages/Diary/Diary";
import { reset } from "./styles/reset";

function App() {
    return (
        <>
            <Global styles={reset} />
            <Diary />
        </>
    );
}

export default App;
