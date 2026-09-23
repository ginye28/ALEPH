# BS Check — 패스키 백업 상태 판정기

10번 논문 「동기화 패스키의 백업 상태 전이는 서비스에 관측되는가」(진혜정, 2026)의 결과를 쓰는 앱입니다.

**패스키 로그인을 만드는 개발자가 로그인 응답을 넣으면, 규격 §7.2 단계 18·19와 적응형 인증 규칙으로 백업 상태(BE/BS) 전이를 판정하고 서버에 빠진 저장·대조 단계를 알려 줍니다. 계산은 전부 브라우저 안에서 이뤄지고, 값을 어디로도 보내지 않습니다.**

- 공개 주소: https://aleph-bs-check.vercel.app
- 설치할 것 없음. 서버·로그인·AI 호출·비밀값 없음. 넣은 값은 브라우저 밖으로 나가지 않습니다.
- Step 1에서 "내 브라우저로 직접 확인하기"를 누르면 지금 기기에 진짜 패스키를 만들어(WebAuthn) 그 authenticatorData를 그대로 보여줍니다 — 예시 값이 아니라 실제 값입니다. 같은 패스키로 다시 인증하면, 지난번 값을 이 브라우저에 기억해 뒀다가 실제로 뭐가 바뀌었는지 비교해 줍니다(논문 5.2절이 서버에게 하라는 바로 그 일 — 이 앱은 그걸 localStorage로 대신 보여 줍니다).
- Step 3에 라이브러리 11개·응용 3개 전체를 한 화면에서 보는 비교표가 있습니다(내 스택 하나가 아니라 생태계 전체를 참고 자료로 볼 때).
- 지금 화면 상태(입력값·판정·스택 선택)를 담은 링크를 복사해 공유할 수 있고, Step 1~3 결과를 텍스트 리포트로도 복사할 수 있습니다 — 둘 다 이 브라우저 안에서만 만들어집니다.
- 시스템이 다크 모드면 이 페이지도 자동으로 어두워집니다.

## 여는 방법 (둘 중 하나)

1. **그냥 열기** — 이 폴더의 `index.html`을 더블클릭합니다. React·React DOM은 `vendor/`에 같이 담겨 있어 인터넷 없이도 뜨고, 글꼴 하나만 CDN에서 불러옵니다(실패해도 시스템 글꼴로 대체됨). 판정 규칙 `logic.js`와 `node test.cjs`도 완전히 오프라인입니다. "내 브라우저로 직접 확인하기"(진짜 패스키 등록)는 WebAuthn 규격상 HTTPS나 localhost에서만 되므로, `file://`로 열면 버튼을 눌러도 안내 문구가 뜨고 만들어지지 않습니다 — 그때는 시나리오 예시를 씁니다.
2. **로컬 서버로 열기** — 이 폴더에서 아래를 실행하고 http://localhost:5180 을 엽니다.
   ```bash
   python -m http.server 5180
   ```

판정 규칙 확인(선택, Node.js 18 이상):

```bash
node test.cjs
```

`32개 모두 통과`가 나오면 논문 규칙대로 판정하고, 잘못된 입력에도 멈추지 않는다는 뜻입니다.

## 사용자가 할 일 세 가지

| # | 할 일 | 해 보는 방법 | 나오는 것 |
|---|---|---|---|
| 1 | 로그인 응답에서 BE·BS 읽기 | Step 1의 시나리오 예시를 누르거나 `authenticatorData`(base64url·16진수)·플래그 한 바이트(`0x1d` 등)를 직접 넣음 — 또는 "내 브라우저로 직접 확인하기"로 진짜 패스키를 만들어 실제 값을 받음 | 비트 8개와 BE·BS 뜻. 같은 패스키로 다시 확인하면 지난 값과 실제로 비교해 줌 |
| 2 | 보관한 값과 비교해 대응 받기 | Step 2에서 서버가 저장한 BE·BS·"한 번이라도 백업된 적"과 지금 하려는 동작을 고름(진짜 패스키를 썼다면 자동으로 채워짐) | **통과 / 한 단계 더 확인 / 거부**, 근거 스펙 조항, 이번 로그인 뒤 저장할 값 |
| 3 | 내 서버의 빠진 단계 찾기 | Step 3에서 빠른 선택 칩(Spring Security·Keycloak·SimpleWebAuthn 예제)이나 드롭다운으로 스택을 고르고 세 질문에 답함(질문마다 기억 대신 DB·코드에서 직접 확인하는 방법도 적혀 있고, 라이브러리·응용 14개 전체 비교표도 펼쳐 볼 수 있음) | 조사한 판정, 빠진 단계, 고치는 SQL·JS |

