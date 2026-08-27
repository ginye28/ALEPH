import { useRef, useState } from "react";
import { SCHEMA_VERSION } from "../../core/migrate";
import { todayKey } from "../../core/validate";
import * as c from "../../styles/controls";
import * as s from "./styles";

/**
 * 자료 도구 (카드 2·3).
 *
 * 내보내기 · 가져오기 · 전체 삭제와, 무슨 일이 있었는지 보여주는 영역.
 * 합성 자료 넣기 버튼도 여기 둡니다 — 채점자가 빈 화면에서 시작하면
 * 15초 안에 판정할 수 없습니다.
 */
function DataTools({ records, converted, message, onExport, onImport, onClearAll, onSeed }) {
    const fileRef = useRef(null);
    const [asking, setAsking] = useState(false);

    const pick = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => onImport(String(reader.result ?? ""), file.name);
        reader.onerror = () => onImport("", file.name);
        reader.readAsText(file);

        // 같은 파일을 다시 골라도 change가 뜨도록 비웁니다.
        event.target.value = "";
    };

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>자료 도구</h2>
                <span css={c.panelHint}>내보내기 · 가져오기 · 전체 삭제</span>
            </div>

            {/* 카드 3 — 현재 자료 형식과 변환 상태를 화면에 남깁니다. */}
            <div css={s.schemaLine} data-testid="schema-line">
                <span>
                    자료 형식 <code>v{SCHEMA_VERSION}</code>
                </span>
                <span>
                    {converted > 0
                        ? `이전 형식 ${converted}건을 v${SCHEMA_VERSION}로 변환했습니다`
                        : `변환할 이전 형식 기록이 없습니다`}
                </span>
                <span>
                    현재 <code>{records.length}건</code>
                </span>
            </div>

            <div css={s.group}>
                <span css={c.label}>내보내기 · 가져오기</span>
                <div css={s.row}>
                    <button type="button" css={c.button} onClick={onExport} disabled={records.length === 0}>
                        JSON 내보내기
                    </button>
                    <label css={s.fileLabel}>
                        JSON 가져오기
                        <input ref={fileRef} type="file" accept="application/json,.json" onChange={pick} />
                    </label>
                    <span css={c.panelHint}>
                        같은 <code>id</code>는 건너뜁니다. 두 번 불러와도 기록이 늘지 않습니다.
                    </span>
                </div>
            </div>

            <div css={s.group}>
                <span css={c.label}>합성 자료 넣기 — 공개 화면의 자료는 모두 합성입니다</span>
                <div css={s.row}>
                    <button type="button" css={c.button} onClick={() => onSeed("v1")}>
                        v1 합성 기록 5건
                    </button>
                    <button type="button" css={c.button} onClick={() => onSeed("edge")}>
                        경계 · 오류 자료
                    </button>
                    <span css={c.panelHint}>기존 기록을 갈아끼웁니다</span>
                </div>
            </div>

            <div css={s.group}>
                <span css={c.label}>전체 삭제</span>
                <div css={s.row}>
                    <button type="button" css={s.danger} onClick={() => setAsking(true)} disabled={asking}>
                        전체 삭제
                    </button>
                    <span css={c.panelHint}>되돌릴 수 없습니다. 먼저 내보내기를 해두세요.</span>
                </div>

                {asking && (
                    <div css={s.confirm}>
                        <b>기록 {records.length}건을 모두 지웁니다.</b> 새로고침해도 돌아오지 않습니다.
                        <div css={s.confirmRow}>
                            <button
                                type="button"
                                css={s.danger}
                                onClick={() => {
                                    onClearAll();
                                    setAsking(false);
                                }}>
                                네, 전부 지웁니다
                            </button>
                            <button type="button" css={c.button} onClick={() => setAsking(false)}>
                                취소
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 카드 2 — 오류 이유를 보여주는 영역. 성공일 때도 무슨 일이 있었는지 남깁니다. */}
            <div>
                <span css={c.label}>결과 · 오류</span>
                <p css={s.message(message?.tone ?? null)} role="status" data-testid="data-message">
                    {message?.text ?? `아직 실행한 작업이 없습니다. (오늘 ${todayKey()})`}
                </p>
            </div>
        </section>
    );
}

export default DataTools;
