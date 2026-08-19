import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { GiCardRandom } from "react-icons/gi";
import * as s from "./styles";
import GameCard from "../../components/GameCard/GameCard";
import { DIFFICULTIES, DIFFICULTY_LIST, WARNING_MS, createDeck } from "../../constants/difficulty";
import { loadSettings, saveSettings } from "../../utils/storage";
import { playSound } from "../../utils/sound";

const STATUS = {
    READY: "ready",
    PLAYING: "playing",
    CLEARED: "cleared",
    FAILED: "failed",
};

const FLIP_BACK_DELAY = 600;
const TICK_MS = 50;
const MATCH_SCORE = 100;
const COMBO_BONUS = 50;

const readNow = () => Date.now();

const formatTime = (ms) => {
    const safeMs = Math.max(0, ms);
    const sec = Math.floor(safeMs / 1000);
    const hundredth = Math.floor((safeMs % 1000) / 10);
    return `${sec}.${hundredth.toString().padStart(2, "0")}`;
}

function Game() {
    const params = useParams();
    const [ difficultyKey, setDifficultyKey ] = useState(DIFFICULTIES.basic.key);
    const [ status, setStatus ] = useState(STATUS.READY);
    const [ isPaused, setIsPaused ] = useState(false);
    const [ cards, setCards ] = useState([]);
    const [ round, setRound ] = useState(0);
    const [ remainMs, setRemainMs ] = useState(DIFFICULTIES.basic.timeLimitMs);
    const [ recordMs, setRecordMs ] = useState(null);
    const [ attempts, setAttempts ] = useState(0);
    const [ combo, setCombo ] = useState(0);
    const [ bestCombo, setBestCombo ] = useState(0);
    const [ score, setScore ] = useState(0);
    const [ finalScore, setFinalScore ] = useState(0);
    const [ lastNote, setLastNote ] = useState("");
    const [ missIds, setMissIds ] = useState([]);
    const [ isNewRecord, setIsNewRecord ] = useState(false);
    const [ settings, setSettings ] = useState(loadSettings);

    const intervalRef = useRef(null);
    const flipTimeoutRef = useRef(null);
    const deadlineRef = useRef(0);
    const lockRef = useRef(false);
    const mutedRef = useRef(false);

    const difficulty = DIFFICULTIES[difficultyKey];
    const isPlaying = status === STATUS.PLAYING;
    const isBoardVisible = isPlaying && !isPaused;
    const matchedPairs = cards.filter(card => card.isAnswer).length / 2;
    const totalPairs = cards.length / 2;
    const isWarning = isPlaying && !isPaused && remainMs <= WARNING_MS;
    const bestMs = settings.bestRecords[difficultyKey];
    const bestScore = settings.bestScores[difficultyKey];

    const play = (name) => {
        if (!mutedRef.current) {
            playSound(name);
        }
    }

    const resetRound = () => {
        clearInterval(intervalRef.current);
        clearTimeout(flipTimeoutRef.current);
        lockRef.current = false;
        setIsPaused(false);
        setCards([]);
        setRecordMs(null);
        setAttempts(0);
        setCombo(0);
        setBestCombo(0);
        setScore(0);
        setFinalScore(0);
        setLastNote("");
        setMissIds([]);
        setIsNewRecord(false);
    }

    const finishRound = (matchScore) => {
        clearInterval(intervalRef.current);

        const leftMs = Math.max(0, deadlineRef.current - readNow());
        const elapsedMs = difficulty.timeLimitMs - leftMs;
        const totalScore = matchScore + Math.floor(leftMs / 100);
        const isFastest = !bestMs || elapsedMs < bestMs;
        const isHighScore = !bestScore || totalScore > bestScore;

        play("clear");
        setRecordMs(elapsedMs);
        setFinalScore(totalScore);
        setIsNewRecord(isFastest || isHighScore);
        setSettings(prev => ({
            ...prev,
            bestRecords: {
                ...prev.bestRecords,
                [difficultyKey]: isFastest ? elapsedMs : prev.bestRecords[difficultyKey],
            },
            bestScores: {
                ...prev.bestScores,
                [difficultyKey]: isHighScore ? totalScore : prev.bestScores[difficultyKey],
            },
        }));
        setStatus(STATUS.CLEARED);
    }

    const handleDifficultyOnClick = (key) => {
        if (isPlaying) {
            return;
        }
        resetRound();
        setDifficultyKey(key);
        setStatus(STATUS.READY);
        setRemainMs(DIFFICULTIES[key].timeLimitMs);
    }

    const handleStartOnClick = () => {
        resetRound();
        setCards(createDeck(difficulty));
        setRemainMs(difficulty.timeLimitMs);
        setRound(prev => prev + 1);
        setStatus(STATUS.PLAYING);
    }

    const handlePauseOnClick = () => {
        if (status !== STATUS.PLAYING) {
            return;
        }
        setIsPaused(prev => !prev);
    }

    const handleMuteOnClick = () => {
        setSettings(prev => ({ ...prev, muted: !prev.muted }));
    }

    const handleMotionOnClick = () => {
        setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
    }

    const handleCardOpenOnClick = (id) => {
        if (status !== STATUS.PLAYING || isPaused || lockRef.current) {
            return;
        }

        const target = cards.find(card => card.id === id);
        if (!target || target.isOpen) {
            return;
        }

        const openCards = cards.filter(card => card.isOpen && !card.isAnswer);
        if (openCards.length >= 2) {
            return;
        }

        play("flip");
        const openedCards = cards.map(card => card.id === id ? { ...card, isOpen: true } : card);

        if (openCards.length === 0) {
            setCards(openedCards);
            return;
        }

        const first = openCards[0];
        const second = openedCards.find(card => card.id === id);
        setAttempts(prev => prev + 1);

        if (first.pairKey !== second.pairKey) {
            play("miss");
            setCombo(0);
            setMissIds([ first.id, second.id ]);
            setCards(openedCards);

            lockRef.current = true;
            flipTimeoutRef.current = setTimeout(() => {
                setCards(prev => prev.map(card => card.isAnswer ? card : { ...card, isOpen: false }));
                setMissIds([]);
                lockRef.current = false;
            }, FLIP_BACK_DELAY);
            return;
        }

        const matchedCards = openedCards.map(card =>
            card.pairKey === first.pairKey ? { ...card, isAnswer: true } : card);
        const nextScore = score + MATCH_SCORE + (combo * COMBO_BONUS);

        play("match");
        setCombo(combo + 1);
        setBestCombo(prev => Math.max(prev, combo + 1));
        setScore(nextScore);
        setLastNote(first.note);
        setCards(matchedCards);

        if (matchedCards.every(card => card.isAnswer)) {
            finishRound(nextScore);
        }
    }

    useEffect(() => {
        mutedRef.current = settings.muted;
        saveSettings(settings);
    }, [settings]);

    useEffect(() => {
        if (status !== STATUS.PLAYING || isPaused) {
            return;
        }

        deadlineRef.current = readNow() + remainMs;
        intervalRef.current = setInterval(() => {
            const left = deadlineRef.current - readNow();
            if (left <= 0) {
                setRemainMs(0);
                setStatus(STATUS.FAILED);
                play("fail");
                return;
            }
            setRemainMs(left);
        }, TICK_MS);

        return () => clearInterval(intervalRef.current);
        // remainMs는 타이머를 켜는 시점의 값만 쓰므로 의존성에서 제외합니다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, round, isPaused]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key !== "Escape" && e.code !== "Space") {
                return;
            }
            if (e.code === "Space" && e.target instanceof HTMLElement
                && [ "BUTTON", "INPUT", "TEXTAREA" ].includes(e.target.tagName)) {
                return;
            }
            if (status !== STATUS.PLAYING) {
                return;
            }
            e.preventDefault();
            setIsPaused(prev => !prev);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [status]);

    useEffect(() => () => {
        clearInterval(intervalRef.current);
        clearTimeout(flipTimeoutRef.current);
    }, []);

    return <div css={s.layout}>
        <header css={s.header}>
            <div css={s.titleBox}>
                <h1><GiCardRandom />CARD MATCHING GAME<GiCardRandom /></h1>
                <p>플레이어 {params.username} · {difficulty.label} {difficulty.name}</p>
            </div>

            <div css={s.headerRight}>
                <div css={s.toggleRow}>
                    <button type="button"
                        css={s.toggleButton(settings.muted)}
                        aria-pressed={settings.muted}
                        onClick={handleMuteOnClick}>
                        음소거 {settings.muted ? "켬" : "끔"}
                    </button>
                    <button type="button"
                        css={s.toggleButton(settings.reducedMotion)}
                        aria-pressed={settings.reducedMotion}
                        onClick={handleMotionOnClick}>
                        움직임 줄이기 {settings.reducedMotion ? "켬" : "끔"}
                    </button>
                    <button type="button"
                        css={s.toggleButton(isPaused)}
                        aria-pressed={isPaused}
                        disabled={!isPlaying}
                        onClick={handlePauseOnClick}>
                        {isPaused ? "이어하기" : "일시정지"}
                    </button>
                </div>
                <div css={s.timerBox(isWarning)}>
                    <span css={s.timerLabel}>남은 시간</span>
                    <strong css={s.timerValue}>
                        {formatTime(isPlaying ? remainMs : difficulty.timeLimitMs)}초
                    </strong>
                    <span css={s.timerMeta}>
                        {isPlaying
                            ? `${matchedPairs} / ${totalPairs} 쌍 · ${score}점 · 시도 ${attempts}회`
                            : "제한 시간 30초"}
                    </span>
                </div>
            </div>
        </header>

        <main css={s.main}>
            {
                isBoardVisible &&
                <div css={s.playArea}>
                    <div css={s.board(difficulty.columns)}>
                        {cards.map(card =>
                            <GameCard key={card.id}
                                card={card}
                                isMiss={missIds.includes(card.id)}
                                reducedMotion={settings.reducedMotion}
                                onClick={() => handleCardOpenOnClick(card.id)} />)}
                    </div>
                    <p css={s.noteBar(!!lastNote)} role="status">
                        {combo > 1 && <b css={s.comboTag}>{combo}연속</b>}
                        {lastNote || "짝을 맞추면 여기에 설명이 나옵니다. 스페이스바로 일시정지."}
                    </p>
                </div>
            }

            {
                isPlaying && isPaused &&
                <div css={s.panel}>
                    <div css={s.result("ready")} role="status">
                        <strong>일시정지</strong>
                        <p>남은 시간 {formatTime(remainMs)}초에서 멈췄습니다. 카드는 잠시 가려 둡니다.</p>
                    </div>
                    <button type="button" css={s.startButton} onClick={handlePauseOnClick}>이어하기</button>
                    <p css={s.hint}>스페이스바 또는 Esc로도 이어서 할 수 있습니다.</p>
                </div>
            }

            {
                !isPlaying &&
                <div css={s.panel}>
                    {
                        status === STATUS.CLEARED &&
                        <div css={s.result("success")} role="status">
                            <strong>성공{isNewRecord ? " · 신기록" : ""}</strong>
                            <p>
                                {formatTime(recordMs)}초 만에 {totalPairs}쌍을 모두 맞췄습니다.
                                <br />{finalScore}점 · 최고 {bestCombo}연속 · 시도 {attempts}회
                            </p>
                        </div>
                    }
                    {
                        status === STATUS.FAILED &&
                        <div css={s.result("fail")} role="status">
                            <strong>실패 · 시간 초과</strong>
                            <p>
                                30초 안에 {totalPairs}쌍을 맞추지 못했습니다.
                                <br />{matchedPairs}쌍 성공 · {score}점 · 시도 {attempts}회
                            </p>
                        </div>
                    }
                    {
                        status === STATUS.READY &&
                        <div css={s.result("ready")}>
                            <strong>제한 시간 30초</strong>
                            <p>시간이 끝나기 전에 모든 짝을 찾으세요. 연속으로 맞추면 점수가 올라갑니다.</p>
                        </div>
                    }

                    <div css={s.difficultyBox}>
                        <span css={s.sectionTitle}>난이도</span>
                        <div css={s.difficultyOptions}>
                            {DIFFICULTY_LIST.map(item =>
                                <button key={item.key}
                                    type="button"
                                    css={s.difficultyButton(item.key === difficultyKey)}
                                    aria-pressed={item.key === difficultyKey}
                                    onClick={() => handleDifficultyOnClick(item.key)}>
                                    <strong>{item.label} {item.name}</strong>
                                    <span>{item.rule}</span>
                                    <em>{settings.bestRecords[item.key]
                                        ? `최고 ${formatTime(settings.bestRecords[item.key])}초 · ${settings.bestScores[item.key] ?? 0}점`
                                        : "기록 없음"}</em>
                                </button>)}
                        </div>
                    </div>

                    <button type="button" css={s.startButton} onClick={handleStartOnClick}>
                        {status === STATUS.READY ? "게임 시작" : "다시하기"}
                    </button>

                    <p css={s.hint}>
                        {bestMs
                            ? `${difficulty.label} 최고 ${formatTime(bestMs)}초 · ${bestScore ?? 0}점 · 기록은 다시 접속해도 유지됩니다.`
                            : "아직 이 난이도의 기록이 없습니다. 첫 기록을 만들어 보세요."}
                    </p>
                </div>
            }
        </main>
    </div>
}

export default Game;
