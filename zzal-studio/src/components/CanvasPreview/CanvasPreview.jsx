import { useCallback, useEffect, useRef, useState } from "react";
import { renderComposition } from "../../render/composition";
import { getRatio } from "../../render/ratios";
import * as s from "./styles";

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const round2 = (value) => Math.round(value * 100) / 100;

/**
 * 미리보기 캔버스도 출력 해상도(1080px 기준)로 그리고 CSS로만 줄여 보여줍니다.
 * 내보내기와 같은 함수·같은 픽셀 크기를 쓰므로 배치가 어긋날 수 없습니다.
 */
function CanvasPreview({ composition, bitmap, onMoveText }) {
    const canvasRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    // 끌고 있는지는 ref로 판단합니다. 상태 갱신을 기다리면
    // 누르자마자 이어지는 첫 이동을 놓칠 수 있습니다.
    const draggingRef = useRef(false);
    const ratio = getRatio(composition.ratio);

    // 화면 좌표를 그대로 0~1 정규화 좌표로 바꿉니다.
    // 미리보기가 CSS로만 줄어 있으므로 비율 계산만으로 충분합니다.
    const moveTo = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onMoveText({
            x: round2(clamp01((e.clientX - rect.left) / rect.width)),
            y: round2(clamp01((e.clientY - rect.top) / rect.height)),
        });
    };

    const handlePointerDown = (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        draggingRef.current = true;
        setIsDragging(true);
        moveTo(e);
    };

    const handlePointerMove = (e) => {
        if (draggingRef.current) {
            moveTo(e);
        }
    };

    const handlePointerUp = (e) => {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        draggingRef.current = false;
        setIsDragging(false);
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        if (canvas.width !== ratio.width || canvas.height !== ratio.height) {
            canvas.width = ratio.width;
            canvas.height = ratio.height;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        try {
            renderComposition(ctx, { ...composition, bitmap }, { w: ratio.width, h: ratio.height });
        } catch {
            // 콘솔 빨간 오류 대신 빈 미리보기로 남깁니다.
            ctx.clearRect(0, 0, ratio.width, ratio.height);
        }
    }, [composition, bitmap, ratio]);

    useEffect(() => {
        draw();

        // 웹폰트가 늦게 도착하면 한 번 더 그립니다.
        let cancelled = false;
        document.fonts?.ready.then(() => {
            if (!cancelled) {
                draw();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [draw]);

    return (
        <figure css={s.layout}>
            <div css={s.stage}>
                <canvas
                    ref={canvasRef}
                    css={s.canvas(isDragging)}
                    role="img"
                    aria-label={`미리보기 ${ratio.label}, 문구 ${composition.text.content || "없음"}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                />
            </div>
            <figcaption css={s.caption}>
                <span css={s.badge}>미리보기 {ratio.label}</span>
                <span css={s.size}>{ratio.width} × {ratio.height}px</span>
                <span css={s.note}>끌어서 문구 위치를 옮길 수 있습니다 · 내려받는 파일과 같은 크기로 그린 화면입니다</span>
            </figcaption>
        </figure>
    );
}

export default CanvasPreview;
