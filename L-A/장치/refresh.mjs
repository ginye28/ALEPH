#!/usr/bin/env node
// 계속 새로 쓰는 장치 — 리추얼 기록·과제 목록·출석 숫자를 넣으면
// 숫자 칸과 능력별 문단 후보를 다시 만든다. 승인한 후보만 사이트에 들어간다.
//
// 사용: node refresh.mjs            → out/ 에 결과만 만든다
//       node refresh.mjs --apply    → 결과를 ../site/index.html 의 자동 구역에도 넣는다
//
// 같은 입력이면 같은 결과가 나오도록: 시각·난수·AI 호출을 쓰지 않고, 모든 목록을 정렬한다.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IN = join(HERE, 'input');
const OUT = join(HERE, 'out');
const SITE = join(HERE, '..', 'site', 'index.html');
const APPLY = process.argv.includes('--apply');

const sha = (s, n = 64) => createHash('sha256').update(s).digest('hex').slice(0, n);
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- 1. 입력 읽기 ----------
const ritualFile = readdirSync(IN).filter((f) => /^ritual-history.*\.txt$/.test(f)).sort().pop();
if (!ritualFile) throw new Error('input/ 에 ritual-history-*.txt 가 없습니다.');
const ritualText = readFileSync(join(IN, ritualFile), 'utf8').replace(/\r\n/g, '\n');
const tasks = readJson(join(IN, 'tasks.json'), { source: '내 제출 현황', tasks: [] });
const attendance = readJson(join(IN, 'attendance.json'), { source: '내 출석 기록' });
const approved = readJson(join(HERE, 'approved.json'), {});
const maskNames = readJson(join(HERE, 'mask-names.local.json'), []);

function mask(s) {
  let t = s;
  for (const name of [...maskNames].sort((a, b) => b.length - a.length)) {
    if (name) t = t.split(name).join('(이름 가림)');
  }
  return t;
}