화면 맨 아래에서 지금 상태 그대로 열리는 **공유 링크**나 Step 1~3을 정리한 **진단 리포트**(마크다운)를 복사할 수 있습니다.

## 논문의 어느 결과를 쓰나

| 앱의 규칙 | 논문 |
|---|---|
| 플래그 비트 배치(BE=0x08, BS=0x10) | 표 2 |
| `be:0, bs:1`은 보관값과 상관없이 **거부** | 2.3절 — 규격 §7.2 단계 18 |
| 보관한 BE와 지금 BE가 다르면 **거부** | 2.3절 — 규격 §7.2 단계 19 |
| BS 0→1은 막지 않고, 되돌릴 수 없는 동작에만 **한 단계 더** | 5.2절 적응형 인증 |
| BS 1→0이어도 `ever_backed_up`은 내리지 않음 | 5.2절 · 6장 |
| 보관값이 없으면 전이를 판정할 수 없다고 경고 | 4.1절 실험 A (전이 10/10에서 서버 무변화) |
| 저장 → 넘기기 → 받아 저장, 3단계 점검 | 6장 실무적 함의 첫째 |
| 라이브러리 11개의 M1~M4, 응용 3개 판정 | 표 14 · 표 16 |

## 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 뼈대 화면(애플 톤: 흰색·#F5F5F7 배경, 얇은 산세리프, 스크롤 페이드인). `app.js`·`styles.css`를 불러다 씀 |
| `app.jsx` | 화면의 원본 소스(React, JSX). 고칠 때는 이 파일을 고친다 |
| `app.js` | `app.jsx`를 미리 컴파일한 결과. 브라우저가 실제로 읽는 파일 |
| `styles.css` | Tailwind를 실제 쓰는 클래스만 담아 미리 빌드한 결과 |
| `logic.js` | 판정 규칙(논문에서 옮긴 것). 브라우저·Node 양쪽에서 씀 |
| `test.cjs` | 규칙 확인 29개 (잘못된 입력 12개 포함) |
| `vendor/` | React·React DOM 18.2.0 UMD 빌드(그대로 내려받은 것, 라이선스 헤더 포함). CDN 대신 이 폴더에서 불러 인터넷 없이도 뜨게 함 |
| `manifest.json`, `icons/` | 브라우저에서 "홈 화면에 추가·설치"가 뜨게 하는 선택 파일. 없어도 도구는 그대로 동작함 |

`app.js`·`styles.css`는 `cdn.tailwindcss.com`(Play CDN)과 브라우저 안 Babel 변환을 뺀 것이다 —
둘 다 "프로덕션에 쓰지 말라"고 자기 문서에 적어 두었고, 실제로 콘솔에 그 경고가 떴다.

## app.jsx를 고쳤을 때 다시 빌드하는 법

Node.js 18 이상이면 된다. 이 폴더 밖 아무 곳에서:

```bash
npm install -D tailwindcss@3 @babel/core @babel/cli @babel/preset-react
```

Tailwind 설정(`tailwind.config.js`, 이 저장소에는 없음 — 아래 값 그대로 새로 만든다). 색은 CSS 변수(`index.html`의 `<style>`에
`--c-bg`·`--c-ink`·`--c-inkhover`·`--c-sub`·`--c-mist`·`--c-hair`로 정의돼 있고, 다크 모드는 거기서 미디어쿼리로 값만 바꾼다)를
그대로 참조하게 해 뒀다 — 이래야 화면 코드(`bg-white`·`text-ink` 등)를 하나도 안 고치고 다크 모드가 걸린다:

