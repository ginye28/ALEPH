import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import CurrentValueCard from "../../components/CurrentValueCard/CurrentValueCard";
import DiffCard from "../../components/DiffCard/DiffCard";
import FailurePanel from "../../components/FailurePanel/FailurePanel";
import HistoryList from "../../components/HistoryList/HistoryList";
import { computeDiff } from "../../core/computeDiff";
import { describeStatus, initialState, reducer } from "../../core/dashboardState";
import { FAILURE_MODES } from "../../core/failureSim";
import { fetchSnapshot } from "../../core/fetchSnapshot";
import { provider } from "../../providers";
import { clearHistory, loadHistory, saveManyOnce, saveOnce, toRecord } from "../../storage/history";
import * as c from "../../styles/controls";
import { REFERENCE_HOUR, TIMEZONE_LABEL, dateKeyOfLocalStamp } from "../../utils/timezone";
import * as s from "./styles";

const queryOf = (name) =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name);

const isDebugRequested = () => queryOf("debug") !== null;

/**
 * ?fail=<장애 종류> 로 열면 첫 조회부터 실패합니다.
 * 마지막 정상값이 하나도 없는 상태를 그대로 보여주기 위한 것입니다 —
 * 그때 값이 있는 것처럼 표시하지 않는다는 점을 이 주소 하나로 확인할 수 있습니다.
 */
const initialFailureMode = () => {
    const mode = queryOf("fail");
    return FAILURE_MODES.some((item) => item.id === mode) ? mode : "none";
};

