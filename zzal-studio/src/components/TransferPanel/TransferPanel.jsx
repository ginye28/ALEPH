import { useRef } from "react";
import * as c from "../../styles/controls";
import * as s from "./styles";

function TransferPanel({ format, onFormat, onDownload, onExport, onImport, templateCount, isBusy }) {
    const inputRef = useRef(null);

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>5. 내려받기와 옮겨 쓰기</h2>
                <span css={c.panelHint}>미리보기와 같은 크기로 저장됩니다</span>
            </div>

            <div css={c.field}>
                <span css={c.label}>저장 형식</span>
                <div css={c.segmented} role="radiogroup" aria-label="저장 형식">
                    <button
                        type="button"
                        role="radio"
                        aria-checked={format === "png"}
                        css={c.segment(format === "png")}
                        onClick={() => onFormat("png")}>
                        PNG
                        <small>투명 유지</small>
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={format === "jpeg"}
                        css={c.segment(format === "jpeg")}
                        onClick={() => onFormat("jpeg")}>
                        JPEG
                        <small>용량 작음</small>
                    </button>
                </div>
            </div>

            <button type="button" css={s.downloadButton} onClick={onDownload} disabled={isBusy}>
                {isBusy ? "이미지 만드는 중…" : "이미지 내려받기"}
            </button>

            <div css={s.divider} />

            <div css={c.buttonRow}>
                <button type="button" css={c.button} onClick={onExport} disabled={templateCount === 0}>
                    템플릿 JSON 내보내기 ({templateCount}개)
                </button>
                <button type="button" css={c.button} onClick={() => inputRef.current?.click()}>
                    템플릿 JSON 가져오기
                </button>
                <input
                    ref={inputRef}
                    css={s.hiddenInput}
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            onImport(file);
                        }
                        e.target.value = "";
                    }}
                />
            </div>

            <p css={c.notice}>
                내보낸 JSON에는 배치 설정만 담깁니다. 이미지 파일과 개인정보는 들어가지 않습니다.
                가져오기는 파일 전체를 검사한 뒤에만 반영하므로, 잘못된 파일을 넣어도 지금 목록은 그대로 남습니다.
            </p>
        </section>
    );
}

export default TransferPanel;
