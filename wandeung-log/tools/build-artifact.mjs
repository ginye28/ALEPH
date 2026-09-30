/**
 * index.html → wandeung-log.artifact.html
 *
 * 같은 앱을 세 군데에 올린다: Vercel(공유 기능 포함), GitHub Pages, claude.ai 아티팩트.
 * 앞의 둘은 완전한 HTML 문서가 필요하고, 아티팩트는 플랫폼이 문서 껍데기를 직접 씌우므로
 * <!doctype>·<html>·<head>·<body>가 있으면 중첩된다.
 *
 * 그래서 index.html 하나만 손으로 고치고, 아티팩트용 파일은 여기서 껍데기를 벗겨 만든다.
 * 두 파일이 서로 다른 내용으로 갈라지는 일을 막으려는 것이다.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "index.html");
const OUT = join(root, "wandeung-log.artifact.html");

const html = await readFile(SRC, "utf8");

const headOpen = html.indexOf("<head>");
const headClose = html.indexOf("</head>");
const bodyOpen = html.indexOf("<body>");
const bodyClose = html.lastIndexOf("</body>");

if (headOpen < 0 || headClose < 0 || bodyOpen < 0 || bodyClose < 0) {
    throw new Error("index.html에서 <head>/<body>를 찾지 못했습니다. 문서 구조가 바뀌었는지 확인하세요.");
}

// head에서 플랫폼이 알아서 넣어주는 것(charset, viewport, description, color-scheme)은 버리고
// 페이지가 직접 쓰는 것(title, 폰트 link, style)만 남긴다.
const head = html
    .slice(headOpen + "<head>".length, headClose)
    .split("\n")
    .filter((line) => !/^\s*<meta\s/i.test(line))
    .join("\n")
    .trim();

const body = html.slice(bodyOpen + "<body>".length, bodyClose).trim();

const out = `${head}\n\n${body}\n`;
await writeFile(OUT, out, "utf8");

console.log(`wandeung-log.artifact.html 생성 — ${out.length.toLocaleString()}자`);
if (/<!doctype|<html|<\/html>|<body|<\/body>/i.test(out)) {
    throw new Error("껍데기가 남아 있습니다. 아티팩트에 올리면 문서가 중첩됩니다.");
}
