const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
const B = window.BSCheck;
const PAPER_URL = 'https://github.com/ginye28/ALEPH/blob/main/10/%EB%85%BC%EB%AC%B8.md';

// 예시 값은 만든 값이다. authenticatorData의 RP ID 해시는 "passkey.example"의 SHA-256.
const AUTH_1D = '-Td_nnE76Hb1-9671tqGcgHGs4jDZp695XBUSp4KOasdAAAABw';
const EXAMPLES = [{
  key: 'up',
  label: '동기화 시작됨',
  input: AUTH_1D,
  be: '1',
  bs: '0',
  ever: '0',
  action: 'irreversible'
}, {
  key: 'down',
  label: '동기화 해제됨',
  input: '0x0d',
  be: '1',
  bs: '1',
  ever: '1',
  action: 'login'
}, {
  key: 'device',
  label: '기기 전용 키',
  input: '0x05',
  be: '0',
  bs: '0',
  ever: '0',
  action: 'login'
}, {
  key: 'invalid',
  label: '규격 위반 응답',
  input: '0x15',
  be: '0',
  bs: '0',
  ever: '0',
  action: 'login'
}, {
  key: 'nostore',
  label: '보관 이력 없음',
  input: AUTH_1D,
  be: '',
  bs: '',
  ever: '',
  action: 'login'
}];

// ── 아이콘 (얇은 선) ─────────────────────────────────────
const PATHS = {
  check: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.8 12.4l2.8 2.8 5.6-5.6"
  })),
  alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3.6l9 15.8H3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9.8v4.2M12 16.8v.1"
  })),
  x: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 9l6 6M15 9l-6 6"
  })),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v5.2M12 7.8v.1"
  })),
  copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "11",
    height: "11",
    rx: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"
  })),
  arrow: /*#__PURE__*/React.createElement("path", {
    d: "M9 6l6 6-6 6"
  })
};
function Icon({
  name,
  className = 'w-5 h-5'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, PATHS[name]);
}
const LEVEL_ICON = {
  ok: 'check',
  warn: 'alert',
  bad: 'x',
  info: 'info'
};
const VERDICT_ICON = {
  pass: 'check',
  stepup: 'alert',
  reject: 'x'
};

// ── 스크롤 페이드인: 텍스트만, 10px·1초 ─────────────────
function Fade({
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -8% 0px'
    });
    io.observe(el);
    // 안전망: 옵저버가 백그라운드 탭 등에서 늦게 뜨거나 안 떠도, 내용이 계속 숨어 있지는 않게 한다
    const timer = setTimeout(() => setShown(true), 1200);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);
  return /*#__PURE__*/React.createElement(Tag, {
    ref: ref,
    className: `fade ${shown ? 'in' : ''} ${className}`,
    ...rest
  }, children);
}