```js
function v(name) {
  return ({ opacityValue }) => opacityValue === undefined ? `rgb(var(${name}))` : `rgb(var(${name}) / ${opacityValue})`;
}
module.exports = {
  content: ["<app.jsx 경로>", "<index.html 경로>"],
  theme: { extend: {
    colors: { white: v('--c-bg'), ink: v('--c-ink'), inkhover: v('--c-inkhover'), sub: v('--c-sub'), mist: v('--c-mist'), hair: v('--c-hair') },
    fontFamily: {
      sans: ['-apple-system','BlinkMacSystemFont','"SF Pro Display"','"Pretendard Variable"','Pretendard','"Apple SD Gothic Neo"','"Malgun Gothic"','sans-serif'],
      mono: ['"SF Mono"','ui-monospace','Menlo','Consolas','monospace'],
    },
  } },
};
```

빌드:

```bash
npx tailwindcss -i input.css -o styles.css --minify   # input.css: @tailwind base; @tailwind components; @tailwind utilities;
npx babel app.jsx --presets="[[\"@babel/preset-react\",{\"runtime\":\"classic\"}]]" -o app.js
```

`--presets` 인용부호가 셸에서 깨지면 `babel.config.json`에 `{"presets":[["@babel/preset-react",{"runtime":"classic"}]]}`를 적고
`npx babel app.jsx --config-file ./babel.config.json -o app.js`로 대신한다. `runtime: classic`이 꼭 있어야
CDN의 전역 `React`를 그대로 쓰는 코드가 나온다(기본값인 automatic은 모듈 import를 넣어서 브라우저에서 그냥 안 돌아간다).

## 데이터와 비밀값

- 예시 `authenticatorData`는 만든 값입니다(RP ID 해시 = `"passkey.example"`의 SHA-256, 서명 카운터 7).
- 실제 사용자 자료, 다른 사람의 이름, API 키·토큰·비밀번호가 없습니다. 환경 변수도 쓰지 않습니다.
- 주소창의 쿼리스트링(공유 링크)에는 지금 화면의 입력값·BE·BS·동작·고른 스택만 실립니다. 진짜 패스키 자체(개인키·서명)는 기기 밖으로 나가지 않으므로 URL에도 안 실립니다.
- "같은 패스키로 다시 인증해서 보기"가 기억하는 지난 값(BE·BS·처음 본 날)은 `localStorage`에 credential id로만 묶여 이 브라우저에만 남습니다. "기억해 둔 지난 값 지우기"로 언제든 지울 수 있고, 서버로는 애초에 전송되지 않습니다.

## 한계 (논문 5.1·5.4절)

- BE/BS는 인증장치가 스스로 신고하는 값입니다. 이 앱은 정직한 인증장치의 상태 변화를 놓치지 않기 위한 것이지, 값을 위장하는 공격자를 잡는 도구가 아닙니다.
- 라이브러리·응용 판정은 2026-09-11 소스를 읽어 얻은 것입니다. 실행해 측정한 것은 논문 실험 A의 시스템 하나입니다.

## 다시 배포할 때

이 폴더는 저장소와 연결되지 않은 Vercel 프로젝트 `aleph-bs-check`로 올렸습니다(저장소 최상위가 배포되는 사고를 피하려고). 고친 뒤에는 이 폴더의 `index.html`·`app.js`·`styles.css`·`logic.js`·`manifest.json`·`icons/`·`vendor/`를 저장소 밖 임시 폴더에 복사하고(`app.jsx`는 소스일 뿐이라 배포에는 필요 없음), 그 폴더에서 `npx vercel --prod --yes`를 실행합니다. 생기는 `.vercel/`은 저장소에 넣지 않습니다.
