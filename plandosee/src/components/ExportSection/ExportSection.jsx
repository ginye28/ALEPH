import { useState } from "react";
import * as c from "../../styles/controls";

/** 내 자료 전체를 파일 하나로 (T06-C36). 새로고침해도 값이 그대로인지는 서버 DB가 보장합니다. */
function ExportSection({ onExportAll }) {
    const [message, setMessage] = useState(null);

    const handleExport = async () => {
        const { data, error } = await onExportAll();
        if (error) {
            setMessage({ tone: "bad", text: `내보내지 못했습니다: ${error.message}` });
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `plandosee2-내보내기-${data.exportedAt.slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setMessage({
            tone: "good",
            text: `계획 ${data.plans.length}건 · 할일 ${data.tasks.length}건 · 실행기록 ${data.executionRecords.length}건을 내보냈습니다.`,
        });
    };

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>내 자료 내보내기</h2>
                <span css={c.panelHint}>계획·이력·할일·실행기록·고칠 점 전체를 파일 하나로</span>
            </div>
            <button type="button" css={c.primaryButton} onClick={handleExport}>
                전체 내보내기
            </button>
            {message && (
                <p css={c.note} data-testid="export-message" style={{ color: message.tone === "bad" ? "var(--bad)" : undefined }}>
                    {message.text}
                </p>
            )}
        </section>
    );
}

export default ExportSection;
