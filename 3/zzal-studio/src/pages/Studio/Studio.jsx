import { useCallback, useRef, useState } from "react";
import CanvasPreview from "../../components/CanvasPreview/CanvasPreview";
import ImageDropzone from "../../components/ImageDropzone/ImageDropzone";
import RatioSelector from "../../components/RatioSelector/RatioSelector";
import TemplateList from "../../components/TemplateList/TemplateList";
import TextPanel from "../../components/TextPanel/TextPanel";
import TransferPanel from "../../components/TransferPanel/TransferPanel";
import { createDefaultComposition } from "../../constants/defaults";
import { createExportPayload, parseImportFile } from "../../storage/schema";
import {
    createTemplate,
    loadTemplates,
    removeTemplate,
    replaceTemplates,
    updateTemplate,
} from "../../storage/templates";
import { downloadJson, exportComposition } from "../../utils/download";
import { loadImage } from "../../utils/loadImage";
import * as s from "./styles";

function Studio() {
    const [composition, setComposition] = useState(createDefaultComposition);
    const [bitmap, setBitmap] = useState(null);
    const [imageName, setImageName] = useState("");
    // 시작할 때 저장 데이터를 그대로 읽어 목록을 만듭니다.
    const [templates, setTemplates] = useState(loadTemplates);
    const [selectedId, setSelectedId] = useState(null);
    const [format, setFormat] = useState("png");
    const [isBusy, setIsBusy] = useState(false);
    const [message, setMessage] = useState(null);

    const bitmapRef = useRef(null);

    const notify = useCallback((tone, text) => setMessage({ tone, text, at: Date.now() }), []);

    const swapBitmap = useCallback((next) => {
        bitmapRef.current?.close?.();
        bitmapRef.current = next;
        setBitmap(next);
    }, []);

    const patch = useCallback((changes) => {
        setComposition((prev) => ({ ...prev, ...changes }));
    }, []);

    const patchText = useCallback((changes) => {
        setComposition((prev) => ({ ...prev, text: { ...prev.text, ...changes } }));
    }, []);

    const patchImage = useCallback((changes) => {
        setComposition((prev) => ({ ...prev, image: { ...prev.image, ...changes } }));
    }, []);

    const handlePick = async (file) => {
        const result = await loadImage(file);

        // 실패하면 기존 편집 내용을 그대로 두고 이유만 알립니다.
        if (!result.ok) {
            notify("error", result.reason);
            return;
        }

        swapBitmap(result.bitmap);
        setImageName(result.name);
        notify("info", `${result.name} 을(를) 불러왔습니다.`);
    };

    const handleClearImage = () => {
        swapBitmap(null);
        setImageName("");
        notify("info", "이미지를 뺐습니다. 배경색과 문구만 남습니다.");
    };

    const applyResult = (result, successText) => {
        setTemplates(result.items);
        if (!result.ok) {
            notify("error", result.reason);
            return false;
        }
        notify("info", successText);
        return true;
    };

    const handleCreateTemplate = () => {
        const result = createTemplate(composition);
        if (applyResult(result, `"${composition.name}" 템플릿을 만들었습니다.`)) {
            setSelectedId(result.template.id);
        }
    };

    const handleLoadTemplate = (id) => {
        const template = templates.find((item) => item.id === id);
        if (!template) {
            notify("error", "템플릿을 찾지 못했습니다.");
            return;
        }

        setComposition({ ...template });
        setSelectedId(id);
        notify("info", `"${template.name}" 설정을 불러왔습니다. 이미지는 다시 골라 주세요.`);
    };

    const handleUpdateTemplate = (id) => {
        const result = updateTemplate(id, composition);
        if (applyResult(result, `"${composition.name}" 템플릿을 수정했습니다.`)) {
            setSelectedId(id);
        }
    };

    const handleRemoveTemplate = (id) => {
        const target = templates.find((item) => item.id === id);
        if (!window.confirm(`"${target?.name ?? "템플릿"}"을(를) 삭제할까요?`)) {
            return;
        }

        const result = removeTemplate(id);
        if (applyResult(result, "템플릿을 삭제했습니다.") && selectedId === id) {
            setSelectedId(null);
        }
    };

    const handleDownload = async () => {
        setIsBusy(true);
        const result = await exportComposition({ composition, bitmap, format });
        setIsBusy(false);

        if (!result.ok) {
            notify("error", result.reason);
            return;
        }
        notify("info", `${result.filename} (${Math.round(result.size / 1024)}KB) 를 내려받았습니다.`);
    };

    const handleExportJson = () => {
        downloadJson(createExportPayload(templates), `zzal-templates-${templates.length}.json`);
        notify("info", `템플릿 ${templates.length}개를 JSON으로 내보냈습니다.`);
    };

    const handleImportJson = async (file) => {
        let rawText;
        try {
            rawText = await file.text();
        } catch {
            notify("error", "파일을 읽지 못했습니다.");
            return;
        }

        const parsed = parseImportFile(rawText);

        // 검증에 실패하면 저장소를 건드리지 않습니다. 지금 목록이 그대로 남습니다.
        if (!parsed.ok) {
            notify("error", `${parsed.reason} 기존 템플릿 ${templates.length}개는 그대로 있습니다.`);
            return;
        }

        const result = replaceTemplates(parsed.items);
        if (applyResult(result, `템플릿 ${parsed.items.length}개를 불러왔습니다.`)) {
            setSelectedId(null);
        }
    };

    return (
        <div css={s.page}>
            <header css={s.header}>
                <p css={s.eyebrow}>짤·카드 스튜디오</p>
                <h1 css={s.title}>이미지와 문구를 얹어 그대로 내려받기</h1>
                <p css={s.lead}>
                    미리보기가 곧 저장 파일입니다. 화면에 보이는 배치와 내려받은 이미지의 배치가 같습니다.
                </p>
            </header>

            <div css={s.status(message?.tone)} role="status" aria-live="polite">
                {message ? message.text : "이미지를 고르고 문구를 입력하면 미리보기가 바로 바뀝니다."}
            </div>

            <main css={s.main}>
                <div css={s.previewColumn}>
                    <CanvasPreview
                        composition={composition}
                        bitmap={bitmap}
                        onMoveText={patchText}
                    />
                </div>

                <div css={s.controlColumn}>
                    <ImageDropzone
                        imageName={imageName}
                        onPick={handlePick}
                        onClear={handleClearImage}
                    />
                    <RatioSelector
                        ratio={composition.ratio}
                        image={composition.image}
                        background={composition.background}
                        onRatio={(ratio) => patch({ ratio })}
                        onImage={patchImage}
                        onBackground={(background) => patch({ background })}
                    />
                    <TextPanel text={composition.text} onChange={patchText} />
                    <TemplateList
                        templates={templates}
                        selectedId={selectedId}
                        name={composition.name}
                        onNameChange={(name) => patch({ name })}
                        onCreate={handleCreateTemplate}
                        onLoad={handleLoadTemplate}
                        onUpdate={handleUpdateTemplate}
                        onRemove={handleRemoveTemplate}
                    />
                    <TransferPanel
                        format={format}
                        templateCount={templates.length}
                        isBusy={isBusy}
                        onFormat={setFormat}
                        onDownload={handleDownload}
                        onExport={handleExportJson}
                        onImport={handleImportJson}
                    />
                </div>
            </main>

            <footer css={s.footer}>
                <details css={s.guide}>
                    <summary css={s.guideSummary}>검증 안내서 — 3단계로 확인하기</summary>
                    <ol css={s.guideList}>
                        <li>이미지 고르기를 눌러 PNG 또는 JPEG를 한 장 넣습니다.</li>
                        <li>문구를 입력하고 화면비 4:5를 고릅니다.</li>
                        <li>이미지 내려받기를 누릅니다.</li>
                    </ol>
                    <p css={s.guideNote}>
                        <b>무엇이 보이면 통과인가요</b> — 내려받은 파일을 열었을 때 문구의 위치·크기·색·줄바꿈이
                        위 미리보기와 같고, 이미지 비율이 4:5입니다.
                    </p>
                    <p css={s.guideNote}>
                        <b>안 될 때</b> — 파일이 거부되면 PNG·JPEG인지 확인합니다. 내려받기가 되지 않으면
                        브라우저의 다운로드 차단을 해제합니다. 글자가 다른 글꼴로 보이면 새로고침 후 다시 시도합니다.
                    </p>
                </details>
                <p css={s.footNote}>
                    모든 처리는 이 브라우저 안에서만 이뤄집니다. 서버로 보내는 이미지·문구·개인정보가 없습니다.
                </p>
            </footer>
        </div>
    );
}

export default Studio;
