// BS 신호 점검기 — 판정 로직
// 규칙은 모두 10번 논문 「동기화 패스키의 백업 상태 전이는 서비스에 관측되는가」에서 가져왔다.
//   · 플래그 비트 배치 ............ 논문 표 2 (WebAuthn L3)
//   · be:0, bs:1 무조건 거부 ....... 논문 2.3절 — 규격 §7.2 단계 18
//   · 보관한 BE와 현재 BE 대조 ..... 논문 2.3절 — 규격 §7.2 단계 19
//   · 전이는 차단이 아니라 적응 .... 논문 5.2절 — 되돌릴 수 없는 동작에만 한 단계 더
//   · 1→0은 한 번도 백업 안 된 것과 같은 바이트 → ever_backed_up 유지 ... 논문 5.2절·6장
//   · 라이브러리를 쓰는 쪽의 3단계 점검 ... 논문 6장 실무적 함의 첫째
//   · 라이브러리 11개·응용 3개 판정 ...... 논문 표 14·표 16 (2026-09-11 소스 열람)
// 브라우저에서는 window.BSCheck, Node에서는 require('./logic.js')로 쓴다.
(function (root) {
  'use strict';

  const FLAG_BITS = [
    { bit: 0, mask: 0x01, name: 'UP', label: '사용자가 직접 조작했다' },
    { bit: 1, mask: 0x02, name: 'RFU1', label: '예약 비트' },
    { bit: 2, mask: 0x04, name: 'UV', label: '생체인식·PIN으로 확인했다' },
    { bit: 3, mask: 0x08, name: 'BE', label: '백업·동기화될 수 있는 종류다 (등록 뒤 바뀌지 않음)' },
    { bit: 4, mask: 0x10, name: 'BS', label: '지금 백업된 상태다 (매 로그인마다 바뀔 수 있음)' },
    { bit: 5, mask: 0x20, name: 'RFU2', label: '예약 비트' },
    { bit: 6, mask: 0x40, name: 'AT', label: '자격증명 데이터가 붙어 있다 (등록 응답)' },
    { bit: 7, mask: 0x80, name: 'ED', label: '확장 데이터가 붙어 있다' },
  ];

  // ── 입력 해석 ──────────────────────────────────────────────
  function bytesFromHex(s) {
    const out = [];
    for (let i = 0; i < s.length; i += 2) out.push(parseInt(s.slice(i, i + 2), 16));
    return out;
  }

  function bytesFromBase64url(s) {
    let b = s.replace(/-/g, '+').replace(/_/g, '/');
    if (b.length % 4 === 1) return null;
    while (b.length % 4) b += '=';
    let bin;
    try {
      bin = typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString('binary');
    } catch (e) {
      return null;
    }
    const out = [];
    for (let i = 0; i < bin.length; i++) out.push(bin.charCodeAt(i) & 0xff);
    return out;
  }

  // 받는 것: 플래그 한 바이트("0x1d", "1d", "29", "0b00011101") 또는
  //          authenticatorData 전체(hex 74자 이상 / base64url)
  function parseInput(raw) {
    if (raw === null || raw === undefined) return { ok: false, error: '값을 넣어 주세요.' };
    const s = String(raw).trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
    if (!s) return { ok: false, error: '값을 넣어 주세요.' };
    if (s.length > 20000) return { ok: false, error: '너무 깁니다. authenticatorData 하나만 넣어 주세요.' };

    let m;
    if ((m = s.match(/^0x([0-9a-f]{1,2})$/i))) return flagOnly(parseInt(m[1], 16), '플래그 바이트(16진수)');
    if ((m = s.match(/^0b([01]{1,8})$/i))) return flagOnly(parseInt(m[1], 2), '플래그 바이트(2진수)');
    if (/^[0-9a-f]{2}$/i.test(s) && /[a-f]/i.test(s)) return flagOnly(parseInt(s, 16), '플래그 바이트(16진수)');
    if (/^\d{1,3}$/.test(s)) {
      const n = Number(s);
      if (n > 255) return { ok: false, error: `플래그는 한 바이트(0~255)입니다. 넣은 값 ${n}은(는) 범위를 넘습니다.` };
      return flagOnly(n, '플래그 바이트(10진수)');
    }

    let bytes = null, source = '';
    const hex = s.replace(/^0x/i, '');
    if (/^[0-9a-f]+$/i.test(hex) && hex.length % 2 === 0 && hex.length >= 74) {
      bytes = bytesFromHex(hex);
      source = 'authenticatorData(16진수)';
    } else if (/^[A-Za-z0-9_\-+/]+=*$/.test(s)) {
      bytes = bytesFromBase64url(s);
      source = 'authenticatorData(base64url)';
      if (!bytes) return { ok: false, error: 'base64url로 풀 수 없는 값입니다. 복사할 때 글자가 빠지지 않았는지 확인해 주세요.' };
    } else {
      return { ok: false, error: '알아볼 수 없는 형식입니다. 플래그 바이트(예: 0x1d)나 authenticatorData(base64url 또는 16진수)를 넣어 주세요.' };
    }
    if (bytes.length < 37) {
      return { ok: false, error: `authenticatorData는 최소 37바이트(RP ID 해시 32 + 플래그 1 + 서명 카운터 4)입니다. 넣은 값은 ${bytes.length}바이트입니다.` };
    }
    const flags = bytes[32];
    const signCount = ((bytes[33] << 24) >>> 0) + (bytes[34] << 16) + (bytes[35] << 8) + bytes[36];
    const rpIdHash = bytes.slice(0, 32).map((b) => b.toString(16).padStart(2, '0')).join('');
    return { ok: true, flags, signCount, rpIdHash, length: bytes.length, source };
  }

  function flagOnly(n, source) {
    return { ok: true, flags: n, signCount: null, rpIdHash: null, length: null, source };
  }

  function decodeFlags(byte) {
    const f = {};
    for (const b of FLAG_BITS) f[b.name] = (byte & b.mask) !== 0;
    return f;
  }

  const hex2 = (n) => '0x' + n.toString(16).padStart(2, '0');

  // ── 판정 ────────────────────────────────────────────────
  // stored: { be: true|false|null, bs: true|false|null, ever: true|false|null }  (null = 보관하지 않음·모름)
  // action: 'login' | 'irreversible'
  function evaluate(flagsByte, stored, action) {
    const cur = decodeFlags(flagsByte);
    const st = Object.assign({ be: null, bs: null, ever: null }, stored || {});
    const findings = [];
    let verdict = 'pass';
    const raise = (v) => {
      const order = { pass: 0, stepup: 1, reject: 2 };
      if (order[v] > order[verdict]) verdict = v;
    };

    // 규격 §7.2 단계 18 — 조건 없이 모든 RP
    if (!cur.BE && cur.BS) {
      findings.push({
        level: 'bad',
        title: 'be:0, bs:1 — 규격상 있을 수 없는 조합',
        body: '백업될 수 없는 자격증명이 "백업됐다"고 신고했습니다. 규격 §7.2 단계 18은 이 조합을 조건 없이 거부하라고 요구합니다.',
        ref: 'WebAuthn §7.2 · 단계 18',
      });
      raise('reject');
    }

    // 규격 §7.2 단계 19 — 보관한 BE와 대조
    if (st.be === null) {
      findings.push({
        level: 'warn',
        title: '보관한 BE가 없어 대조할 수 없습니다',
        body: '규격 §7.2 단계 19는 등록 때 저장한 BE와 지금의 BE를 대조합니다. 저장하지 않았다면 이 단계를 할 수 없습니다. 실측한 배포 사례에서도 이 상태였고, 전이를 줘도 10/10 모두 서버에 아무 변화가 없었습니다.',
        ref: 'WebAuthn §7.2 · 단계 19 (권장)',
      });
    } else if (st.be !== cur.BE) {
      findings.push({
        level: 'bad',
        title: `BE가 바뀌었습니다 (보관 ${st.be ? 1 : 0} → 지금 ${cur.BE ? 1 : 0})`,
        body: 'BE는 자격증명이 만들어질 때 정해지고 바뀌지 않는 값입니다. 달라졌다면 같은 자격증명이라고 보기 어렵습니다. 규격 §7.2 단계 19에 따라 거부합니다.',
        ref: 'WebAuthn §7.2 · 단계 19',
      });
      raise('reject');
    }

    // BS 전이 — 논문 5.2절
    let transition = 'unknown';
    if (st.bs === null) {
      findings.push({
        level: 'warn',
        title: '보관한 BS가 없어 전이를 알 수 없습니다',
        body: `지금 BS=${cur.BS ? 1 : 0}이라는 것만 보입니다. 이전 값을 저장해 두지 않으면 "방금 클라우드로 들어갔다"와 "원래 그랬다"를 구분할 수 없습니다.`,
        ref: 'WebAuthn §4 · Credential Record',
      });
    } else if (!st.bs && cur.BS) {
      transition = 'up';
      findings.push({
        level: 'info',
        title: 'BS 0 → 1: 이 자격증명이 방금 클라우드 백업 범위에 들어왔습니다',
        body: '사용자가 동기화를 켠 흔한 정상 동작입니다. 로그인은 막지 않습니다. 다만 이제 이 키는 다른 기기로 옮겨질 수 있으므로, 되돌릴 수 없는 동작(자격증명 삭제, 결제 수단 변경, 민감 자료 내려받기)에는 한 단계 더 확인합니다.',
        ref: '적응형 인증 정책',
      });
      if (action === 'irreversible') raise('stepup');
    } else if (st.bs && !cur.BS) {
      transition = 'down';
      findings.push({
        level: 'info',
        title: 'BS 1 → 0: 동기화가 꺼졌습니다',
        body: `지금 받은 ${hex2(flagsByte)}는 한 번도 백업된 적 없는 자격증명이 보내는 바이트와 같습니다. 그동안 만들어졌을 사본은 동기화를 끈다고 회수되지 않으므로 "한 번이라도 백업된 적 있음(ever_backed_up)"은 내리지 말고 유지합니다.`,
        ref: 'Credential Record 이력 보관',
      });
    } else {
      transition = 'same';
      findings.push({
        level: 'ok',
        title: `BS 변화 없음 (${cur.BS ? 1 : 0} → ${cur.BS ? 1 : 0})`,
        body: '백업 상태가 지난번과 같습니다. 서명 카운터와 함께 BS도 갱신해 저장하면 됩니다.',
        ref: 'WebAuthn §4 · Credential Record',
      });
    }

    if (!cur.UP) {
      findings.push({
        level: 'warn',
        title: 'UP(사용자 조작)가 꺼져 있습니다',
        body: '사용자가 인증장치를 직접 조작하지 않은 응답입니다. 대부분의 RP는 로그인에서 UP를 요구합니다. (이 앱의 판정은 BE/BS를 중심으로 합니다.)',
        ref: 'WebAuthn §6.1 authenticatorData',
      });
    }

    const everKnown = st.ever !== null || st.bs !== null;
    const next = {
      backupEligible: st.be === null ? cur.BE : st.be,
      backupState: cur.BS,
      everBackedUp: everKnown ? Boolean(st.ever) || Boolean(st.bs) || cur.BS : cur.BS,
    };
    if (verdict === 'reject') next.note = '거부했으므로 저장값을 바꾸지 않습니다.';

    return { flags: cur, flagsHex: hex2(flagsByte), stored: st, action, transition, verdict, findings, next };
  }

  const VERDICT_TEXT = {
    pass: { label: '통과', body: '평소대로 진행합니다.' },
    stepup: { label: '한 단계 더 확인', body: '로그인은 막지 않고, 이 동작에만 재인증을 한 번 더 요구합니다.' },
    reject: { label: '거부', body: '규격의 필수 검증에 걸립니다. 이 응답을 받아들이지 않습니다.' },
  };

  // ── 3단계 점검 — 논문 6장 ────────────────────────────────
  const STEPS = [
    { id: 's1', q: '등록할 때 BE·BS 값을 저장 모델(DB 컬럼)에 담나요?' },
    { id: 's2', q: '로그인할 때 보관한 BE·BS를 라이브러리의 검증 함수에 다시 넘기나요?' },
    { id: 's3', q: '로그인이 끝나면 라이브러리가 돌려준 새 BS를 받아 저장하나요?' },
  ];

  // 논문 표 14 — M1 노출(등록) · M2 노출(인증) · M3 저장 · M4 대조·갱신
  const LIBRARIES = [
    { id: 'simplewebauthn', name: 'SimpleWebAuthn', lang: 'TypeScript', m: ['예', '예', '예제 아니오', '아니오'] },
    { id: 'py_webauthn', name: 'py_webauthn', lang: 'Python', m: ['예', '예', '예제 아니오', '아니오'] },
    { id: 'go-webauthn', name: 'go-webauthn', lang: 'Go', m: ['예', '예', '유도됨', '예'] },
    { id: 'yubico', name: 'Yubico java-webauthn-server', lang: 'Java', m: ['예', '예', '예', '예'] },
    { id: 'webauthn-rs', name: 'webauthn-rs', lang: 'Rust', m: ['예', '예', '예', '예'] },
    { id: 'webauthn4j', name: 'webauthn4j', lang: 'Java', m: ['예', '예', '예', '예'] },
    { id: 'fido2-net-lib', name: 'fido2-net-lib', lang: '.NET', m: ['예', '예', '예', '아니오(구조적 불가)'] },
    { id: 'webauthn-ruby', name: 'webauthn-ruby', lang: 'Ruby', m: ['예', '예', '해당 없음', '아니오'] },
    { id: 'lbuchs', name: 'lbuchs/WebAuthn', lang: 'PHP', m: ['예', '예', '해당 없음', '아니오'] },
    { id: 'web-auth', name: 'web-auth/webauthn-framework', lang: 'PHP', m: ['편의 메서드 없음', '편의 메서드 없음', '아니오', '아니오'] },
    { id: 'fido2-lib', name: 'fido2-lib', lang: 'Node', m: ['아니오', '아니오', '아니오', '아니오'] },
  ];

  const LIB_NOTES = {
    simplewebauthn: '인증 결과의 authenticationInfo.credentialBackedUp에 BS가 들어 있지만, 보관값과 대조하는 일은 응용이 해야 합니다. 실측한 배포 사례가 이 라이브러리의 공식 예제를 따르다 BS를 놓쳤습니다.',
    py_webauthn: '검증 결과에 BE/BS가 노출되지만 대조·갱신은 응용이 직접 해야 합니다.',
    'go-webauthn': '보관값과의 대조·갱신을 구현했습니다. 응용이 갱신된 Credential을 다시 저장하는지만 확인하면 됩니다.',
    yubico: 'RegisteredCredential에 backupEligible·backupState 필드가 있고, FinishAssertionSteps가 현재 BE를 보관값과 대조합니다. 응용이 이 필드를 채워 넘기는지 확인하세요.',
    'webauthn-rs': 'update_credential()이 매 인증마다 BS를 갱신합니다. 응용이 그 결과를 저장하는지 확인하세요.',
    webauthn4j: 'BEFlagVerifier가 보관 BE와 현재 BE를 대조합니다. 단, CoreCredentialRecord에 보관값을 채워 넘겨야 작동합니다. 비워 넘기면 조용히 통과합니다(Spring Security·Keycloak 사례).',
    'fido2-net-lib': '정책(Allowed/Required/Disallowed)은 있지만, 인증 검증 함수가 보관된 BE/BS를 받지 않아 대조 단계를 인터페이스 차원에서 할 수 없습니다. 응용이 직접 비교해야 합니다.',
    'webauthn-ruby': 'BE/BS를 노출합니다. 저장과 대조는 응용이 직접 해야 합니다.',
    lbuchs: 'getIsBackupEligible()·getIsBackup()을 제공합니다. 저장과 대조는 응용이 직접 해야 합니다.',
    'web-auth': '편의 메서드가 없어 원시 플래그 바이트에서 0x08·0x10을 직접 읽어야 합니다.',
    'fido2-lib': 'BE·BS 비트를 예약 비트(RFU3·RFU4)로 파싱합니다. 플래그 바이트를 직접 읽어야 합니다.',
    other: '조사 목록에 없는 라이브러리입니다. 아래 세 질문에 직접 답해 보세요.',
  };

  // 논문 표 16 — 응용 층위(소스 열람 판정, 실행 측정 아님)
  const APPS = [
    { id: 'spring', name: 'Spring Security WebAuthn', lib: 'webauthn4j', answers: { s1: 'yes', s2: 'no', s3: 'no' },
      note: '등록 때는 backup_eligible·backup_state 컬럼에 저장하지만, 로그인 때 보관값을 webauthn4j에 넘기지 않아 BEFlagVerifier가 무동작으로 통과하고, 갱신 레코드는 이전 backupState를 그대로 복사합니다.' },
    { id: 'keycloak', name: 'Keycloak', lib: 'webauthn4j', answers: { s1: 'no', s2: 'no', s3: 'no' },
      note: 'WebAuthnCredentialData에 백업 관련 필드가 없고, 인증 경로가 AuthenticatorImpl을 써서 webauthn4j의 대조·갱신 로직을 건너뜁니다.' },
    { id: 'portfolio', name: 'portfolio-passkey (실측 사례)', lib: 'simplewebauthn', answers: { s1: 'no', s2: 'no', s3: 'no' },
      note: '라이브러리는 매 인증마다 값을 돌려주지만 응용이 꺼내지 않고, 스키마에 컬럼도 없었습니다.' },
  ];

  function audit(answers) {
    const a = Object.assign({ s1: null, s2: null, s3: null }, answers || {});
    const missing = STEPS.filter((s) => a[s.id] === 'no').map((s) => s.id);
    const unknown = STEPS.filter((s) => a[s.id] !== 'yes' && a[s.id] !== 'no').map((s) => s.id);
    let firstGap = null;
    for (const s of STEPS) if (a[s.id] !== 'yes') { firstGap = s.id; break; }
    const status = missing.length === 0 && unknown.length === 0 ? 'ok' : missing.length ? 'gap' : 'unknown';
    return { status, missing, unknown, firstGap };
  }

  const FIX_SQL = `-- 등록 때 한 번 저장 (BE는 바뀌지 않음)
alter table credentials add column if not exists backup_eligible boolean;
-- 매 로그인마다 갱신
alter table credentials add column if not exists backup_state boolean;
-- 한 번이라도 백업된 적 있으면 참으로 세우고 내리지 않음
alter table credentials add column if not exists ever_backed_up boolean not null default false;`;

  const FIX_JS = `// SimpleWebAuthn 예시 — 로그인 검증 직후
const { newCounter, credentialBackedUp, credentialDeviceType } = verification.authenticationInfo;
const currentBe = credentialDeviceType === 'multiDevice'; // BE=1

if (stored.backup_eligible !== null && stored.backup_eligible !== currentBe) {
  throw new Error('BE changed — reject (WebAuthn §7.2 step 19)');
}
const justBackedUp = stored.backup_state === false && credentialBackedUp === true;

await db.update(credentials, {
  sign_count: newCounter,
  backup_state: credentialBackedUp,
  ever_backed_up: stored.ever_backed_up || credentialBackedUp,
});

// 막지 말고 적응한다: 되돌릴 수 없는 동작에만 한 단계 더
if (justBackedUp) session.requireStepUpFor = ['delete-credential', 'change-payment', 'export-data'];`;

  // 지금까지의 확인을 텍스트 리포트로 — Step1~3의 상태만으로 계산하는 순수 함수라 Node에서도 그대로 돈다.
  function buildReport({ input, stored, action, pick, answers }) {
    const lines = ['# BS Check 진단 리포트', ''];
    let parsed;
    try { parsed = parseInput(input); } catch (e) { parsed = { ok: false, error: '값을 읽는 중 문제가 생겼습니다.' }; }

    lines.push('## Step 1 · 판독');
    if (parsed.ok) {
      const f = decodeFlags(parsed.flags);
      lines.push(`- ${parsed.source} · 플래그 ${hex2(parsed.flags)}`, `- BE=${f.BE ? 1 : 0} · BS=${f.BS ? 1 : 0}`);
    } else {
      lines.push(`- 값을 읽지 못함: ${parsed.error}`);
    }

    lines.push('', '## Step 2 · 판정');
    const sel = (v) => (v === '' || v === undefined || v === null ? null : v === '1');
    const st = stored || {};
    if (parsed.ok) {
      let result = null;
      try { result = evaluate(parsed.flags, { be: sel(st.be), bs: sel(st.bs), ever: sel(st.ever) }, action); } catch (e) { result = null; }
      if (result) {
        lines.push(`- 보관값: BE=${st.be || '저장 안 함'} · BS=${st.bs || '저장 안 함'} · ever=${st.ever || '저장 안 함'} · 동작: ${action === 'irreversible' ? '되돌릴 수 없는 동작' : '평소 로그인'}`);
        lines.push(`- 판정: **${VERDICT_TEXT[result.verdict].label}**`);
        result.findings.forEach((x) => lines.push(`  - ${x.title} (${x.ref})`));
      } else {
        lines.push('- 판정 중 문제가 생김');
      }
    } else {
      lines.push('- Step 1 값이 없어 판정 없음');
    }

    lines.push('', '## Step 3 · 서버 진단');
    if (pick) {
      const [kind, id] = pick.split(':');
      const name = kind === 'app' ? (APPS.find((a) => a.id === id) || {}).name : (LIBRARIES.find((l) => l.id === id) || {}).name;
      lines.push(`- 스택: ${name || (id === 'other' ? '목록에 없음 / 직접 구현' : pick)}`);
    } else {
      lines.push('- 스택 선택 안 함');
    }
    const r = audit(answers);
    const n = (sid) => STEPS.findIndex((s) => s.id === sid) + 1;
    const label = r.status === 'ok' ? '세 단계 모두 있음' : r.status === 'gap' ? `${r.missing.map(n).join('·')}단계 빠짐` : '확인 필요';
    lines.push(`- 판정: **${label}**`);

    lines.push('', '_https://aleph-bs-check.vercel.app 에서 만든 리포트 — 값은 이 브라우저 안에서만 계산됐습니다._');
    return lines.join('\n');
  }

  const api = { FLAG_BITS, parseInput, decodeFlags, evaluate, VERDICT_TEXT, STEPS, LIBRARIES, LIB_NOTES, APPS, audit, FIX_SQL, FIX_JS, hex2, buildReport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BSCheck = api;
})(typeof window !== 'undefined' ? window : globalThis);
