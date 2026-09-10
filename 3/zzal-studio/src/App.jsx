import { Global } from "@emotion/react";
import { reset } from "./styles/reset";
import Studio from "./pages/Studio/Studio";

function App() {

    return (
        <>
            <Global styles={reset} />
            <Studio />
        </>
    );
}

export default App;
