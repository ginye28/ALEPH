import { useState } from "react";
import * as s from "./styles";
import { GiCardRandom } from "react-icons/gi";
import Swal from "sweetalert2";
import { useNavigate } from "react-router";

function Home() {
    const navigate = useNavigate();
    const [ inputValue, setInputValue ] = useState("");

    const handleInputOnChange = (e) => {
        setInputValue(e.target.value);
    }

    const handleStartOnClick = () => {


        if (!inputValue.trim()) {
            setInputValue("");
            Swal.fire({
                title: "게임 시작 실패",
                text: "게임을 시작하려면 이름을 입력하세요.",
                icon: "warning"
            });
            return;
        }

        // API 주소를 넣었을 때만 기록을 보냅니다. 주소가 없으면 게임은 로컬로만 동작합니다.
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        if (apiBaseUrl) {
            fetch(`${apiBaseUrl}/api/users`, {
                method: "post",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: inputValue.trim(),
                })
            }).catch(() => {
                // 기록 전송에 실패해도 게임 진행은 그대로 이어집니다.
            });
        }

        navigate(`/game/${encodeURIComponent(inputValue.trim())}`);
    }

    return <>
        <div css={s.layout}>
            <header>
                <h1><GiCardRandom />CARD MATCHING GAME<GiCardRandom /></h1>
            </header>
            <main>
                <div css={s.usernameInput}>
                    <input type="text" 
                        placeholder="플레이어 이름" 
                        value={inputValue} 
                        onChange={handleInputOnChange}/>
                </div>
                <div css={s.startButton}>
                    <button onClick={handleStartOnClick}>시작하기</button>
                </div>
            </main>
        </div>
    </>
}

export default Home;