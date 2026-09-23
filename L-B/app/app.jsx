const { useState, useEffect, useRef, useMemo } = React;
const B = window.BSCheck;

const PAPER_URL = 'https://github.com/ginye28/ALEPH/blob/main/10/%EB%85%BC%EB%AC%B8.md';

// 예시 값은 만든 값이다. authenticatorData의 RP ID 해시는 "passkey.example"의 SHA-256.
const AUTH_1D = '-Td_nnE76Hb1-9671tqGcgHGs4jDZp695XBUSp4KOasdAAAABw';
const EXAMPLES = [
  { key: 'up', label: '동기화 시작됨', input: AUTH_1D, be: '1', bs: '0', ever: '0', action: 'irreversible' },
  { key: 'down', label: '동기화 해제됨', input: '0x0d', be: '1', bs: '1', ever: '1', action: 'login' },
  { key: 'device', label: '기기 전용 키', input: '0x05', be: '0', bs: '0', ever: '0', action: 'login' },
  { key: 'invalid', label: '규격 위반 응답', input: '0x15', be: '0', bs: '0', ever: '0', action: 'login' },
  { key: 'nostore', label: '보관 이력 없음', input: AUTH_1D, be: '', bs: '', ever: '', action: 'login' },
];

// ── 아이콘 (얇은 선) ─────────────────────────────────────
const PATHS = {
  check: <><circle cx="12" cy="12" r="9" /><path d="M7.8 12.4l2.8 2.8 5.6-5.6" /></>,
  alert: <><path d="M12 3.6l9 15.8H3z" /><path d="M12 9.8v4.2M12 16.8v.1" /></>,
  x: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.2M12 7.8v.1" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></>,
  arrow: <path d="M9 6l6 6-6 6" />,
  key: <><circle cx="7.5" cy="7.5" r="4" /><path d="M10.3 10.3L20.5 20.5M15 15l3-3M17.3 17.3l2.2-2.2" /></>,
};
function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
const LEVEL_ICON = { ok: 'check', warn: 'alert', bad: 'x', info: 'info' };
const VERDICT_ICON = { pass: 'check', stepup: 'alert', reject: 'x' };

// ── 스크롤 페이드인: 텍스트만, 10px·1초 ─────────────────
function Fade({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    // 안전망: 옵저버가 백그라운드 탭 등에서 늦게 뜨거나 안 떠도, 내용이 계속 숨어 있지는 않게 한다
    const timer = setTimeout(() => setShown(true), 1200);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);
  return <Tag ref={ref} className={`fade ${shown ? 'in' : ''} ${className}`} {...rest}>{children}</Tag>;
}

// ── 공통 조각 ────────────────────────────────────────────
function Section({ id, tone = 'white', eyebrow, title, lead, children }) {
  return (
    <section id={id} aria-labelledby={`h-${id}`} className={`${tone === 'mist' ? 'bg-mist' : 'bg-white'} scroll-mt-12`}>
      <div className="mx-auto max-w-[980px] px-6 py-32 sm:py-48">
        <Fade as="p" className="text-[14px] font-semibold text-sub">{eyebrow}</Fade>
        <Fade as="h2" id={`h-${id}`} className="mt-3 text-[40px] sm:text-[56px] font-extralight leading-[1.08] tracking-[-0.025em]">{title}</Fade>
        <Fade as="p" className="mt-6 max-w-[600px] text-[17px] sm:text-[19px] font-light leading-[1.6] text-sub">{lead}</Fade>
        <div className="mt-16 sm:mt-24">{children}</div>
      </div>
    </section>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`min-h-[40px] rounded-full px-5 text-[14px] transition-colors ${active ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-hair/60'}`}>
      {children}
    </button>
  );
}

