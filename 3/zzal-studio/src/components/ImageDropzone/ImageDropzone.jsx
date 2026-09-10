import { useRef, useState } from "react";
import * as c from "../../styles/controls";
import * as s from "./styles";

function ImageDropzone({ imageName, onPick, onClear }) {
    const inputRef = useRef(null);
    const [isOver, setIsOver] = useState(false);

    const handleFiles = (files) => {
        if (files && files.length > 0) {
            onPick(files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsOver(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>1. 이미지 불러오기</h2>
                <span css={c.panelHint}>PNG · JPEG · 15MB 이하</span>
            </div>

            <div
                css={s.dropzone(isOver)}
                onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
                onDragLeave={() => setIsOver(false)}
                onDrop={handleDrop}>
                <p css={s.dropText}>여기에 이미지를 끌어다 놓거나</p>
                <button
                    type="button"
                    css={c.primaryButton}
                    onClick={() => inputRef.current?.click()}>
                    이미지 고르기
                </button>
                <input
                    ref={inputRef}
                    css={s.hiddenInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        // 같은 파일을 다시 골라도 변경 이벤트가 오도록 비웁니다.
                        e.target.value = "";
                    }}
                />
            </div>

            {!!imageName && (
                <div css={s.picked}>
                    <span css={s.pickedName} title={imageName}>{imageName}</span>
                    <button type="button" css={c.button} onClick={onClear}>이미지 빼기</button>
                </div>
            )}

            <p css={c.notice}>
                불러온 이미지는 브라우저 밖으로 나가지 않습니다. 캔버스에 다시 그려 저장하므로
                내려받는 파일에는 촬영 위치 등 원본의 메타데이터가 남지 않습니다.
            </p>
        </section>
    );
}

export default ImageDropzone;
