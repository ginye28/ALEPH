import { Global } from "@emotion/react";
import { reset } from "./styles/reset";
import Dashboard from "./pages/Dashboard/Dashboard";

function App() {

    return (
        <>
            <Global styles={reset} />
            <Dashboard />
        </>
    );
}

export default App;
