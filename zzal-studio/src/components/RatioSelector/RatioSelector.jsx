import { TRANSPARENT } from "../../constants/defaults";
import { RATIOS } from "../../render/ratios";
import * as c from "../../styles/controls";
import * as s from "./styles";

function RatioSelector({ ratio, image, background, onRatio, onImage, onBackground }) {
    const isTransparent = background === TRANSPARENT;

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>2. 화면비와 이미지 배치</h2>
                <span css={c.panelHint}>고른 비율이 그대로 저장 크기입니다</span>
            </div>

            <div css={c.field}>
                <span css={c.label}>화면비</span>
                <div css={c.segmented} role="radiogroup" aria-label="화면비">
                    {RATIOS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="radio"
                            aria-checked={ratio === item.id}
                            css={c.segment(ratio === item.id)}
                            onClick={() => onRatio(item.id)}>
                            {item.label}
                            <small>{item.hint}</small>
                        </button>
                    ))}
                </div>
            </div>

            <div css={c.field}>
                <span css={c.label}>이미지 맞춤</span>
                <div css={c.segmented} role="radiogroup" aria-label="이미지 맞춤">
                    <button
                        type="button"
                        role="radio"
                        aria-checked={image.fit === "cover"}
                        css={c.segment(image.fit === "cover")}
                        onClick={() => onImage({ fit: "cover" })}>
                        채우기
                        <small>가장자리를 잘라 꽉 채움</small>
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={image.fit === "contain"}
                        css={c.segment(image.fit === "contain")}
                        onClick={() => onImage({ fit: "contain" })}>
                        맞추기
                        <small>전체를 담고 여백은 배경색</small>
                    </button>
                </div>
            </div>

            <div css={c.grid2}>
                <label css={c.field}>
                    <span css={c.label}>
                        좌우 위치
                        <span css={c.value}>{Math.round(image.offsetX * 100)}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={image.offsetX}
                        onChange={(e) => onImage({ offsetX: Number(e.target.value) })}
                    />
                </label>
                <label css={c.field}>
                    <span css={c.label}>
                        상하 위치
                        <span css={c.value}>{Math.round(image.offsetY * 100)}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={image.offsetY}
                        onChange={(e) => onImage({ offsetY: Number(e.target.value) })}
                    />
                </label>
            </div>

            <label css={c.field}>
                <span css={c.label}>
                    이미지 크기
                    <span css={c.value}>{image.scale.toFixed(2)}배</span>
                </span>
                <input
                    css={c.range}
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.01"
                    value={image.scale}
                    onChange={(e) => onImage({ scale: Number(e.target.value) })}
                />
            </label>

            <div css={c.field}>
                <span css={c.label}>배경</span>
                <div css={s.backgroundRow}>
                    <input
                        css={c.colorInput}
                        type="color"
                        aria-label="배경색"
                        value={isTransparent ? "#111114" : background}
                        onChange={(e) => onBackground(e.target.value.toUpperCase())}
                    />
                    <button
                        type="button"
                        aria-pressed={isTransparent}
                        css={c.segment(isTransparent)}
                        onClick={() => onBackground(isTransparent ? "#111114" : TRANSPARENT)}>
                        투명
                        <small>PNG만 유지</small>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default RatioSelector;
