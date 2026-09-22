// BS 신호 점검기 — 화면 연결. 판정 규칙은 logic.js에 있다.
(function () {
  'use strict';
  const B = window.BSCheck;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 예시 값은 만든 값이다. authenticatorData의 RP ID 해시는 "passkey.example"의 SHA-256.
  const AUTH_1D = '-Td_nnE76Hb1-9671tqGcgHGs4jDZp695XBUSp4KOasdAAAABw';
  const EXAMPLES = {
    up: { input: AUTH_1D, be: '1', bs: '0', ever: '0', action: 'irreversible' },
    down: { input: '0x0d', be: '1', bs: '1', ever: '1', action: 'login' },
    device: { input: '0x05', be: '0', bs: '0', ever: '0', action: 'login' },
    invalid: { input: '0x15', be: '0', bs: '0', ever: '0', action: 'login' },
    nostore: { input: AUTH_1D, be: '', bs: '', ever: '', action: 'login' },
  };

  let parsed = null;

  function renderRead() {
    const out = $('read-out');
    const raw = $('input').value;
    if (!raw.trim()) {
      parsed = null;
      out.innerHTML = '<p class="meta">값을 넣으면 여기에 비트가 풀려 나옵니다.</p>';
      return;
    }
    let r;
    try { r = B.parseInput(raw); } catch (e) { r = { ok: false, error: '값을 읽는 중 문제가 생겼습니다. 형식을 확인해 주세요.' }; }
    if (!r.ok) {
      parsed = null;
      out.innerHTML = `<p class="err" role="alert">${esc(r.error)}</p>`;
      return;
    }
    parsed = r;
    const f = B.decodeFlags(r.flags);
    const cells = B.FLAG_BITS.slice().reverse().map((b) => {
      const on = f[b.name];
      const key = b.name === 'BE' || b.name === 'BS';
      return `<div class="bit${on ? ' on' : ''}${key ? ' key' : ''}"><div class="nm">${b.name}</div><div class="v">${on ? 1 : 0}</div><div class="mk">${B.hex2(b.mask)}</div></div>`;
    }).join('');
    const meta = [`${esc(r.source)} · 플래그 <b class="mono">${B.hex2(r.flags)}</b> (2진수 ${r.flags.toString(2).padStart(8, '0')})`];
    if (r.signCount !== null) meta.push(`서명 카운터 ${r.signCount} · 전체 ${r.length}바이트`);
    const be = B.FLAG_BITS.find((b) => b.name === 'BE');
    const bs = B.FLAG_BITS.find((b) => b.name === 'BS');
    out.innerHTML = `
      <p class="meta">${meta.join('<br>')}</p>
      <div class="bits" aria-label="플래그 비트 (왼쪽이 비트 7)">${cells}</div>
      <ul class="bitlabels">
        <li><b>BE=${f.BE ? 1 : 0}</b> ${esc(be.label)}</li>
        <li><b>BS=${f.BS ? 1 : 0}</b> ${esc(bs.label)}</li>
      </ul>
      <p class="hint">이 값만으로는 “방금 바뀌었는지”를 알 수 없습니다. 아래 2단계에서 서버가 보관한 값과 비교합니다.</p>`;
  }

  const sel = (id) => { const v = $(id).value; return v === '' ? null : v === '1'; };

  function renderJudge() {
    const out = $('judge-out');
    if (!parsed) {
      out.innerHTML = '<p class="meta">1단계에 로그인 응답을 넣으면 판정이 나옵니다.</p>';
      return;
    }
    const action = document.querySelector('input[name="action"]:checked').value;
    let r;
    try {
      r = B.evaluate(parsed.flags, { be: sel('st-be'), bs: sel('st-bs'), ever: sel('st-ever') }, action);
    } catch (e) {
      out.innerHTML = '<p class="err" role="alert">판정 중 문제가 생겼습니다. 값을 다시 골라 주세요.</p>';
      return;
    }
    const v = B.VERDICT_TEXT[r.verdict];
    const findings = r.findings.map((x) => `
      <div class="finding ${x.level}"><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><span class="ref">근거: ${esc(x.ref)}</span></div>`).join('');
    const next = r.verdict === 'reject'
      ? `// ${r.next.note}`
      : JSON.stringify({ backup_eligible: r.next.backupEligible, backup_state: r.next.backupState, ever_backed_up: r.next.everBackedUp }, null, 2);
    out.innerHTML = `
      <div class="verdict ${r.verdict}"><span class="badge">${v.label}</span><p>${esc(v.body)}</p></div>
      ${findings}
      <div class="rowhead"><h3>이번 로그인 뒤 저장할 값</h3></div>
      <pre>${esc(next)}</pre>`;
  }

  function fillLibs() {
    const libs = B.LIBRARIES.map((l) => `<option value="lib:${l.id}">${esc(l.name)} (${esc(l.lang)})</option>`).join('');
    const apps = B.APPS.map((a) => `<option value="app:${a.id}">${esc(a.name)}</option>`).join('');
    $('lib').innerHTML = `
      <option value="">고르세요</option>
      <optgroup label="라이브러리 — 논문 표 14">${libs}</optgroup>
      <optgroup label="응용 — 논문 표 16">${apps}</optgroup>
      <optgroup label="그 밖"><option value="lib:other">목록에 없음 / 직접 구현</option></optgroup>`;
  }

  function renderQuestions(preset) {
    $('questions').innerHTML = B.STEPS.map((s, i) => `
      <div class="q"><p><span class="num">${i + 1}</span>${esc(s.q)}</p>
        <div class="radios" role="radiogroup" aria-label="${esc(s.q)}">
          ${[['yes', '예'], ['no', '아니오'], ['unknown', '모름']].map(([v, t]) =>
            `<label><input type="radio" name="${s.id}" value="${v}"${(preset && preset[s.id] === v) || (!preset && v === 'unknown') ? ' checked' : ''}> ${t}</label>`).join('')}
        </div></div>`).join('');
  }

  function renderLibInfo() {
    const v = $('lib').value;
    const info = $('lib-info');
    if (!v) { info.innerHTML = ''; return; }
    const [kind, id] = v.split(':');
    if (kind === 'app') {
      const a = B.APPS.find((x) => x.id === id);
      const lib = B.LIBRARIES.find((x) => x.id === a.lib);
      info.innerHTML = `<p class="note"><b>${esc(a.name)}</b> — 기반 라이브러리 ${esc(lib.name)}. ${esc(a.note)} 아래 답은 논문의 판정으로 채웠습니다.</p>`;
      renderQuestions(a.answers);
      return;
    }
    const lib = B.LIBRARIES.find((x) => x.id === id);
    const cls = (t) => (t === '예' ? 'yes' : t.startsWith('아니오') ? 'no' : '');
    const row = lib
      ? `<table class="m"><thead><tr><th>등록 때 노출</th><th>인증 때 노출</th><th>저장</th><th>보관값과 대조·갱신</th></tr></thead>
         <tbody><tr>${lib.m.map((t) => `<td class="${cls(t)}">${esc(t)}</td>`).join('')}</tr></tbody></table>`
      : '';
    info.innerHTML = `${row}<p class="note">${esc(B.LIB_NOTES[id] || B.LIB_NOTES.other)}</p>`;
  }

  function renderAudit() {
    const out = $('audit-out');
    const answers = {};
    for (const s of B.STEPS) {
      const c = document.querySelector(`input[name="${s.id}"]:checked`);
      answers[s.id] = c ? c.value : null;
    }
    const r = B.audit(answers);
    const n = (id) => B.STEPS.findIndex((s) => s.id === id) + 1;
    let head;
    if (r.status === 'ok') head = '<div class="verdict pass"><span class="badge">세 단계 모두 있음</span><p>BE/BS 신호가 응용까지 이어집니다. 2단계의 판정 규칙을 정책에 붙이면 됩니다.</p></div>';
    else if (r.status === 'gap') head = `<div class="verdict reject"><span class="badge">${r.missing.map(n).join('·')}단계 빠짐</span><p>신호는 ${n(r.firstGap)}단계에서 끊깁니다. 이 상태에서는 전이가 일어나도 서버에 아무 변화가 없습니다(논문 실험 A: 10/10).</p></div>`;
    else head = `<div class="verdict stepup"><span class="badge">확인 필요</span><p>${r.unknown.map(n).join('·')}단계를 모릅니다. 저장소 스키마와 로그인 검증 코드에서 BE·BS(backupEligible·backupState)를 찾아보세요.</p></div>`;
    out.innerHTML = `<div class="audit-result">${head}
      ${r.status === 'ok' ? '' : `
      <div class="rowhead"><h3>1. 저장 모델에 컬럼 추가</h3><button type="button" data-copy="sql">복사</button></div><pre id="fix-sql">${esc(B.FIX_SQL)}</pre>
      <div class="rowhead"><h3>2·3. 로그인 때 대조하고 갱신</h3><button type="button" data-copy="js">복사</button></div><pre id="fix-js">${esc(B.FIX_JS)}</pre>
      <p class="hint">논문 5.2절: 추가 왕복도 사용자 상호작용도 필요 없고, 컬럼 세 개와 코드 몇 줄이면 닫힙니다.</p>`}
    </div>`;
  }

  function applyExample(key) {
    const ex = EXAMPLES[key];
    if (!ex) return;
    $('input').value = ex.input;
    $('st-be').value = ex.be;
    $('st-bs').value = ex.bs;
    $('st-ever').value = ex.ever;
    document.querySelector(`input[name="action"][value="${ex.action}"]`).checked = true;
    renderRead();
    renderJudge();
  }

  document.addEventListener('DOMContentLoaded', () => {
    fillLibs();
    renderQuestions(null);
    // 처음 온 사람이 바로 결과를 보도록 첫 예시를 채워 둔다
    applyExample('up');
    renderAudit();

    $('input').addEventListener('input', () => { renderRead(); renderJudge(); });
    ['st-be', 'st-bs', 'st-ever'].forEach((id) => $(id).addEventListener('change', renderJudge));
    document.querySelectorAll('input[name="action"]').forEach((el) => el.addEventListener('change', renderJudge));
    $('examples').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-ex]');
      if (b) applyExample(b.dataset.ex);
    });
    $('lib').addEventListener('change', () => { renderLibInfo(); renderAudit(); });
    $('questions').addEventListener('change', renderAudit);
    $('audit-out').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-copy]');
      if (!b) return;
      const text = b.dataset.copy === 'sql' ? B.FIX_SQL : B.FIX_JS;
      try { await navigator.clipboard.writeText(text); b.textContent = '복사됨'; }
      catch (err) { b.textContent = '직접 선택해 복사하세요'; }
      setTimeout(() => { b.textContent = '복사'; }, 1600);
    });
  });
})();