// ── 공통 조각 ────────────────────────────────────────────
function Section({
  id,
  tone = 'white',
  eyebrow,
  title,
  lead,
  children
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    "aria-labelledby": `h-${id}`,
    className: `${tone === 'mist' ? 'bg-mist' : 'bg-white'} scroll-mt-12`
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto max-w-[980px] px-6 py-32 sm:py-48"
  }, /*#__PURE__*/React.createElement(Fade, {
    as: "p",
    className: "text-[14px] font-semibold text-sub"
  }, eyebrow), /*#__PURE__*/React.createElement(Fade, {
    as: "h2",
    id: `h-${id}`,
    className: "mt-3 text-[40px] sm:text-[56px] font-extralight leading-[1.08] tracking-[-0.025em]"
  }, title), /*#__PURE__*/React.createElement(Fade, {
    as: "p",
    className: "mt-6 max-w-[600px] text-[17px] sm:text-[19px] font-light leading-[1.6] text-sub"
  }, lead), /*#__PURE__*/React.createElement("div", {
    className: "mt-16 sm:mt-24"
  }, children)));
}
function Pill({
  active,
  onClick,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    "aria-pressed": active,
    className: `min-h-[40px] rounded-full px-5 text-[14px] transition-colors ${active ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-hair/60'}`
  }, children);
}
function Segmented({
  name,
  value,
  options,
  onChange,
  tone = 'white'
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    "aria-label": name,
    className: `inline-flex flex-wrap gap-1 rounded-full p-1 ${tone === 'white' ? 'bg-white' : 'bg-mist'}`
  }, options.map(([v, t]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    role: "radio",
    "aria-checked": value === v,
    onClick: () => onChange(v),
    className: `min-h-[36px] rounded-full px-4 text-[14px] transition-colors ${value === v ? 'bg-ink text-white' : 'text-sub hover:text-ink'}`
  }, t)));
}
function CopyButton({
  text
}) {
  const [state, setState] = useState('idle');
  const onClick = async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      ok = false;
    }
    setState(ok ? 'done' : 'blocked');
    setTimeout(() => setState('idle'), 1800);
  };
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    className: "inline-flex min-h-[36px] items-center gap-1.5 text-[13px] text-sub hover:text-ink"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: state === 'blocked' ? 'x' : state === 'done' ? 'check' : 'copy',
    className: "w-4 h-4"
  }), state === 'done' ? '복사됨' : state === 'blocked' ? '복사 막힘 — 직접 선택하세요' : '복사');
}
function Code({
  title,
  text,
  tone = 'mist'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-[15px] font-medium"
  }, title), /*#__PURE__*/React.createElement(CopyButton, {
    text: text
  })), /*#__PURE__*/React.createElement("pre", {
    className: `mt-3 overflow-x-auto rounded-2xl px-6 py-5 font-mono text-[13px] leading-[1.7] text-ink ${tone === 'mist' ? 'bg-mist' : 'bg-white'}`
  }, text));
}
function Verdict({
  kind,
  label,
  body,
  tone = 'white'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-3xl px-8 py-12 sm:px-14 sm:py-16 ${tone === 'white' ? 'bg-white' : 'bg-mist'}`,
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] font-semibold text-sub"
  }, "판정"), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex items-center gap-4"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: VERDICT_ICON[kind],
    className: `w-10 h-10 sm:w-12 sm:h-12 shrink-0 ${kind === 'pass' ? 'text-sub' : 'text-ink'}`
  }), /*#__PURE__*/React.createElement("p", {
    className: `text-[36px] sm:text-[52px] leading-none tracking-[-0.025em] ${kind === 'reject' ? 'font-normal' : 'font-extralight'}`
  }, label)), /*#__PURE__*/React.createElement("p", {
    className: "mt-6 max-w-[560px] text-[17px] font-light leading-[1.6] text-sub"
  }, body));
}

// ── 머리 ────────────────────────────────────────────────
function Nav() {
  return /*#__PURE__*/React.createElement("nav", {
    className: "sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto flex h-12 max-w-[980px] items-center justify-between px-6 text-[12px]"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    className: "font-semibold tracking-tight text-ink"
  }, "BS Check"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-7 text-sub"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#read",
    className: "hover:text-ink"
  }, "판독"), /*#__PURE__*/React.createElement("a", {
    href: "#policy",
    className: "hover:text-ink"
  }, "판정"), /*#__PURE__*/React.createElement("a", {
    href: "#audit",
    className: "hover:text-ink"
  }, "서버 진단"))));
}
function Hero() {
  return /*#__PURE__*/React.createElement("header", {
    id: "top",
    className: "bg-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto max-w-[1080px] px-6 pb-40 pt-32 text-center sm:pb-56 sm:pt-48"
  }, /*#__PURE__*/React.createElement(Fade, {
    as: "p",
    className: "text-[14px] font-semibold text-sub"
  }, "WebAuthn · 패스키"), /*#__PURE__*/React.createElement(Fade, {
    as: "h1",
    className: "mt-5 text-[40px] font-extralight leading-[1.1] tracking-[-0.03em] sm:text-[56px] lg:text-[68px]"
  }, "로그인 응답 하나로", /*#__PURE__*/React.createElement("br", null), "백업 상태 전이를 판정합니다."), /*#__PURE__*/React.createElement(Fade, {
    as: "p",
    className: "mx-auto mt-8 max-w-[640px] text-[19px] font-light leading-[1.6] text-sub sm:text-[21px]"
  }, "이 앱은 패스키 로그인을 만드는 개발자를 돕습니다. 로그인 응답을 넣으면 백업 상태(BE·BS) 전이를 판정하고, 서버에 빠진 저장·대조 단계를 알려 줍니다."), /*#__PURE__*/React.createElement(Fade, {
    className: "mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#read",
    className: "inline-flex min-h-[44px] items-center rounded-full bg-ink px-7 text-[15px] font-medium text-white hover:bg-black"
  }, "시작하기"), /*#__PURE__*/React.createElement("a", {
    href: "#audit",
    className: "inline-flex min-h-[44px] items-center gap-0.5 text-[17px] text-ink hover:underline underline-offset-4"
  }, "내 서버 진단하기 ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow",
    className: "w-4 h-4"
  }))), /*#__PURE__*/React.createElement(Fade, {
    as: "p",
    className: "mx-auto mt-20 max-w-[560px] text-[13px] leading-[1.7] text-sub"
  }, "기반 연구 · ", /*#__PURE__*/React.createElement("a", {
    href: PAPER_URL,
    target: "_blank",
    rel: "noopener",
    className: "text-ink underline-offset-4 hover:underline"
  }, "「동기화 패스키의 백업 상태 전이는 서비스에 관측되는가」"), " 진혜정, 2026", /*#__PURE__*/React.createElement("br", null), "계산은 전부 이 브라우저 안에서 이뤄집니다. 값을 어디로도 보내지 않습니다.")));
}
function Proof() {
  const items = [['10', '/10', '전이를 줘도 서버 응답·저장 상태는 그대로였습니다.'], ['4', '/11', '보관값과 대조·갱신까지 구현한 라이브러리.'], ['0', '/3', '끝까지 신호를 지킨 실제 응용.']];
  return /*#__PURE__*/React.createElement("section", {
    className: "bg-mist",
    "aria-labelledby": "h-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto max-w-[980px] px-6 py-32 sm:py-40"
  }, /*#__PURE__*/React.createElement(Fade, {
    as: "h2",
    id: "h-proof",
    className: "text-center text-[14px] font-semibold text-sub"
  }, "직접 측정하고 조사해서 확인한 문제"), /*#__PURE__*/React.createElement("div", {
    className: "mt-16 grid gap-16 sm:grid-cols-3 sm:gap-10"
  }, items.map(([n, d, t]) => /*#__PURE__*/React.createElement(Fade, {
    key: t,
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[64px] font-thin leading-none tracking-[-0.04em] sm:text-[80px]"
  }, n, /*#__PURE__*/React.createElement("span", {
    className: "text-[0.4em] font-light text-sub"
  }, d)), /*#__PURE__*/React.createElement("p", {
    className: "mx-auto mt-5 max-w-[240px] text-[15px] font-light leading-[1.6] text-sub"
  }, t))))));
}

// ── Step 1 · 판독 ────────────────────────────────────────
function ReadStep({
  input,
  setInput,
  activeEx,
  applyExample,
  parsed
}) {
  return /*#__PURE__*/React.createElement(Section, {
    id: "read",
    eyebrow: "Step 1 · 판독",
    title: "응답을 읽습니다.",
    lead: "로그인 응답의 authenticatorData나 플래그 한 바이트를 넣으면 비트를 풀어 보여 줍니다. 먼저 예시로 감을 잡아 보세요."
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] font-semibold text-sub"
  }, "시나리오 예시"), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex flex-wrap gap-2"
  }, EXAMPLES.map(ex => /*#__PURE__*/React.createElement(Pill, {
    key: ex.key,
    active: activeEx === ex.key,
    onClick: () => applyExample(ex.key)
  }, ex.label))), /*#__PURE__*/React.createElement("label", {
    htmlFor: "input",
    className: "mt-14 block text-[15px] font-medium"
  }, "authenticatorData 또는 플래그 바이트"), /*#__PURE__*/React.createElement("textarea", {
    id: "input",
    value: input,
    onChange: e => setInput(e.target.value),
    spellCheck: "false",
    autoComplete: "off",
    rows: "2",
    placeholder: "예: 0x1d  또는  -Td_nnE76Hb1-9671tqGcgHGs4jDZp695XBUSp4KOasdAAAABw",
    className: "mt-3 w-full resize-y rounded-2xl border-0 bg-mist px-6 py-5 font-mono text-[15px] text-ink placeholder:text-sub/70 focus:outline-none focus:ring-2 focus:ring-ink"
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-[13px] leading-[1.7] text-sub"
  }, "받는 형식: 0x1d · 1d · 29 · 0b00011101 같은 한 바이트, 또는 authenticatorData 전체(base64url·16진수)."), /*#__PURE__*/React.createElement("div", {
    className: "mt-16",
    "aria-live": "polite"
  }, !input.trim() && /*#__PURE__*/React.createElement("p", {
    className: "text-[15px] text-sub"
  }, "값을 넣으면 여기에 비트가 풀려 나옵니다."), input.trim() && !parsed.ok && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "flex items-start gap-3 rounded-2xl bg-mist px-6 py-5 text-[15px] text-ink"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    className: "mt-0.5 w-5 h-5 shrink-0"
  }), parsed.error), parsed.ok && /*#__PURE__*/React.createElement(Bits, {
    parsed: parsed
  })));
}
function Bits({
  parsed
}) {
  const f = B.decodeFlags(parsed.flags);
  const be = B.FLAG_BITS.find(b => b.name === 'BE');
  const bs = B.FLAG_BITS.find(b => b.name === 'BS');
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-[14px] leading-[1.8] text-sub"
  }, parsed.source, " · 플래그 ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-ink"
  }, B.hex2(parsed.flags)), " (2진수 ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, parsed.flags.toString(2).padStart(8, '0')), ")", parsed.signCount !== null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("br", null), "서명 카운터 ", parsed.signCount, " · 전체 ", parsed.length, "바이트")), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 grid grid-cols-4 gap-2 sm:grid-cols-8",
    "aria-label": "플래그 비트 (왼쪽이 비트 7)"
  }, B.FLAG_BITS.slice().reverse().map(b => {
    const on = f[b.name];
    const key = b.name === 'BE' || b.name === 'BS';
    return /*#__PURE__*/React.createElement("div", {
      key: b.name,
      className: `rounded-2xl py-5 text-center ${key ? 'bg-white ring-1 ring-ink' : 'bg-mist'}`
    }, /*#__PURE__*/React.createElement("p", {
      className: `text-[12px] ${key ? 'font-semibold text-ink' : 'text-sub'}`
    }, b.name), /*#__PURE__*/React.createElement("p", {
      className: `mt-1 font-mono text-[28px] leading-tight ${on ? 'font-normal text-ink' : 'font-light text-sub'}`
    }, on ? 1 : 0), /*#__PURE__*/React.createElement("p", {
      className: "font-mono text-[11px] text-sub"
    }, B.hex2(b.mask)));
  })), /*#__PURE__*/React.createElement("dl", {
    className: "mt-10 grid gap-6 sm:grid-cols-2"
  }, [['BE', f.BE, be.label], ['BS', f.BS, bs.label]].map(([n, v, t]) => /*#__PURE__*/React.createElement("div", {
    key: n
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-[28px] font-extralight tracking-[-0.02em]"
  }, n, " = ", v ? 1 : 0), /*#__PURE__*/React.createElement("dd", {
    className: "mt-1 text-[15px] font-light leading-[1.6] text-sub"
  }, t)))), /*#__PURE__*/React.createElement("p", {
    className: "mt-10 text-[13px] text-sub"
  }, "이 값만으로는 \"방금 바뀌었는지\"를 알 수 없습니다. Step 2에서 서버가 보관한 값과 비교합니다."));
}

// ── Step 2 · 판정 ────────────────────────────────────────
function StoredSelect({
  id,
  label,
  value,
  onChange,
  options
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl bg-white px-6 pb-4 pt-5"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    className: "block text-[13px] font-semibold text-sub"
  }, label), /*#__PURE__*/React.createElement("select", {
    id: id,
    value: value,
    onChange: e => onChange(e.target.value),
    className: "mt-2 w-full appearance-none rounded-lg border-0 bg-transparent py-2 pr-10 text-[17px] text-ink focus:outline-none focus:ring-2 focus:ring-ink"
  }, options.map(([v, t]) => /*#__PURE__*/React.createElement("option", {
    key: v,
    value: v
  }, t))));
}
function PolicyStep({
  parsed,
  stored,
  setStored,
  action,
  setAction
}) {
  const set = k => v => setStored({
    ...stored,
    [k]: v
  });
  const sel = v => v === '' ? null : v === '1';
  const result = useMemo(() => {
    if (!parsed.ok) return null;
    try {
      return B.evaluate(parsed.flags, {
        be: sel(stored.be),
        bs: sel(stored.bs),
        ever: sel(stored.ever)
      }, action);
    } catch (e) {
      return {
        error: true
      };
    }
  }, [parsed, stored, action]);
  let next = '';
  if (result && !result.error) {
    next = result.verdict === 'reject' ? `// ${result.next.note}` : JSON.stringify({
      backup_eligible: result.next.backupEligible,
      backup_state: result.next.backupState,
      ever_backed_up: result.next.everBackedUp
    }, null, 2);
  }
  return /*#__PURE__*/React.createElement(Section, {
    id: "policy",
    tone: "mist",
    eyebrow: "Step 2 · 판정",
    title: "보관한 값과 비교합니다.",
    lead: "서버가 이 자격증명에 대해 저장해 둔 값을 고르세요. 전이는 막지 않고, 되돌릴 수 없는 동작에만 한 단계 더 요구합니다."
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-3"
  }, /*#__PURE__*/React.createElement(StoredSelect, {
    id: "st-be",
    label: "보관한 BE",
    value: stored.be,
    onChange: set('be'),
    options: [['', '저장 안 함'], ['1', '1 · 동기화 가능'], ['0', '0 · 기기 전용']]
  }), /*#__PURE__*/React.createElement(StoredSelect, {
    id: "st-bs",
    label: "보관한 BS (지난번)",
    value: stored.bs,
    onChange: set('bs'),
    options: [['', '저장 안 함'], ['1', '1 · 백업됨'], ['0', '0 · 백업 안 됨']]
  }), /*#__PURE__*/React.createElement(StoredSelect, {
    id: "st-ever",
    label: "한 번이라도 백업된 적",
    value: stored.ever,
    onChange: set('ever'),
    options: [['', '저장 안 함'], ['1', '있음'], ['0', '없음']]
  })), /*#__PURE__*/React.createElement("p", {
    className: "mt-12 text-[15px] font-medium"
  }, "사용자가 지금 하려는 일"), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(Segmented, {
    name: "사용자가 지금 하려는 일",
    value: action,
    onChange: setAction,
    options: [['login', '평소 로그인'], ['irreversible', '되돌릴 수 없는 동작']]
  })), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-[13px] text-sub"
  }, "되돌릴 수 없는 동작: 키 삭제 · 결제 수단 변경 · 민감 자료 내려받기"), /*#__PURE__*/React.createElement("div", {
    className: "mt-16"
  }, !result && /*#__PURE__*/React.createElement("p", {
    className: "text-[15px] text-sub"
  }, "Step 1에 로그인 응답을 넣으면 판정이 나옵니다."), result && result.error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-[15px]"
  }, "판정 중 문제가 생겼습니다. 값을 다시 골라 주세요."), result && !result.error && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Verdict, {
    kind: result.verdict,
    label: B.VERDICT_TEXT[result.verdict].label,
    body: B.VERDICT_TEXT[result.verdict].body
  }), /*#__PURE__*/React.createElement("ul", {
    className: "mt-12 divide-y divide-hair"
  }, result.findings.map(x => /*#__PURE__*/React.createElement("li", {
    key: x.title,
    className: "flex gap-5 py-8 first:pt-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: LEVEL_ICON[x.level],
    className: `mt-0.5 w-6 h-6 shrink-0 ${x.level === 'bad' ? 'text-ink' : 'text-sub'}`
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: `text-[17px] leading-[1.5] ${x.level === 'bad' ? 'font-semibold' : 'font-medium'}`
  }, x.title), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[15px] font-light leading-[1.7] text-sub"
  }, x.body), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 font-mono text-[12px] text-sub"
  }, x.ref))))), /*#__PURE__*/React.createElement(Code, {
    title: "이번 로그인 뒤 저장할 값",
    text: next,
    tone: "white"
  }))));
}

