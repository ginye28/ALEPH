/**
 * 인계 문서를 화면에 그리기 위한 최소 마크다운 해석기.
 *
 * 라이브러리를 새로 넣지 않습니다. 의존성이 늘면 이어받는 쪽의
 * 실행 환경 재현이 어려워지고, 그게 이 과제에서 가장 피해야 할 비용입니다.
 * HANDOFF.md에 실제로 쓰는 문법(제목·목록·코드블록·강조·자동링크)만 다룹니다.
 */

const isBullet = (line) => /^\s*-\s+/.test(line);
const isNumbered = (line) => /^\s*\d+\.\s+/.test(line);
const isBlockStart = (line) => /^(#{1,3}\s|```)/.test(line) || isBullet(line) || isNumbered(line);

/** 들여쓴 다음 줄은 앞 항목의 이어지는 문장으로 붙입니다. */
const absorbContinuation = (lines, index, item) => {
    let i = index;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i]) && /^\s{2,}/.test(lines[i])) {
        item.text += ` ${lines[i].trim()}`;
        i += 1;
    }
    return i;
};

export const parseMarkdown = (text) => {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
            i += 1;
            continue;
        }

        if (line.startsWith("```")) {
            const body = [];
            i += 1;
            while (i < lines.length && !lines[i].startsWith("```")) {
                body.push(lines[i]);
                i += 1;
            }
            blocks.push({ type: "code", text: body.join("\n") });
            i += 1;
            continue;
        }

        const heading = line.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
            blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
            i += 1;
            continue;
        }

        if (isBullet(line) || isNumbered(line)) {
            const ordered = isNumbered(line);
            const items = [];

            while (i < lines.length && (ordered ? isNumbered(lines[i]) : isBullet(lines[i]))) {
                const matched = lines[i].match(/^(\s*)(?:-|\d+\.)\s+(.*)$/);
                const item = { depth: Math.min(1, Math.floor(matched[1].length / 2)), text: matched[2] };
                items.push(item);
                i = absorbContinuation(lines, i + 1, item);
            }

            blocks.push({ type: "list", ordered, items });
            continue;
        }

        const body = [];
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
            body.push(lines[i].trim());
            i += 1;
        }
        blocks.push({ type: "para", text: body.join(" ") });
    }

    return blocks;
};

/** `코드` · **강조** · <자동링크> 만 나눕니다. */
export const splitInline = (text) =>
    text.split(/(`[^`]+`|\*\*[^*]+\*\*|<https?:\/\/[^>]+>)/g).filter(Boolean);