function Segmented({ name, value, options, onChange, tone = 'white' }) {
  return (
    <div role="radiogroup" aria-label={name} className={`inline-flex flex-wrap gap-1 rounded-full p-1 ${tone === 'white' ? 'bg-white' : 'bg-mist'}`}>
      {options.map(([v, t]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`min-h-[36px] rounded-full px-4 text-[14px] transition-colors ${value === v ? 'bg-ink text-white' : 'text-sub hover:text-ink'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [state, setState] = useState('idle');
  const onClick = async () => {
    let ok = true;
    try { await navigator.clipboard.writeText(text); } catch (e) { ok = false; }
    setState(ok ? 'done' : 'blocked');
    setTimeout(() => setState('idle'), 1800);
  };
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-[36px] items-center gap-1.5 text-[13px] text-sub hover:text-ink">
      <Icon name={state === 'blocked' ? 'x' : state === 'done' ? 'check' : 'copy'} className="w-4 h-4" />
      {state === 'done' ? '복사됨' : state === 'blocked' ? '복사 막힘 — 직접 선택하세요' : '복사'}
    </button>
  );
}

function Code({ title, text, tone = 'mist' }) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-[15px] font-medium">{title}</h4>
        <CopyButton text={text} />
      </div>
      <pre className={`mt-3 overflow-x-auto rounded-2xl px-6 py-5 font-mono text-[13px] leading-[1.7] text-ink ${tone === 'mist' ? 'bg-mist' : 'bg-white'}`}>{text}</pre>
    </div>
  );
}

function Verdict({ kind, label, body, tone = 'white' }) {
  return (
    <div className={`rounded-3xl px-8 py-12 sm:px-14 sm:py-16 ${tone === 'white' ? 'bg-white' : 'bg-mist'}`} aria-live="polite">
      <p className="text-[13px] font-semibold text-sub">판정</p>
      <div className="mt-4 flex items-center gap-4">
        <Icon name={VERDICT_ICON[kind]} className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 ${kind === 'pass' ? 'text-sub' : 'text-ink'}`} />
        <p className={`text-[36px] sm:text-[52px] leading-none tracking-[-0.025em] ${kind === 'reject' ? 'font-normal' : 'font-extralight'}`}>{label}</p>
      </div>
      <p className="mt-6 max-w-[560px] text-[17px] font-light leading-[1.6] text-sub">{body}</p>
    </div>
  );
}

// ── 머리 ────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[980px] items-center justify-between px-6 text-[12px]">
        <a href="#top" className="font-semibold tracking-tight text-ink">BS Check</a>
        <div className="flex gap-7 text-sub">
          <a href="#read" className="hover:text-ink">판독</a>
          <a href="#policy" className="hover:text-ink">판정</a>
          <a href="#audit" className="hover:text-ink">서버 진단</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header id="top" className="bg-white">
      <div className="mx-auto max-w-[1080px] px-6 pb-24 pt-20 text-center sm:pb-32 sm:pt-28">
        <Fade as="p" className="text-[14px] font-semibold text-sub">WebAuthn · 패스키</Fade>
        <Fade as="p" className="mx-auto mt-4 max-w-[520px] text-[13px] leading-[1.6] text-sub">
          기반 연구 · <a href={PAPER_URL} target="_blank" rel="noopener" className="text-ink underline-offset-4 hover:underline">「동기화 패스키의 백업 상태 전이는 서비스에 관측되는가」</a> 진혜정, 2026
        </Fade>
        <Fade as="h1" className="mt-6 text-[36px] font-extralight leading-[1.1] tracking-[-0.03em] sm:text-[52px] lg:text-[62px]">
          로그인 응답 하나로<br />백업 상태 전이를 판정합니다.
        </Fade>
        <Fade as="p" className="mx-auto mt-6 max-w-[640px] text-[17px] font-light leading-[1.6] text-sub sm:text-[19px]">
          이 앱은 패스키 로그인을 만드는 개발자를 돕습니다. 로그인 응답을 넣으면 백업 상태(BE·BS) 전이를 판정하고, 서버에 빠진 저장·대조 단계를 알려 줍니다.
        </Fade>
        <Fade className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <a href="#read" className="inline-flex min-h-[44px] items-center rounded-full bg-ink px-7 text-[15px] font-medium text-white hover:bg-black">시작하기</a>
          <a href="#audit" className="inline-flex min-h-[44px] items-center gap-0.5 text-[17px] text-ink hover:underline underline-offset-4">내 서버 진단하기 <Icon name="arrow" className="w-4 h-4" /></a>
        </Fade>
        <Fade as="p" className="mx-auto mt-14 max-w-[560px] text-[13px] leading-[1.7] text-sub">
          계산은 전부 이 브라우저 안에서 이뤄집니다. 값을 어디로도 보내지 않습니다.
        </Fade>
      </div>
    </header>
  );
}

