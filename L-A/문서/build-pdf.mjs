#!/usr/bin/env node
// 이력서·자기소개서·경력기술서 md → 인쇄용 HTML → PDF (Edge/Chrome 헤드리스)
// 자기소개서 본문은 「자기소개 본편.md」에서 가져온다 — 사이트 이야기와 한 원본을 쓴다.
// 사용: node build-pdf.mjs

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_HTML = join(HERE, 'out', 'print.html');
const PDF_NAME = 'jin-hyejeong-resume.pdf';
const PDF_SITE = join(HERE, '..', 'site', 'docs', PDF_NAME);
const PDF_LOCAL = join(HERE, '진혜정_이력서_자기소개서_경력기술서.pdf');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(https?:\/\/[^\s|)]+)/g, (u) => `<a href="${u}">${u.replace(/^https?:\/\//, '')}</a>`);

// 자기소개 본편: 첫 --- 와 둘째 --- 사이, 작업 표시 제거
const storyMd = readFileSync(join(HERE, '자기소개 본편.md'), 'utf8').replace(/\r\n/g, '\n').split('\n---\n')[1]
  .replace(/\*\*\[직접 쓰기[^\]]*\]\*\* ?/g, '')
  .replace(/ ?〔[^〕]*〕/g, '')
  .trim();

const md = readFileSync(join(HERE, '이력서·자기소개서·경력기술서.md'), 'utf8').replace(/\r\n/g, '\n')
  .replace('{{STORY}}', storyMd);

// 이 문서에 쓰는 만큼만 다루는 작은 변환기: 제목, 문단, 표
function toHtml(src) {
  const out = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    const h = l.match(/^(#{1,3}) (.*)$/);
    if (h) {
      const n = h[1].length;
      out.push(n === 2 ? `<h2 class="sec">${inline(h[2])}</h2>` : `<h${n}>${inline(h[2])}</h${n}>`);
      continue;
    }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.slice(1, -1).split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(`<table class="c${head.length}"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    out.push(`<p>${inline(l)}</p>`);
  }
  return out.join('\n');
}

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>진혜정 — 이력서 · 자기소개서 · 경력기술서</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
  @page { size: A4; margin: 14mm 15mm 15mm; }
  body { font: 10pt/1.65 "Pretendard", "Malgun Gothic", sans-serif; color: #1c1b19; word-break: keep-all; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 2mm; letter-spacing: -.02em; }
  h1 + p { margin-top: 0; }
  .band { border-top: 3pt solid #0b1220; margin-bottom: 6mm; }
  h2.sec { font-size: 14pt; margin: 0 0 4mm; padding: 2mm 0 2mm 3mm; border-left: 4pt solid #c2572b; background: #f6f1ea; }
  h2.sec:not(:first-of-type) { break-before: page; }
  h3 { font-size: 11pt; margin: 5mm 0 2mm; color: #0b1220; }
  p { margin: 0 0 3mm; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; font-size: 8.8pt; }
  th, td { border-bottom: .5pt solid #ddd6ca; padding: 1.2mm 2mm; text-align: left; vertical-align: top; }
  th { background: #0b1220; color: #fff; font-weight: 600; }
  tr { break-inside: avoid; }
  td:first-child { font-weight: 600; white-space: nowrap; }
  table.c5 td:first-child { white-space: normal; width: 22%; }
  table.c5 td:nth-child(2) { width: 7%; text-align: center; }
  a { color: #c2572b; text-decoration: none; word-break: break-all; }
  .story h3 { font-size: 10.5pt; margin: 5mm 0 1.5mm; color: #c2572b; }
  .story p { font-size: 10.5pt; line-height: 1.85; }
</style></head><body>
${toHtml(md)
  // 자기소개서 구간은 이야기 서식으로 감싼다
  .replace(/(<h2 class="sec">2\. 자기소개서<\/h2>)([\s\S]*?)(<h2 class="sec">3\.)/, '$1<div class="story">$2</div>$3')
  .replace(/(<h1>.*?<\/h1>)/, '$1<div class="band"></div>')}
</body></html>`;

mkdirSync(dirname(OUT_HTML), { recursive: true });
writeFileSync(OUT_HTML, html);

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const browser = browsers.find(existsSync);
if (!browser) throw new Error('Edge나 Chrome을 찾지 못했습니다. out/print.html을 브라우저로 열어 PDF로 인쇄하세요.');

mkdirSync(dirname(PDF_SITE), { recursive: true });
execFileSync(browser, [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=8000',
  `--print-to-pdf=${PDF_SITE}`, pathToFileURL(OUT_HTML).href,
], { stdio: 'ignore' });
copyFileSync(PDF_SITE, PDF_LOCAL);
console.log('PDF:', PDF_SITE);
console.log('PDF:', PDF_LOCAL);