// 리추얼 TXT → [{date, morning:{}, closing:{}, repeated:{}}]
function parseRitual(text) {
  const days = [];
  let cur = null;
  let part = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^## (\d{4}-\d{2}-\d{2})/);
    if (h) { cur = { date: h[1], morning: {}, closing: {} }; days.push(cur); part = null; continue; }
    if (!cur) continue;
    if (line.startsWith('[아침]')) { part = 'morning'; continue; }
    if (line.startsWith('[마무리]')) { part = 'closing'; continue; }
    const m = line.match(/^- ([^:]+):\s?(.*)$/);
    if (m && part) {
      const [, key, val] = m;
      const v = val.trim();
      if (cur[part][key] === undefined) cur[part][key] = v;
      else cur[part][key] = [].concat(cur[part][key], v); // 감사일기처럼 여러 줄인 칸
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

const days = parseRitual(ritualText);
if (days.length === 0) throw new Error('리추얼 기록에서 날짜를 하나도 찾지 못했습니다.');

// ---------- 2. 숫자 칸 ----------
const first = days[0].date;
const last = days[days.length - 1].date;
const recorded = new Set(days.map((d) => d.date));

function weekdaysBetween(a, b) {
  const out = [];
  const d = new Date(a + 'T00:00:00Z');
  const end = new Date(b + 'T00:00:00Z');
  while (d <= end) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
// 공휴일은 attendance.json 의 holidays 에 적는다 — 수업일 = 평일 − 공휴일
const holidays = new Set(attendance.holidays || []);
const weekdays = weekdaysBetween(first, last);
const classDays = weekdays.filter((d) => !holidays.has(d));
const missingWeekdays = classDays.filter((d) => !recorded.has(d));

const hasContent = (o) => Object.values(o).some((v) => (Array.isArray(v) ? v.length : String(v).length) > 0);
const morningDays = days.filter((d) => hasContent(d.morning)).length;
const closingDays = days.filter((d) => hasContent(d.closing)).length;

const actions = days
  .map((d) => ({ date: d.date, v: d.closing['강점 행동'] }))
  .filter((x) => typeof x.v === 'string' && x.v);
const done = actions.filter((x) => x.v === '실천했다');
const partial = actions.filter((x) => x.v !== '실천했다');

// 흔들린 날마다: 다음 기록일에 '실천했다'로 돌아왔는가
const wobbles = partial.map((p) => {
  const idx = actions.findIndex((x) => x.date === p.date);
  const next = actions.slice(idx + 1).find((x) => x.v === '실천했다');
  const gap = next ? actions.slice(idx + 1).indexOf(next) + 1 : null;
  return { date: p.date, value: p.v, recoveredOn: next ? next.date : null, recordsToRecover: gap };
});

let longest = 0, run = 0;
for (const a of actions) { run = a.v === '실천했다' ? run + 1 : 0; longest = Math.max(longest, run); }

const peerKeys = (o) => Object.keys(o).filter((k) => /^동료 \d+가 말해 준 내 장점$/.test(k) && o[k]);
const peerNotes = days.reduce((n, d) => n + peerKeys(d.morning).length, 0);

const submitted = tasks.tasks.filter((t) => t.status === '제출').length;
const unknownTasks = tasks.tasks.filter((t) => t.status !== '제출' && t.status !== '예정').length;

const numbers = {
  asOf: last,
  ritual: {
    source: `리추얼 기록 (${ritualFile})`,
    period: `${first} ~ ${last}`,
    weekdaysInPeriod: weekdays.length,
    holidaysInPeriod: weekdays.filter((d) => holidays.has(d)),
    classDays: classDays.length,
    recordedDays: days.length,
    missingWeekdays,
    morningDays,
    closingDays,
    strengthActionRecorded: actions.length,
    strengthActionDone: done.length,
    strengthActionPartial: partial.length,
    wobbles,
    longestDoneStreak: longest,
    peerNotes,
  },
  attendance: {
    source: attendance.source || '내 출석 기록',
    asOf: attendance.asOf ?? null,
    attended: attendance.attended ?? null,
    total: attendance.total ?? null,
    late: attendance.late ?? null,
  },
  submissions: {
    source: tasks.source || '내 제출 현황',
    asOf: tasks.asOf ?? null,
    submitted,
    planned: tasks.tasks.filter((t) => t.status === '예정').length,
    unconfirmed: unknownTasks,
    total: tasks.tasks.length,
  },
};

// ---------- 3. 능력별 문단 후보 ----------
const RULES = {
  // '참여'·'대화를'처럼 겉모양만 같은 낱말에 걸리지 않도록 앞뒤를 좁힌다
  자기조절력: [/참(았|고|아|을)/, /(?<!대)화(가|를)/, /인내/, /싸우/, /동요/, /차분/, /침착/, /부정적/, /긍정적/, /그릇/, /온화/, /마무리 ?(하고|를 지)/],
  대인관계력: [/교류/, /대화/, /친화/, /분위기/, /인사/, /웃고/, /친하/, /경청/, /의사소통/, /거절하지/, /말을 걸/],
  자기동기력: [/성실/, /지각/, /꾸준/, /운동/, /클라이밍/, /스터디/, /공부/, /하고 싶은/, /노력의 결실/, /정돈된/],
};
const FIELDS = [
  ['morning', '강점이 드러난 일화'],
  ['morning', '그 결과·알게 된 점'],
  ['closing', '강점을 위해 노력하고 생각한 것'],
  ['closing', '나에게 남기는 말'],
  ['morning', '동료가 말해 준 내 장점'], // 동료 1~n 칸을 한 이름으로 묶는다
];

const candidates = [];
for (const d of days) {
  for (const [part, field] of FIELDS) {
    const keys = field === '동료가 말해 준 내 장점' ? peerKeys(d[part]).sort() : [field];
    for (const k of keys) {
      const raw = d[part][k];
      if (typeof raw !== 'string' || !raw) continue;
      const text = mask(raw.replace(/^\(이름 가림\)\s*:\s*/, '')).trim();
      if (text.length < 12) continue;
      for (const [ability, words] of Object.entries(RULES)) {
        const hits = words.filter((w) => w.test(text)).map((w) => w.source);
        if (hits.length === 0) continue;
        const id = sha(`${d.date}|${k}|${text}`, 8);
        candidates.push({
          id, ability, date: d.date,
          basis: field === '동료가 말해 준 내 장점' ? '동료가 말해 준 내 장점' : `${part === 'morning' ? '아침' : '마무리'} · ${field}`,
          text, matched: hits,
        });
      }
    }
  }
}
const ORDER = Object.keys(RULES);
candidates.sort((a, b) => ORDER.indexOf(a.ability) - ORDER.indexOf(b.ability) || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

// 승인 목록 대조
const approvedOut = {};
const approvalWarnings = [];
for (const ability of ORDER) {
  const ids = approved[ability] || [];
  approvedOut[ability] = ids.map((id) => {
    const c = candidates.find((x) => x.id === id && x.ability === ability);
    if (!c) approvalWarnings.push(`${ability}: 승인 목록의 ${id} 가 이번 후보에 없습니다(기록이 바뀌었는지 확인).`);
    return c;
  }).filter(Boolean);
}

// ---------- 4. 사이트 구역 HTML ----------
const nz = (v) => (v === null || v === undefined ? '<span class="todo">옮겨 적기 전</span>' : esc(v));
const w0 = wobbles[0];
const att = numbers.attendance;
const hol = numbers.ritual.holidaysInPeriod;
const NOTE = `<!-- 이 구역은 장치/refresh.mjs --apply 가 다시 씁니다. 손으로 고치지 마세요. 기준일 ${esc(last)} -->`;

// 첫 화면 띠 — 인사 담당자가 스크롤 없이 보는 숫자
const heroBlock = `${NOTE}
<li><b>${nz(att.attended)}${att.total ? `<small>/${esc(att.total)}</small>` : ''}</b><span>출석한 날${att.late === 0 ? ' · 지각 0' : ''}</span></li>
<li><b>${actions.length}<small>번</small></b><span>스스로 점검한 저녁 · 실천 ${done.length} · 일부 실천 ${partial.length}</span></li>`;

const siteBlock = `${NOTE}
<div class="stats">
  <div class="stat">
    <p class="stat-num">${nz(att.attended)}${att.total ? `<small>/${esc(att.total)}일</small>` : ''}</p>
    <p class="stat-label">출석한 날${att.late !== null ? ` · 지각 ${esc(att.late)}번` : ''}</p>
    <p class="stat-src">출처: 내 출석 기록${att.asOf ? ` · ${esc(att.asOf)} 기준` : ''}</p>
  </div>
  <div class="stat">
    <p class="stat-num">${numbers.ritual.recordedDays}<small>/${numbers.ritual.classDays}일</small></p>
    <p class="stat-label">수업일마다 아침·저녁으로 나를 점검한 기록</p>
    <p class="stat-src">출처: 리추얼 기록 · ${esc(numbers.ritual.period)}${hol.length ? ` · 공휴일 ${hol.map(esc).join(', ')} 제외` : ''}${missingWeekdays.length ? ` · 빠진 날 ${missingWeekdays.map(esc).join(', ')}` : ''}</p>
  </div>
  <div class="stat pair">
    <p class="stat-num">${done.length}<small>/${actions.length}번</small></p>
    <p class="stat-label">저녁 점검에서 “실천했다”고 적은 날${w0 ? ` — 남은 ${partial.length}번은 <a href="#d-${esc(w0.date.slice(5).replace('-', ''))}">${esc(w0.date)}</a>의 “${esc(w0.value)}”, ${w0.recoveredOn ? `다음 기록일 ${esc(w0.recoveredOn)}에 다시 “실천했다”` : '아직 복귀 기록 없음'}` : ''}</p>
    <p class="stat-src">출처: 리추얼 기록 · 마무리 「강점 행동」 칸 · 가장 긴 연속 ${longest}번</p>
  </div>
  <div class="stat">
    <p class="stat-num">${submitted ? `${submitted}<small>/${tasks.tasks.length}개</small>` : nz(null)}</p>
    <p class="stat-label">낸 과제${numbers.submissions.unconfirmed ? ` · 확인 전 ${numbers.submissions.unconfirmed}개` : ''}</p>
    <p class="stat-src">출처: 내 제출 현황${numbers.submissions.asOf ? ` · ${esc(numbers.submissions.asOf)} 기준` : ''}</p>
  </div>
</div>
${ORDER.map((ab) => approvedOut[ab].length ? `<h3 class="ab">${esc(ab)} — 기록에서 고른 문장</h3>
<ul class="quotes">
${approvedOut[ab].map((c) => `  <li><time>${esc(c.date)}</time> “${esc(c.text)}” <span class="stat-src">${esc(c.basis)}</span></li>`).join('\n')}
</ul>` : '').filter(Boolean).join('\n')}`;

// ---------- 5. 쓰기 ----------
mkdirSync(OUT, { recursive: true });
const files = {
  'numbers.json': JSON.stringify(numbers, null, 2) + '\n',
  'candidates.json': JSON.stringify(candidates, null, 2) + '\n',
  'candidates.md': [
    `# 능력별 문단 후보 — 기준일 ${last}`,
    '',
    '마음에 드는 후보의 `id`를 `approved.json`의 해당 능력 칸에 넣고 다시 돌리면 사이트에 들어갑니다.',
    '후보는 규칙(낱말 목록)으로만 뽑았습니다. 같은 문장이 두 능력에 동시에 걸릴 수 있습니다.',
    '',
    ...ORDER.flatMap((ab) => {
      const list = candidates.filter((c) => c.ability === ab);
      return [`## ${ab} (${list.length})`, '', ...list.map((c) => `- [${(approved[ab] || []).includes(c.id) ? 'x' : ' '}] \`${c.id}\` ${c.date} · ${c.basis} — “${c.text}”`), ''];
    }),
    ...(approvalWarnings.length ? ['## 경고', '', ...approvalWarnings.map((w) => `- ${w}`), ''] : []),
  ].join('\n'),
  'site-block.html': siteBlock + '\n',
  'hero-block.html': heroBlock + '\n',
};
for (const [name, body] of Object.entries(files)) writeFileSync(join(OUT, name), body);
const sums = Object.keys(files).sort().map((n) => `${sha(files[n])}  ${n}`).join('\n') + '\n';
writeFileSync(join(OUT, 'SHA256SUMS'), sums);

if (APPLY && !existsSync(SITE)) {
  console.log('안내: ../site/index.html 이 없어 사이트 반영은 건너뜁니다(out/ 결과는 만들었습니다).');
} else if (APPLY) {
  let html = readFileSync(SITE, 'utf8');
  for (const [tag, block] of [['AUTO', siteBlock], ['AUTO-HERO', heroBlock]]) {
    const re = new RegExp(`(<!-- ${tag}:START -->)[\\s\\S]*?(<!-- ${tag}:END -->)`);
    if (!re.test(html)) throw new Error(`site/index.html 에 ${tag}:START / ${tag}:END 표시가 없습니다.`);
    html = html.replace(re, (_, a, b) => `${a}\n${block}\n${b}`);
  }
  writeFileSync(SITE, html);
}

console.log(`기준일 ${last} · 기록 ${days.length}일 · 후보 ${candidates.length}개 · 승인 ${Object.values(approvedOut).flat().length}개${APPLY && existsSync(SITE) ? ' · 사이트 반영함' : ''}`);
for (const w of approvalWarnings) console.log('경고:', w);
process.stdout.write(sums);
