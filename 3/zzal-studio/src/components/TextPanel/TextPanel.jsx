import { MAX_SIZE_RATIO, MIN_SIZE_RATIO, TEXT_ALIGNS } from "../../constants/defaults";
import * as c from "../../styles/controls";
import * as s from "./styles";

const ALIGN_LABELS = { left: "왼쪽", center: "가운데", right: "오른쪽" };

function TextPanel({ text, onChange }) {

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>3. 문구</h2>
                <span css={c.panelHint}>미리보기를 끌어 위치를 옮길 수 있습니다</span>
            </div>

            <label css={c.field}>
                <span css={c.label}>
                    문구 내용
                    <span css={c.value}>{[...text.content].length}자</span>
                </span>
                <textarea
                    css={c.textarea}
                    value={text.content}
                    placeholder="문구를 입력하세요. 비워 두면 이미지만 저장됩니다."
                    onChange={(e) => onChange({ content: e.target.value })}
                />
            </label>

            <div css={c.field}>
                <span css={c.label}>정렬</span>
                <div css={c.segmented} role="radiogroup" aria-label="문구 정렬">
                    {TEXT_ALIGNS.map((align) => (
                        <button
                            key={align}
                            type="button"
                            role="radio"
                            aria-checked={text.align === align}
                            css={c.segment(text.align === align)}
                            onClick={() => onChange({ align })}>
                            {ALIGN_LABELS[align]}
                        </button>
                    ))}
                </div>
            </div>

            <div css={c.grid2}>
                <label css={c.field}>
                    <span css={c.label}>
                        가로 위치
                        <span css={c.value}>{Math.round(text.x * 100)}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={text.x}
                        onChange={(e) => onChange({ x: Number(e.target.value) })}
                    />
                </label>
                <label css={c.field}>
                    <span css={c.label}>
                        세로 위치
                        <span css={c.value}>{Math.round(text.y * 100)}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={text.y}
                        onChange={(e) => onChange({ y: Number(e.target.value) })}
                    />
                </label>
            </div>

            <div css={c.grid2}>
                <label css={c.field}>
                    <span css={c.label}>
                        글자 크기
                        <span css={c.value}>{Math.round(text.sizeRatio * 1000) / 10}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min={MIN_SIZE_RATIO}
                        max={MAX_SIZE_RATIO}
                        step="0.002"
                        value={text.sizeRatio}
                        onChange={(e) => onChange({ sizeRatio: Number(e.target.value) })}
                    />
                </label>
                <label css={c.field}>
                    <span css={c.label}>
                        글상자 폭
                        <span css={c.value}>{Math.round(text.maxWidthRatio * 100)}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0.3"
                        max="1"
                        step="0.01"
                        value={text.maxWidthRatio}
                        onChange={(e) => onChange({ maxWidthRatio: Number(e.target.value) })}
                    />
                </label>
            </div>

            <div css={c.grid2}>
                <label css={c.field}>
                    <span css={c.label}>
                        줄 간격
                        <span css={c.value}>{text.lineHeight.toFixed(2)}</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0.9"
                        max="2"
                        step="0.01"
                        value={text.lineHeight}
                        onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
                    />
                </label>
                <label css={c.field}>
                    <span css={c.label}>
                        외곽선 두께
                        <span css={c.value}>{Math.round(text.stroke.widthRatio * 1000) / 10}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0"
                        max="0.02"
                        step="0.001"
                        value={text.stroke.widthRatio}
                        onChange={(e) => onChange({
                            stroke: { ...text.stroke, widthRatio: Number(e.target.value) },
                        })}
                    />
                </label>
            </div>

            <div css={c.grid2}>
                <label css={c.field}>
                    <span css={c.label}>
                        문구 뒤 띠
                        <span css={c.value}>{Math.round(text.box.opacity * 100)}%</span>
                    </span>
                    <input
                        css={c.range}
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={text.box.opacity}
                        onChange={(e) => onChange({
                            box: { ...text.box, opacity: Number(e.target.value) },
                        })}
                    />
                </label>
                <label css={c.field}>
                    <span css={c.label}>
                        띠 색
                        <span css={s.hex}>{text.box.color}</span>
                    </span>
                    <input
                        css={c.colorInput}
                        type="color"
                        value={text.box.color}
                        onChange={(e) => onChange({
                            box: { ...text.box, color: e.target.value.toUpperCase() },
                        })}
                    />
                </label>
            </div>

            <div css={c.grid2}>
                <label css={c.field}>
                    <span css={c.label}>
                        글자 색
                        <span css={s.hex}>{text.color}</span>
                    </span>
                    <input
                        css={c.colorInput}
                        type="color"
                        value={text.color}
                        onChange={(e) => onChange({ color: e.target.value.toUpperCase() })}
                    />
                </label>
                <label css={c.field}>
                    <span css={c.label}>
                        외곽선 색
                        <span css={s.hex}>{text.stroke.color}</span>
                    </span>
                    <input
                        css={c.colorInput}
                        type="color"
                        value={text.stroke.color}
                        onChange={(e) => onChange({
                            stroke: { ...text.stroke, color: e.target.value.toUpperCase() },
                        })}
                    />
                </label>
            </div>
        </section>
    );
}

export default TextPanel;