// ── Step 3 · 서버 진단 ───────────────────────────────────
const PIPELINE = [['저장 모델', 'backup_eligible · backup_state 컬럼'], ['라이브러리 호출', '보관값을 검증 함수 인자로 전달'], ['결과 저장', '라이브러리가 돌려준 새 BS를 받아 갱신']];
const QUICK = [['app:spring', 'Spring Security'], ['app:keycloak', 'Keycloak'], ['app:portfolio', 'SimpleWebAuthn 예제']];
const EMPTY_ANSWERS = {
  s1: 'unknown',
  s2: 'unknown',
  s3: 'unknown'
};
function AuditStep() {
  const [pick, setPick] = useState('');
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const choose = v => {
    setPick(v);
    const [kind, id] = v.split(':');
    const app = kind === 'app' ? B.APPS.find(a => a.id === id) : null;
    setAnswers(app ? {
      ...app.answers
    } : EMPTY_ANSWERS);
  };
  const [kind, id] = pick ? pick.split(':') : [null, null];
  const app = kind === 'app' ? B.APPS.find(a => a.id === id) : null;
  const lib = kind === 'lib' ? B.LIBRARIES.find(l => l.id === id) : null;
  const r = B.audit(answers);
  const n = sid => B.STEPS.findIndex(s => s.id === sid) + 1;
  let verdict;
  if (r.status === 'ok') verdict = {
    kind: 'pass',
    label: '세 단계 모두 있음',
    body: 'BE/BS 신호가 응용까지 이어집니다. Step 2의 판정 규칙을 정책에 붙이면 됩니다.'
  };else if (r.status === 'gap') verdict = {
    kind: 'reject',
    label: `${r.missing.map(n).join('·')}단계 빠짐`,
    body: `신호는 ${n(r.firstGap)}단계에서 끊깁니다. 이 상태에서는 전이가 일어나도 서버에 아무 변화가 없습니다.`
  };else verdict = {
    kind: 'stepup',
    label: '확인 필요',
    body: `${r.unknown.map(n).join('·')}단계를 모릅니다. 저장소 스키마와 로그인 검증 코드에서 BE·BS(backupEligible·backupState)를 찾아보세요.`
  };
  return /*#__PURE__*/React.createElement(Section, {
    id: "audit",
    eyebrow: "Step 3 · 서버 진단",
    title: "끊긴 곳을 찾습니다.",
    lead: "라이브러리가 규격을 구현해도 서버가 값을 집어 들지 않으면 신호는 끊깁니다. 로그인 한 번마다 이 세 단계가 모두 이어져야 합니다."
  }, /*#__PURE__*/React.createElement("ol", {
    className: "grid gap-12 sm:grid-cols-3 sm:gap-8"
  }, PIPELINE.map(([t, d], i) => /*#__PURE__*/React.createElement("li", {
    key: t,
    className: "border-t border-hair pt-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[48px] font-thin leading-none text-sub"
  }, i + 1), /*#__PURE__*/React.createElement("p", {
    className: "mt-5 text-[19px] font-medium"
  }, t), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[15px] font-light leading-[1.6] text-sub"
  }, d)))), /*#__PURE__*/React.createElement("p", {
    className: "mt-10 text-[13px] text-sub"
  }, "Spring Security는 2번에서, Keycloak은 1번에서 끊깁니다. 아래에서 내 스택을 확인해 보세요."), /*#__PURE__*/React.createElement("div", {
    className: "mt-24"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] font-semibold text-sub"
  }, "빠른 선택"), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex flex-wrap gap-2"
  }, QUICK.map(([v, t]) => /*#__PURE__*/React.createElement(Pill, {
    key: v,
    active: pick === v,
    onClick: () => choose(v)
  }, t))), /*#__PURE__*/React.createElement("label", {
    htmlFor: "lib",
    className: "mt-10 block text-[15px] font-medium"
  }, "그 밖의 라이브러리"), /*#__PURE__*/React.createElement("select", {
    id: "lib",
    value: pick,
    onChange: e => choose(e.target.value),
    className: "mt-3 w-full appearance-none rounded-2xl border-0 bg-mist px-6 py-4 pr-12 text-[17px] text-ink focus:outline-none focus:ring-2 focus:ring-ink sm:max-w-[480px]"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "고르세요"), /*#__PURE__*/React.createElement("optgroup", {
    label: "라이브러리"
  }, B.LIBRARIES.map(l => /*#__PURE__*/React.createElement("option", {
    key: l.id,
    value: `lib:${l.id}`
  }, l.name, " (", l.lang, ")"))), /*#__PURE__*/React.createElement("optgroup", {
    label: "응용"
  }, B.APPS.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.id,
    value: `app:${a.id}`
  }, a.name))), /*#__PURE__*/React.createElement("optgroup", {
    label: "그 밖"
  }, /*#__PURE__*/React.createElement("option", {
    value: "lib:other"
  }, "목록에 없음 / 직접 구현"))), lib && /*#__PURE__*/React.createElement("div", {
    className: "mt-8 overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full min-w-[520px] text-left text-[14px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-[12px] text-sub"
  }, ['등록 때 노출', '인증 때 노출', '저장', '보관값과 대조·갱신'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    className: "border-b border-hair pb-3 font-semibold"
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, lib.m.map((t, i) => /*#__PURE__*/React.createElement("td", {
    key: i,
    className: `pt-3 ${t === '예' ? 'text-ink' : 'text-sub'} ${t.startsWith('아니오') ? 'font-semibold text-ink' : ''}`
  }, t)))))), (app || kind === 'lib') && /*#__PURE__*/React.createElement("p", {
    className: "mt-8 flex gap-3 text-[15px] font-light leading-[1.7] text-sub"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    className: "mt-0.5 w-5 h-5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, app ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-ink"
  }, app.name), " — 기반 라이브러리 ", B.LIBRARIES.find(l => l.id === app.lib).name, ". ", app.note, " 아래 답은 조사한 판정으로 채웠습니다.") : B.LIB_NOTES[id] || B.LIB_NOTES.other))), /*#__PURE__*/React.createElement("div", {
    className: "mt-20 divide-y divide-hair border-y border-hair"
  }, B.STEPS.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[17px] leading-[1.6]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mr-3 font-light text-sub"
  }, i + 1), s.q), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0"
  }, /*#__PURE__*/React.createElement(Segmented, {
    name: s.q,
    tone: "mist",
    value: answers[s.id],
    onChange: v => setAnswers({
      ...answers,
      [s.id]: v
    }),
    options: [['yes', '예'], ['no', '아니오'], ['unknown', '모름']]
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-16"
  }, /*#__PURE__*/React.createElement(Verdict, {
    ...verdict,
    tone: "mist"
  }), r.status !== 'ok' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Code, {
    title: "1. 저장 모델에 컬럼 추가",
    text: B.FIX_SQL
  }), /*#__PURE__*/React.createElement(Code, {
    title: "2·3. 로그인 때 대조하고 갱신",
    text: B.FIX_JS
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-6 text-[13px] text-sub"
  }, "추가 왕복도 사용자 상호작용도 필요 없고, 컬럼 세 개와 코드 몇 줄이면 닫힙니다."))));
}