function Dashboard() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [history, setHistory] = useState(() => loadHistory());
    const [notes, setNotes] = useState([]);
    const [lastMode, setLastMode] = useState(initialFailureMode);
    const [toolsOpen, setToolsOpen] = useState(isDebugRequested);

    // 여러 요청이 겹칠 때 늦게 끝난 옛 응답이 최신 결과를 덮어쓰지 않게 합니다.
    const requestId = useRef(0);

    /**
     * 성공한 조회 하나로 기록을 정리합니다.
     * - 오늘 날짜: 하루 한 건만 저장 (이미 있으면 그대로 둡니다)
     * - 비교할 기록이 2건 미만이면: 같은 응답에 들어 있는 지난 날짜를 함께 채웁니다
     *   하루를 기다리지 않아도 되는 이유이고, 채운 기록에는 origin을 남겨 화면에서 구분합니다.
     */
    const persist = useCallback((snapshot, { forceRefill = false } = {}) => {
        // 오늘이 며칠인지는 기기 시계가 아니라 출처가 알려준 시각으로 정합니다.
        // 기기 시간대나 시계가 틀어져 있어도 날짜가 밀리지 않습니다.
        const todayKey = dateKeyOfLocalStamp(snapshot.observedAt);
        const messages = [];

        const todayEntry = snapshot.series.find((entry) => entry.dateKey === todayKey);

        if (!todayEntry) {
            messages.push(
                `오늘 ${REFERENCE_HOUR}시가 아직 지나지 않아 오늘 기록은 저장하지 않았습니다.`,
            );
        } else {
            const saved = saveOnce(toRecord(snapshot, todayEntry, "live"));
            if (saved.reason === "duplicate") {
                messages.push(`오늘(${todayKey}) 기록이 이미 있어 다시 저장하지 않았습니다.`);
            } else if (!saved.ok) {
                messages.push(saved.reason);
            } else {
                messages.push(`오늘(${todayKey}) 기록을 저장했습니다.`);
            }
        }

        let items = loadHistory();

        if (forceRefill || items.length < 2) {
            const past = snapshot.series
                .filter((entry) => entry.dateKey !== todayKey)
                .map((entry) => toRecord(snapshot, entry, "backfill"));

            const filled = saveManyOnce(past);
            items = filled.items;

            if (filled.added > 0) {
                messages.push(
                    `비교할 기록이 부족해 같은 응답에 들어 있는 지난 날짜 ${filled.added}건을 함께 저장했습니다.`,
                );
            } else if (forceRefill) {
                messages.push("출처가 준 지난 날짜는 이미 모두 저장돼 있습니다.");
            }
        }

        setHistory(items);
        setNotes(messages);
    }, []);

    /**
     * 실제 조회. 상태는 응답을 받은 뒤에만 바꿉니다.
     * "확인하는 중" 표시는 호출부(start)가 맡습니다.
     */
    const run = useCallback(
        async (failureMode = "none", options = {}) => {
            const id = requestId.current + 1;
            requestId.current = id;

            const result = await fetchSnapshot({ provider, failureMode });

            if (requestId.current !== id) {
                return;
            }

            if (!result.ok) {
                // 실패는 attempt만 바꿉니다. 기록도 마지막 정상값도 건드리지 않습니다.
                dispatch({ type: "failure", ...result });
                return;
            }

            dispatch({ type: "success", snapshot: result.snapshot });
            persist(result.snapshot, options);
        },
        [persist],
    );

    /** 사용자가 버튼을 눌러 시작하는 경로. 먼저 로딩 상태로 바꾼 뒤 조회합니다. */
    const start = useCallback(
        (failureMode = "none", options = {}) => {
            setLastMode(failureMode);
            dispatch({ type: "start" });
            run(failureMode, options);
        },
        [run],
    );

    // 첫 조회. initialState가 이미 loading이라 여기서 상태를 미리 바꿀 필요가 없습니다.
    //
    // run()은 await 뒤에야 상태를 바꾸므로 cascading render가 생기지 않습니다.
    // 다만 이 규칙은 함수 경계를 넘어 await를 추적하지 못해 오탐을 냅니다.
    // 조회 로직을 여기 복사해 넣으면 규칙은 통과하지만 결과 처리 코드가 두 벌이 되고
    // 마운트 조회만 requestId 경쟁 방지에서 빠집니다. 한 경로를 유지하는 쪽이 맞습니다.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        run(initialFailureMode());
    }, [run]);

    const status = useMemo(() => describeStatus(state), [state]);
    const diff = useMemo(() => computeDiff(history, provider.digits), [history]);
    const isLoading = state.attempt.status === "loading";

    const handleClear = () => {
        setHistory(clearHistory());
        setNotes(["기록을 비웠습니다. 다시 확인을 누르면 오늘 기록부터 새로 저장됩니다."]);
    };

    return (
        <main css={s.page}>
            <header css={s.header}>
                <h1 css={s.title}>오늘의 진짜 정보판</h1>
                <p css={s.subtitle}>
                    기준 시간대 {TIMEZONE_LABEL} · 날짜별 기록은 매일 {REFERENCE_HOUR}시 값
                </p>
            </header>

            <CurrentValueCard
                snapshot={state.lastGood}
                status={status}
                provider={provider}
                isLoading={isLoading}
                onRetry={() => start("none")}
            />

            <DiffCard diff={diff} digits={provider.digits} />

            <HistoryList records={history} digits={provider.digits} notes={notes} />

            {toolsOpen ? (
                <FailurePanel
                    lastMode={lastMode}
                    isLoading={isLoading}
                    diff={diff}
                    digits={provider.digits}
                    onSimulate={(mode) => start(mode)}
                    onRefill={() => start("none", { forceRefill: true })}
                    onClear={handleClear}
                />
            ) : (
                <button type="button" css={s.toolsToggle} onClick={() => setToolsOpen(true)}>
                    점검 도구 열기 — 장애 5종 재현 · 대조표
                </button>
            )}

            <footer css={s.footer}>
                <p css={c.note}>
                    이 정보판은 서버 없이 브라우저에서만 동작합니다. 인증키를 쓰지 않는 공개 출처만
                    호출하므로 코드·배포 파일·네트워크 주소 어디에도 비밀값이 없습니다. 날짜별
                    기록은 이 브라우저에만 저장되며 개인정보는 저장하지 않습니다.
                </p>
            </footer>
        </main>
    );
}

export default Dashboard;
