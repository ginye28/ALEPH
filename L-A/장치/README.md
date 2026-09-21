# 계속 새로 쓰는 장치

새 기록을 넣고 한 번 돌리면 사이트의 **숫자 칸**과 **능력별 문단 후보**를 다시 만듭니다.
후보에는 날짜와 근거 칸이 붙고, `approved.json`에 넣어 **승인한 것만** 사이트에 들어갑니다.
시각·난수·AI 호출을 쓰지 않으므로 같은 입력이면 같은 결과가 나옵니다(`out/SHA256SUMS`로 비교).

필요한 것: Node.js 18 이상. 설치할 패키지는 없습니다.

## 돌리는 방법 (세 단계)

1. `input/` 에 새 파일을 넣습니다.
   - `ritual-history-YYYY-MM-DD.txt` — 플랫폼 「내 리추얼 기록」에서 TXT로 담은 것(날짜가 가장 늦은 파일을 씁니다)
   - `attendance.json` — 「내 출석 기록」 숫자 (모르는 칸은 `null`)
   - `tasks.json` — 「내 제출 현황」을 보고 과제마다 `status`를 `"제출"` / `"예정"` / `null`로
2. 이 폴더에서 실행합니다.
   ```bash
   node refresh.mjs
   ```
   `out/candidates.md`를 열어 마음에 드는 후보의 `id`를 `approved.json`의 해당 능력 칸에 넣습니다.
3. 사이트에 반영합니다.
   ```bash
   node refresh.mjs --apply
   ```
   `../site/index.html`의 자동 구역 두 곳(`AUTO-HERO`, `AUTO`)만 다시 씁니다. 나머지는 건드리지 않습니다.
   ZIP만 받아 `site/` 폴더가 옆에 없으면 반영은 건너뛰고 `out/`만 만듭니다.
   공개 사이트(https://aleph-intro.vercel.app)에 올리려면 `site/` 폴더에서 `npx vercel --prod --yes`.

## 결과 (`out/`)

| 파일 | 내용 |
|---|---|
| `numbers.json` | 숫자 칸 원자료 — 출처·기간·빠진 평일·흔들린 날과 복귀일 |
| `candidates.md` / `.json` | 능력(자기조절력·대인관계력·자기동기력)별 후보 문장, 날짜·근거 칸 |
| `site-block.html` | 사이트 「숫자로 보면」 구역 |
| `hero-block.html` | 첫 화면 숫자 띠(출석, 약속을 지킨 저녁) |
| `SHA256SUMS` | 위 네 파일의 해시 — 두 번 돌려 이 파일이 같으면 결과가 같은 것 |

## 이름 가리기

플랫폼이 이름 칸은 `(이름 가림)`으로 바꿔 주지만 본문에만 적은 이름은 남을 수 있습니다.
가릴 이름을 `mask-names.local.json`(예: `["홍길동"]`)에 적으면 후보 문장에서 가립니다.
이 파일에는 실명이 들어가므로 **ZIP·저장소에 넣지 않습니다**(`.gitignore`에 등록).
