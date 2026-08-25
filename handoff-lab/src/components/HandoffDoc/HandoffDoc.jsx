import handoffText from "../../../HANDOFF.md?raw";
import * as c from "../../styles/controls";
import { parseMarkdown, splitInline } from "./markdown";
import * as s from "./styles";

// 저장소의 HANDOFF.md 원문을 그대로 읽습니다.
// 화면용 사본을 따로 두면 문서와 화면이 어긋나고, 그때 인계 문서를 믿을 수 없게 됩니다.
const blocks = parseMarkdown(handoffText);

const HEADINGS = [
    "목표",
    "현재 상태",
    "실행 명령",
    "통과한 검사",
    "남은 문제",
    "다음 행동",
    "건드리면 안 되는 부분",
];

const Inline = ({ text }) =>
    splitInline(text).map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
            return (
                <code key={index} css={s.inlineCode}>
                    {part.slice(1, -1)}
                </code>
            );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("<http")) {
            const url = part.slice(1, -1);
            return (
                <a key={index} href={url} target="_blank" rel="noreferrer">
                    {url}
                </a>
            );
        }
        return <span key={index}>{part}</span>;
    });

function HandoffDoc() {
    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>인계 문서</h2>
                <span css={c.panelHint}>
                    저장소의 HANDOFF.md 원문 · 첫 대화를 보지 않아도 이어갈 수 있게 씁니다
                </span>
            </div>

            <p css={s.headingMap}>
                {HEADINGS.map((heading) => (
                    <span key={heading} css={s.headingChip}>
                        {heading}
                    </span>
                ))}
            </p>

            <article css={s.doc}>
                {blocks.map((block, index) => {
                    if (block.type === "heading") {
                        return block.level === 1 ? (
                            <h3 key={index} css={s.docTitle}>
                                {block.text}
                            </h3>
                        ) : (
                            <h4 key={index} css={s.docHeading}>
                                {block.text}
                            </h4>
                        );
                    }

                    if (block.type === "code") {
                        return (
                            <pre key={index} css={s.code}>
                                {block.text}
                            </pre>
                        );
                    }

                    if (block.type === "list") {
                        const List = block.ordered ? "ol" : "ul";
                        return (
                            <List key={index} css={s.list(block.ordered)}>
                                {block.items.map((item, itemIndex) => (
                                    <li key={itemIndex} css={s.item(item.depth)}>
                                        <Inline text={item.text} />
                                    </li>
                                ))}
                            </List>
                        );
                    }

                    return (
                        <p key={index} css={s.para}>
                            <Inline text={block.text} />
                        </p>
                    );
                })}
            </article>
        </section>
    );
}

export default HandoffDoc;