// ── 바닥 ────────────────────────────────────────────────
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "bg-mist"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto max-w-[980px] border-t border-hair px-6 py-16 text-[12px] leading-[1.8] text-sub"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-x-6 gap-y-2"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://aleph-intro.vercel.app",
    className: "hover:text-ink hover:underline"
  }, "소개 사이트"), /*#__PURE__*/React.createElement("a", {
    href: PAPER_URL,
    target: "_blank",
    rel: "noopener",
    className: "hover:text-ink hover:underline"
  }, "연구 논문"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/ginye28/ALEPH/tree/main/L-B/app",
    target: "_blank",
    rel: "noopener",
    className: "hover:text-ink hover:underline"
  }, "소스 코드")), /*#__PURE__*/React.createElement("details", {
    className: "mt-8 group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer list-none font-semibold text-ink"
  }, "이 도구가 말하지 않는 것 ", /*#__PURE__*/React.createElement("span", {
    className: "inline-block transition-transform group-open:rotate-90"
  }, "›")), /*#__PURE__*/React.createElement("ul", {
    className: "mt-4 max-w-[640px] space-y-3"
  }, /*#__PURE__*/React.createElement("li", null, "BE/BS는 인증장치가 스스로 신고하는 값입니다. 이 도구의 판정은 정직한 인증장치의 상태 변화를 놓치지 않기 위한 것이지, 값을 위장하는 공격자를 잡거나 전이 자체를 막기 위한 것이 아닙니다."), /*#__PURE__*/React.createElement("li", null, "Step 3의 라이브러리·응용 판정은 2026-09-11에 소스를 직접 읽어 얻은 것이며, 실행해 측정한 것은 제작자가 만든 시스템 하나뿐입니다."))), /*#__PURE__*/React.createElement("p", {
    className: "mt-8"
  }, "만든 사람 진혜정 · 예시 값은 모두 만든 값이며 실제 사용자 자료가 아닙니다.")));
}

