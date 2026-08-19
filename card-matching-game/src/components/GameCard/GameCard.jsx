import * as s from "./styles";

function GameCard({ card, isMiss, reducedMotion, onClick }) {
    const { label, sub, isOpen, isAnswer } = card;

    return <button type="button"
        css={s.scene(isMiss, reducedMotion)}
        onClick={onClick}
        disabled={isAnswer}
        aria-label={isOpen ? `${label}${isAnswer ? " (맞춘 카드)" : ""}` : "뒤집지 않은 카드"}>
        <div css={s.layout(isOpen, reducedMotion)}>
            <div css={s.front(isAnswer, reducedMotion)}>
                <strong>{label}</strong>
                {!!sub && <span>{sub}</span>}
            </div>
            <div css={s.back}>
                <div css={s.pattern}></div>
            </div>
        </div>
    </button>
}

export default GameCard;
