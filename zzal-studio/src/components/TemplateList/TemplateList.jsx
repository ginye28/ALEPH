import * as c from "../../styles/controls";
import * as s from "./styles";

const previewText = (content) => {
    const firstLine = content.split("\n")[0].trim();
    if (firstLine === "") {
        return "(문구 없음)";
    }
    return [...firstLine].length > 18 ? `${[...firstLine].slice(0, 18).join("")}…` : firstLine;
};

function TemplateList({ templates, selectedId, name, onNameChange, onCreate, onLoad, onUpdate, onRemove }) {

    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>4. 템플릿</h2>
                <span css={c.panelHint}>새로고침 뒤에도 이 기기에 남습니다</span>
            </div>

            <div css={s.createRow}>
                <input
                    css={c.textInput}
                    type="text"
                    value={name}
                    maxLength={40}
                    aria-label="템플릿 이름"
                    placeholder="템플릿 이름"
                    onChange={(e) => onNameChange(e.target.value)}
                />
                <button type="button" css={c.primaryButton} onClick={onCreate}>
                    새 템플릿 만들기
                </button>
            </div>

            {templates.length === 0 ? (
                <p css={s.empty}>저장된 템플릿이 없습니다. 지금 설정을 이름과 함께 저장해 보세요.</p>
            ) : (
                <ul css={s.list}>
                    {templates.map((template) => (
                        <li key={template.id} css={s.item(template.id === selectedId)}>
                            <div css={s.itemHead}>
                                <strong css={s.itemName}>{template.name}</strong>
                                <span css={s.itemRatio}>{template.ratio}</span>
                            </div>
                            <p css={s.itemText}>{previewText(template.text.content)}</p>
                            <div css={c.buttonRow}>
                                <button type="button" css={c.button} onClick={() => onLoad(template.id)}>
                                    불러오기
                                </button>
                                <button type="button" css={c.button} onClick={() => onUpdate(template.id)}>
                                    현재 설정으로 수정
                                </button>
                                <button type="button" css={c.dangerButton} onClick={() => onRemove(template.id)}>
                                    삭제
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <p css={c.notice}>
                템플릿에는 이름·화면비·문구·위치·크기·색·이미지 맞춤 방식만 담깁니다.
                이미지 파일은 저장하지 않으므로 불러온 뒤 이미지를 다시 고르면 됩니다.
            </p>
        </section>
    );
}

export default TemplateList;