// ── 앱 ──────────────────────────────────────────────────
function App() {
  const first = EXAMPLES[0];
  const [input, setInputRaw] = useState(first.input);
  const [stored, setStoredRaw] = useState({
    be: first.be,
    bs: first.bs,
    ever: first.ever
  });
  const [action, setActionRaw] = useState(first.action);
  const [activeEx, setActiveEx] = useState(first.key);
  const parsed = useMemo(() => {
    try {
      return B.parseInput(input);
    } catch (e) {
      return {
        ok: false,
        error: '값을 읽는 중 문제가 생겼습니다. 형식을 확인해 주세요.'
      };
    }
  }, [input]);

  // 손으로 바꾸면 예시 선택 표시를 끈다
  const setInput = v => {
    setActiveEx(null);
    setInputRaw(v);
  };
  const setStored = v => {
    setActiveEx(null);
    setStoredRaw(v);
  };
  const setAction = v => {
    setActiveEx(null);
    setActionRaw(v);
  };
  const applyExample = key => {
    const ex = EXAMPLES.find(e => e.key === key);
    if (!ex) return;
    setInputRaw(ex.input);
    setStoredRaw({
      be: ex.be,
      bs: ex.bs,
      ever: ex.ever
    });
    setActionRaw(ex.action);
    setActiveEx(key);
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Nav, null), /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Proof, null), /*#__PURE__*/React.createElement(ReadStep, {
    input: input,
    setInput: setInput,
    activeEx: activeEx,
    applyExample: applyExample,
    parsed: parsed
  }), /*#__PURE__*/React.createElement(PolicyStep, {
    parsed: parsed,
    stored: stored,
    setStored: setStored,
    action: action,
    setAction: setAction
  }), /*#__PURE__*/React.createElement(AuditStep, null)), /*#__PURE__*/React.createElement(Footer, null));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