function Proof() {
  const items = [
    ['10', '/10', '전이를 줘도 서버 응답·저장 상태는 그대로였습니다.'],
    ['4', '/11', '보관값과 대조·갱신까지 구현한 라이브러리.'],
    ['0', '/3', '끝까지 신호를 지킨 실제 응용.'],
  ];
  return (
    <section className="bg-mist" aria-labelledby="h-proof">
      <div className="mx-auto max-w-[980px] px-6 py-32 sm:py-40">
        <Fade as="h2" id="h-proof" className="text-center text-[14px] font-semibold text-sub">직접 측정하고 조사해서 확인한 문제</Fade>
        <div className="mt-16 grid gap-16 sm:grid-cols-3 sm:gap-10">
          {items.map(([n, d, t]) => (
            <Fade key={t} className="text-center">
              <p className="text-[64px] font-thin leading-none tracking-[-0.04em] sm:text-[80px]">{n}<span className="text-[0.4em] font-light text-sub">{d}</span></p>
              <p className="mx-auto mt-5 max-w-[240px] text-[15px] font-light leading-[1.6] text-sub">{t}</p>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 진짜 패스키로 확인하기 (WebAuthn) ─────────────────────
// 서버 없이, 이 브라우저·기기가 실제로 만들어 내는 authenticatorData를 그대로 읽는다.
// 검증(서명 확인)은 하지 않는다 — 이 앱이 보는 건 그 값의 BE·BS 비트뿐이다.
function randomBytes(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}
function toBase64url(bufferLike) {
  const bytes = new Uint8Array(bufferLike);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function createRealPasskey() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'BS Check 데모' },
      user: { id: randomBytes(16), name: 'bs-check-demo', displayName: 'BS Check 데모' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      attestation: 'none',
      timeout: 60000,
    },
  });
  if (!cred.response.getAuthenticatorData) { const e = new Error('NO_GET_AUTH_DATA'); e.code = 'NO_GET_AUTH_DATA'; throw e; }
  return { rawId: cred.rawId, authDataB64: toBase64url(cred.response.getAuthenticatorData()) };
}
async function assertRealPasskey(rawId) {
  const cred = await navigator.credentials.get({
    publicKey: { challenge: randomBytes(32), allowCredentials: [{ id: rawId, type: 'public-key' }], userVerification: 'preferred', timeout: 60000 },
  });
  return toBase64url(cred.response.authenticatorData);
}
function passkeyErrorText(e) {
  if (e.name === 'NotAllowedError') return '취소했거나 시간이 지났습니다. 버튼을 다시 누르고 뜨는 확인 창(지문·PIN 등)을 완료해 주세요.';
  if (e.name === 'SecurityError') return '이 주소에서는 패스키를 만들 수 없습니다. https://aleph-bs-check.vercel.app 에서 열어 주세요.';
  if (e.code === 'NO_GET_AUTH_DATA') return '이 브라우저는 원시 데이터를 바로 꺼내는 방식을 아직 지원하지 않습니다. 최신 Chrome·Edge·Safari로 해 보세요.';
  return '만들지 못했습니다. 잠시 뒤 다시 시도하거나 예시로 감을 잡아 보세요.';
}

function PasskeyDemo({ onResult }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // null | 'created' | 'asserted'
  const rawIdRef = useRef(null);
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  if (!supported) {
    return (
      <p className="flex items-start gap-3 rounded-2xl bg-mist px-6 py-5 text-[14px] leading-[1.7] text-sub">
        <Icon name="info" className="mt-0.5 w-5 h-5 shrink-0" />이 브라우저·기기는 패스키(WebAuthn)를 지원하지 않는 것 같습니다. 아래 예시로 감을 잡아 보세요.
      </p>
    );
  }

  const run = async (fn, resultKind) => {
    setBusy(true); setError('');
    try {
      const value = await fn();
      onResult(value);
      setDone(resultKind);
    } catch (e) {
      setError(passkeyErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  const handleCreate = () => run(async () => { const r = await createRealPasskey(); rawIdRef.current = r.rawId; return r.authDataB64; }, 'created');
  const handleAssert = () => run(() => assertRealPasskey(rawIdRef.current), 'asserted');

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-hair">
      <div className="flex items-center gap-2"><Icon name="key" className="w-5 h-5 text-ink" /><p className="text-[15px] font-medium">내 브라우저로 직접 확인하기</p></div>
      <p className="mt-2 text-[14px] leading-[1.7] text-sub">
        버튼을 누르면 이 사이트(aleph-bs-check.vercel.app)용 진짜 패스키가 지금 기기에 만들어지고, 기기가 실제로 돌려주는
        authenticatorData를 그대로 아래에 넣어 드립니다. Windows Hello·Touch ID 같은 확인 창이 뜹니다 — 값은 이
        브라우저 밖으로 나가지 않고, 서명을 검증하지도 않습니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleCreate} disabled={busy}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white disabled:opacity-50">
          {busy ? '확인 창 기다리는 중…' : (done ? '새 패스키 등록해서 보기' : '패스키 등록해서 보기')}
        </button>
        {done && (
          <button type="button" onClick={handleAssert} disabled={busy}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-mist px-5 text-[14px] font-medium text-ink disabled:opacity-50">
            같은 패스키로 다시 인증해서 보기
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-3 rounded-2xl bg-mist px-5 py-4 text-[13.5px] leading-[1.6] text-ink">
          <Icon name="x" className="mt-0.5 w-4 h-4 shrink-0" />{error}
        </p>
      )}
      {done && !error && (
        <p className="mt-4 text-[13px] leading-[1.7] text-sub">
          아래 비트는 방금 {done === 'created' ? '등록' : '인증'} 응답에서 그대로 꺼낸 진짜 값입니다. 지우려면 브라우저의
          비밀번호(패스키) 관리 화면에서 "aleph-bs-check.vercel.app"을 찾아 삭제하면 됩니다.
        </p>
      )}
    </div>
  );
}

// ── Step 1 · 판독 ────────────────────────────────────────
function ReadStep({ input, setInput, activeEx, applyExample, parsed }) {
  return (
    <Section id="read" eyebrow="Step 1 · 판독" title="응답을 읽습니다."
      lead="내 브라우저로 진짜 패스키를 만들어 실제 값을 보거나, 로그인 응답의 authenticatorData·플래그 한 바이트를 직접 넣어 비트를 풀어 봅니다.">
      <PasskeyDemo onResult={setInput} />

      <p className="mt-10 text-[13px] font-semibold text-sub">또는 시나리오 예시</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => <Pill key={ex.key} active={activeEx === ex.key} onClick={() => applyExample(ex.key)}>{ex.label}</Pill>)}
      </div>

      <label htmlFor="input" className="mt-14 block text-[15px] font-medium">authenticatorData 또는 플래그 바이트</label>
      <textarea id="input" value={input} onChange={(e) => setInput(e.target.value)} spellCheck="false" autoComplete="off" rows="2"
        placeholder="예: 0x1d  또는  -Td_nnE76Hb1-9671tqGcgHGs4jDZp695XBUSp4KOasdAAAABw"
        className="mt-3 w-full resize-y rounded-2xl border-0 bg-mist px-6 py-5 font-mono text-[15px] text-ink placeholder:text-sub/70 focus:outline-none focus:ring-2 focus:ring-ink" />
      <p className="mt-3 text-[13px] leading-[1.7] text-sub">받는 형식: 0x1d · 1d · 29 · 0b00011101 같은 한 바이트, 또는 authenticatorData 전체(base64url·16진수).</p>

      <div className="mt-16" aria-live="polite">
        {!input.trim() && <p className="text-[15px] text-sub">값을 넣으면 여기에 비트가 풀려 나옵니다.</p>}
        {input.trim() && !parsed.ok && (
          <p role="alert" className="flex items-start gap-3 rounded-2xl bg-mist px-6 py-5 text-[15px] text-ink">
            <Icon name="x" className="mt-0.5 w-5 h-5 shrink-0" />{parsed.error}
          </p>
        )}
        {parsed.ok && <Bits parsed={parsed} />}
      </div>
    </Section>
  );
}

function Bits({ parsed }) {
  const f = B.decodeFlags(parsed.flags);
  const be = B.FLAG_BITS.find((b) => b.name === 'BE');
  const bs = B.FLAG_BITS.find((b) => b.name === 'BS');
  return (
    <div>
      <p className="text-[14px] leading-[1.8] text-sub">
        {parsed.source} · 플래그 <span className="font-mono text-ink">{B.hex2(parsed.flags)}</span> (2진수 <span className="font-mono">{parsed.flags.toString(2).padStart(8, '0')}</span>)
        {parsed.signCount !== null && <><br />서명 카운터 {parsed.signCount} · 전체 {parsed.length}바이트</>}
      </p>
      <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-8" aria-label="플래그 비트 (왼쪽이 비트 7)">
        {B.FLAG_BITS.slice().reverse().map((b) => {
          const on = f[b.name];
          const key = b.name === 'BE' || b.name === 'BS';
          return (
            <div key={b.name} className={`rounded-2xl py-5 text-center ${key ? 'bg-white ring-1 ring-ink' : 'bg-mist'}`}>
              <p className={`text-[12px] ${key ? 'font-semibold text-ink' : 'text-sub'}`}>{b.name}</p>
              <p className={`mt-1 font-mono text-[28px] leading-tight ${on ? 'font-normal text-ink' : 'font-light text-sub'}`}>{on ? 1 : 0}</p>
              <p className="font-mono text-[11px] text-sub">{B.hex2(b.mask)}</p>
            </div>
          );
        })}
      </div>
      <dl className="mt-10 grid gap-6 sm:grid-cols-2">
        {[['BE', f.BE, be.label], ['BS', f.BS, bs.label]].map(([n, v, t]) => (
          <div key={n}>
            <dt className="text-[28px] font-extralight tracking-[-0.02em]">{n} = {v ? 1 : 0}</dt>
            <dd className="mt-1 text-[15px] font-light leading-[1.6] text-sub">{t}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 text-[13px] text-sub">이 값만으로는 "방금 바뀌었는지"를 알 수 없습니다. Step 2에서 서버가 보관한 값과 비교합니다.</p>
    </div>
  );
}

// ── Step 2 · 판정 ────────────────────────────────────────
function StoredSelect({ id, label, value, onChange, options }) {
  return (
    <div className="rounded-2xl bg-white px-6 pb-4 pt-5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-sub">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full appearance-none rounded-lg border-0 bg-transparent py-2 pr-10 text-[17px] text-ink focus:outline-none focus:ring-2 focus:ring-ink">
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </div>
  );
}

function PolicyStep({ parsed, stored, setStored, action, setAction }) {
  const set = (k) => (v) => setStored({ ...stored, [k]: v });
  const sel = (v) => (v === '' ? null : v === '1');
  const result = useMemo(() => {
    if (!parsed.ok) return null;
    try { return B.evaluate(parsed.flags, { be: sel(stored.be), bs: sel(stored.bs), ever: sel(stored.ever) }, action); }
    catch (e) { return { error: true }; }
  }, [parsed, stored, action]);

  let next = '';
  if (result && !result.error) {
    next = result.verdict === 'reject'
      ? `// ${result.next.note}`
      : JSON.stringify({ backup_eligible: result.next.backupEligible, backup_state: result.next.backupState, ever_backed_up: result.next.everBackedUp }, null, 2);
  }

  return (
    <Section id="policy" tone="mist" eyebrow="Step 2 · 판정" title="보관한 값과 비교합니다."
      lead="서버가 이 자격증명에 대해 저장해 둔 값을 고르세요. 전이는 막지 않고, 되돌릴 수 없는 동작에만 한 단계 더 요구합니다.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StoredSelect id="st-be" label="보관한 BE" value={stored.be} onChange={set('be')} options={[['', '저장 안 함'], ['1', '1 · 동기화 가능'], ['0', '0 · 기기 전용']]} />
        <StoredSelect id="st-bs" label="보관한 BS (지난번)" value={stored.bs} onChange={set('bs')} options={[['', '저장 안 함'], ['1', '1 · 백업됨'], ['0', '0 · 백업 안 됨']]} />
        <StoredSelect id="st-ever" label="한 번이라도 백업된 적" value={stored.ever} onChange={set('ever')} options={[['', '저장 안 함'], ['1', '있음'], ['0', '없음']]} />
      </div>

      <p className="mt-12 text-[15px] font-medium">사용자가 지금 하려는 일</p>
      <div className="mt-4">
        <Segmented name="사용자가 지금 하려는 일" value={action} onChange={setAction}
          options={[['login', '평소 로그인'], ['irreversible', '되돌릴 수 없는 동작']]} />
      </div>
      <p className="mt-3 text-[13px] text-sub">되돌릴 수 없는 동작: 키 삭제 · 결제 수단 변경 · 민감 자료 내려받기</p>

      <div className="mt-16">
        {!result && <p className="text-[15px] text-sub">Step 1에 로그인 응답을 넣으면 판정이 나옵니다.</p>}
        {result && result.error && <p role="alert" className="text-[15px]">판정 중 문제가 생겼습니다. 값을 다시 골라 주세요.</p>}
        {result && !result.error && (
          <>
            <Verdict kind={result.verdict} label={B.VERDICT_TEXT[result.verdict].label} body={B.VERDICT_TEXT[result.verdict].body} />
            <ul className="mt-12 divide-y divide-hair">
              {result.findings.map((x) => (
                <li key={x.title} className="flex gap-5 py-8 first:pt-0">
                  <Icon name={LEVEL_ICON[x.level]} className={`mt-0.5 w-6 h-6 shrink-0 ${x.level === 'bad' ? 'text-ink' : 'text-sub'}`} />
                  <div>
                    <h3 className={`text-[17px] leading-[1.5] ${x.level === 'bad' ? 'font-semibold' : 'font-medium'}`}>{x.title}</h3>
                    <p className="mt-2 text-[15px] font-light leading-[1.7] text-sub">{x.body}</p>
                    <p className="mt-3 font-mono text-[12px] text-sub">{x.ref}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Code title="이번 로그인 뒤 저장할 값" text={next} tone="white" />
          </>
        )}
      </div>
    </Section>
  );
}

// ── Step 3 · 서버 진단 ───────────────────────────────────
const PIPELINE = [
  ['저장 모델', 'backup_eligible · backup_state 컬럼'],
  ['라이브러리 호출', '보관값을 검증 함수 인자로 전달'],
  ['결과 저장', '라이브러리가 돌려준 새 BS를 받아 갱신'],
];
const QUICK = [['app:spring', 'Spring Security'], ['app:keycloak', 'Keycloak'], ['app:portfolio', 'SimpleWebAuthn 예제']];
const EMPTY_ANSWERS = { s1: 'unknown', s2: 'unknown', s3: 'unknown' };
// 기억으로 답하지 않고 바로 확인해 볼 수 있도록 — "예/아니오" 옆에 붙는 실제 확인 방법
const STEP_CHECKS = {
  s1: 'DB에서 스키마를 봅니다 — Postgres는 \\d credentials, MySQL은 DESCRIBE credentials; 로 backup_eligible·backup_state 컬럼이 있는지 봅니다.',
  s2: '로그인 검증 코드에서 라이브러리의 검증 함수를 부르는 줄을 찾아, 그 인자로 저장해 둔 backup_eligible·backup_state를 실제로 넘기는지 봅니다.',
  s3: '같은 계정으로 두 번 로그인한 뒤 SELECT backup_state, updated_at FROM credentials WHERE id = ...로 두 로그인 사이에 값이나 시각이 바뀌었는지 봅니다.',
};

function AuditStep() {
  const [pick, setPick] = useState('');
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);

  const choose = (v) => {
    setPick(v);
    const [kind, id] = v.split(':');
    const app = kind === 'app' ? B.APPS.find((a) => a.id === id) : null;
    setAnswers(app ? { ...app.answers } : EMPTY_ANSWERS);
  };

  const [kind, id] = pick ? pick.split(':') : [null, null];
  const app = kind === 'app' ? B.APPS.find((a) => a.id === id) : null;
  const lib = kind === 'lib' ? B.LIBRARIES.find((l) => l.id === id) : null;
  const r = B.audit(answers);
  const n = (sid) => B.STEPS.findIndex((s) => s.id === sid) + 1;

  let verdict;
  if (r.status === 'ok') verdict = { kind: 'pass', label: '세 단계 모두 있음', body: 'BE/BS 신호가 응용까지 이어집니다. Step 2의 판정 규칙을 정책에 붙이면 됩니다.' };
  else if (r.status === 'gap') verdict = { kind: 'reject', label: `${r.missing.map(n).join('·')}단계 빠짐`, body: `신호는 ${n(r.firstGap)}단계에서 끊깁니다. 이 상태에서는 전이가 일어나도 서버에 아무 변화가 없습니다.` };
  else verdict = { kind: 'stepup', label: '확인 필요', body: `${r.unknown.map(n).join('·')}단계를 모릅니다. 저장소 스키마와 로그인 검증 코드에서 BE·BS(backupEligible·backupState)를 찾아보세요.` };

  return (
    <Section id="audit" eyebrow="Step 3 · 서버 진단" title="끊긴 곳을 찾습니다."
      lead="라이브러리가 규격을 구현해도 서버가 값을 집어 들지 않으면 신호는 끊깁니다. 로그인 한 번마다 이 세 단계가 모두 이어져야 합니다.">
      <ol className="grid gap-12 sm:grid-cols-3 sm:gap-8">
        {PIPELINE.map(([t, d], i) => (
          <li key={t} className="border-t border-hair pt-6">
            <p className="text-[48px] font-thin leading-none text-sub">{i + 1}</p>
            <p className="mt-5 text-[19px] font-medium">{t}</p>
            <p className="mt-2 text-[15px] font-light leading-[1.6] text-sub">{d}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-[13px] text-sub">Spring Security는 2번에서, Keycloak은 1번에서 끊깁니다. 아래에서 내 스택을 확인해 보세요.</p>

      <div className="mt-24">
        <p className="text-[13px] font-semibold text-sub">빠른 선택</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK.map(([v, t]) => <Pill key={v} active={pick === v} onClick={() => choose(v)}>{t}</Pill>)}
        </div>
        <label htmlFor="lib" className="mt-10 block text-[15px] font-medium">그 밖의 라이브러리</label>
        <select id="lib" value={pick} onChange={(e) => choose(e.target.value)}
          className="mt-3 w-full appearance-none rounded-2xl border-0 bg-mist px-6 py-4 pr-12 text-[17px] text-ink focus:outline-none focus:ring-2 focus:ring-ink sm:max-w-[480px]">
          <option value="">고르세요</option>
          <optgroup label="라이브러리">{B.LIBRARIES.map((l) => <option key={l.id} value={`lib:${l.id}`}>{l.name} ({l.lang})</option>)}</optgroup>
          <optgroup label="응용">{B.APPS.map((a) => <option key={a.id} value={`app:${a.id}`}>{a.name}</option>)}</optgroup>
          <optgroup label="그 밖"><option value="lib:other">목록에 없음 / 직접 구현</option></optgroup>
        </select>

        {lib && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[14px]">
              <thead><tr className="text-[12px] text-sub">{['등록 때 노출', '인증 때 노출', '저장', '보관값과 대조·갱신'].map((h) => <th key={h} className="border-b border-hair pb-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody><tr>{lib.m.map((t, i) => <td key={i} className={`pt-3 ${t === '예' ? 'text-ink' : 'text-sub'} ${t.startsWith('아니오') ? 'font-semibold text-ink' : ''}`}>{t}</td>)}</tr></tbody>
            </table>
          </div>
        )}
        {(app || kind === 'lib') && (
          <p className="mt-8 flex gap-3 text-[15px] font-light leading-[1.7] text-sub">
            <Icon name="info" className="mt-0.5 w-5 h-5 shrink-0" />
            <span>
              {app
                ? <><span className="font-medium text-ink">{app.name}</span> — 기반 라이브러리 {B.LIBRARIES.find((l) => l.id === app.lib).name}. {app.note} 아래 답은 조사한 판정으로 채웠습니다.</>
                : (B.LIB_NOTES[id] || B.LIB_NOTES.other)}
            </span>
          </p>
        )}
      </div>

      <div className="mt-20 divide-y divide-hair border-y border-hair">
        {B.STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
            <div>
              <p className="text-[17px] leading-[1.6]"><span className="mr-3 font-light text-sub">{i + 1}</span>{s.q}</p>
              {STEP_CHECKS[s.id] && (
                <p className="mt-2 flex gap-2 text-[13px] leading-[1.6] text-sub sm:max-w-[520px]">
                  <Icon name="info" className="mt-0.5 w-3.5 h-3.5 shrink-0" /><span>기억 대신 직접 확인하려면: {STEP_CHECKS[s.id]}</span>
                </p>
              )}
            </div>
            <div className="shrink-0">
              <Segmented name={s.q} tone="mist" value={answers[s.id]} onChange={(v) => setAnswers({ ...answers, [s.id]: v })}
                options={[['yes', '예'], ['no', '아니오'], ['unknown', '모름']]} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <Verdict {...verdict} tone="mist" />
        {r.status !== 'ok' && (
          <>
            <Code title="1. 저장 모델에 컬럼 추가" text={B.FIX_SQL} />
            <Code title="2·3. 로그인 때 대조하고 갱신" text={B.FIX_JS} />
            <p className="mt-6 text-[13px] text-sub">추가 왕복도 사용자 상호작용도 필요 없고, 컬럼 세 개와 코드 몇 줄이면 닫힙니다.</p>
          </>
        )}
      </div>
    </Section>
  );
}

// ── 바닥 ────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-mist">
      <div className="mx-auto max-w-[980px] border-t border-hair px-6 py-16 text-[12px] leading-[1.8] text-sub">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="https://aleph-intro.vercel.app" className="hover:text-ink hover:underline">소개 사이트</a>
          <a href={PAPER_URL} target="_blank" rel="noopener" className="hover:text-ink hover:underline">연구 논문</a>
          <a href="https://github.com/ginye28/ALEPH/tree/main/L-B/app" target="_blank" rel="noopener" className="hover:text-ink hover:underline">소스 코드</a>
        </div>
        <details className="mt-8 group">
          <summary className="cursor-pointer list-none font-semibold text-ink">이 도구가 말하지 않는 것 <span className="inline-block transition-transform group-open:rotate-90">›</span></summary>
          <ul className="mt-4 max-w-[640px] space-y-3">
            <li>BE/BS는 인증장치가 스스로 신고하는 값입니다. 이 도구의 판정은 정직한 인증장치의 상태 변화를 놓치지 않기 위한 것이지, 값을 위장하는 공격자를 잡거나 전이 자체를 막기 위한 것이 아닙니다.</li>
            <li>Step 3의 라이브러리·응용 판정은 2026-09-11에 소스를 직접 읽어 얻은 것이며, 실행해 측정한 것은 제작자가 만든 시스템 하나뿐입니다.</li>
          </ul>
        </details>
        <p className="mt-8">만든 사람 진혜정 · 예시 값은 모두 만든 값이며 실제 사용자 자료가 아닙니다.</p>
      </div>
    </footer>
  );
}

// ── 앱 ──────────────────────────────────────────────────
function App() {
  const first = EXAMPLES[0];
  const [input, setInputRaw] = useState(first.input);
  const [stored, setStoredRaw] = useState({ be: first.be, bs: first.bs, ever: first.ever });
  const [action, setActionRaw] = useState(first.action);
  const [activeEx, setActiveEx] = useState(first.key);

  const parsed = useMemo(() => {
    try { return B.parseInput(input); }
    catch (e) { return { ok: false, error: '값을 읽는 중 문제가 생겼습니다. 형식을 확인해 주세요.' }; }
  }, [input]);

  // 손으로 바꾸면 예시 선택 표시를 끈다
  const setInput = (v) => { setActiveEx(null); setInputRaw(v); };
  const setStored = (v) => { setActiveEx(null); setStoredRaw(v); };
  const setAction = (v) => { setActiveEx(null); setActionRaw(v); };
  const applyExample = (key) => {
    const ex = EXAMPLES.find((e) => e.key === key);
    if (!ex) return;
    setInputRaw(ex.input);
    setStoredRaw({ be: ex.be, bs: ex.bs, ever: ex.ever });
    setActionRaw(ex.action);
    setActiveEx(key);
  };

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Proof />
        <ReadStep input={input} setInput={setInput} activeEx={activeEx} applyExample={applyExample} parsed={parsed} />
        <PolicyStep parsed={parsed} stored={stored} setStored={setStored} action={action} setAction={setAction} />
        <AuditStep />
      </main>
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
