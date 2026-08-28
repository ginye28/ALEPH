# 인계 — 비교 기준 고르기

## 목표

사용자가 날짜별 기록에서 한 건을 누르면, 그 날짜가 비교 기준이 되고 차이·방향·단위가 즉시 다시 계산된다.
정해진 검사 10개를 모두 통과시키면 끝이다. 검사 목록은 `handoff/worklog.json`의 `checks`에 있다.

## 현재 상태

- 검사 **10개 전부 통과**. `npm run lint` 경고 0건
- AI A가 8개까지(1·2·3·4·5·8·9·10) 하고 계획대로 중단, **AI B가 이 문서만 받아 6·7을 완성**
- 바뀐 파일
  - `src/core/selectPair.js` (신규) — 비교할 두 기록을 고르는 순수 함수
  - `src/pages/Dashboard/Dashboard.jsx` — `baseKey` 상태, `selectPair` → `computeDiff` 연결,
    `applyHistory()`가 기록 갱신 시점에 사라진 선택을 정리 (검사 7)
  - `src/components/HistoryList/` — 기록 행을 버튼으로, 선택은 `aria-pressed`,
    기록이 2건 미만이면 `disabled` (검사 6)
  - `src/components/DiffCard/` — 기능 이름·사용 방법·선택 날짜·`선택 해제` 버튼
- `src/core/computeDiff.js`는 **변경 없음**
- 마지막 검사 기록: 저장소 루트 `검사 기록/` 안의 가장 최근 JSON

**인계 시점 원본** — 이 문서를 AI B에게 넘겼을 때의 원본은 커밋 `e8b7978`에 있다.
당시 이 저장소는 `today-dashboard/` 경로 아래에 있었고, 그 뒤 `handoff-lab/`로 옮겼다
(과제 4와 과제 5를 같은 저장소 안에서 폴더로 분리하기 위해서). 그 커밋을 열면 파일이
`today-dashboard/HANDOFF.md`에 있다 — 경로만 다를 뿐 내용은 같다.

**현재 버전** — 이 문서가 설명하는 저장소 상태는 커밋 `ab73191`이다.
위 내용은 완성한 뒤 갱신한 것이다.

## 실행 명령

```
cd handoff-lab
npm install
npm run dev
```

개발 서버는 <http://localhost:5175> 에 열린다. 다른 창에서 검사를 돌린다.

```
node handoff-lab/tools/check.mjs
```

번호별 `PASS`/`FAIL`과 이유가 출력된다. `--json`을 붙이면 `검사 기록/`에 결과가 남는다.
공개 주소를 검사하려면 `BOARD_URL=https://aleph-daup.vercel.app`을 앞에 붙인다
(`aleph-dash`는 과제 4 주소이니 혼동하지 말 것 — 이름이 비슷하다).

`npm run lint`는 경고 0건이어야 한다.

## 통과한 검사

`1` 기본 비교 = 최신 2건 · `2` 지난 날짜 선택 → 재계산 · `3` 선택 표시 이동 · `4` 선택 해제 →
기본 복귀 · `5` 같은 날짜 선택 시 사유 문구 · `6` 기록 1건이면 행 비활성 · `7` 사라진 선택 자동 해제 ·
`8` 장애 5종 후 선택 유지 · `9` 재실행 중복 없음 · `10` 09시 기준·배지·출처 링크

## 남은 문제

검사에서 남은 항목은 없다. 공개 주소 <https://aleph-daup.vercel.app> 에서도 10개 전부 통과했다.

앞으로 주의할 것은 하나뿐이다 — **과제 4와 같은 저장소를 쓰되 폴더와 배포가 다르다.**
`today-dashboard/`(과제 4)는 제출 증거라 건드리면 안 된다. 이 저장소에서 과제 5는
`handoff-lab/` 안에서만 작업한다.

| 과제 | 폴더 | 공개 주소 |
|---|---|---|
| 4 | `today-dashboard/` | <https://aleph-dash.vercel.app> |
| 5 | `handoff-lab/` | <https://aleph-daup.vercel.app> |

## 다음 행동

이어받는 사람이 화면을 바꿨다면 아래 순서로 확인하고 배포한다.

1. `node handoff-lab/tools/check.mjs`로 10개 전부 `PASS` 확인 (회귀 8·9·10 포함)
2. `git push` — Vercel이 `handoff-lab`을 자동 배포한다
3. 배포 뒤 공개 주소로 증빙과 보고서를 다시 만든다 —
   `BOARD_URL=https://aleph-daup.vercel.app node tools/capture-t05.mjs` 다음 `node tools/report-t05.mjs`

## 건드리면 안 되는 부분

- `src/core/computeDiff.js` — 회귀 검사 8·9·10의 근거. 계산식을 다른 파일로 옮기거나 시그니처를
  바꾸지 말 것. 선택 기능은 **입력을 바꾸는 방식**으로만 붙인다.
- `src/storage/history.js` — 저장 키(`providerKey:dateKey`)와 "저장 전에 먼저 읽는" 순서.
  과제 4의 통과 기준이고 검사 9가 이걸 본다.
- 선택 상태를 `localStorage`에 저장하지 말 것 — 주소를 새로 열면 항상 기본(최신 2건) 비교여야 한다.
- `handoff/worklog.json`의 `caps` — 작업 중에 상한을 바꾸면 두 AI 비교가 무효가 된다.
