아래 내용만 보고 남은 작업을 이어서 해주세요. 이전 대화 기록은 없습니다.
문서에 없는 내용은 추측하지 말고 저에게 물어봐 주세요.

**시작 전에 세 가지만 먼저 답해주세요. 답을 확인한 뒤에 코드를 고칩니다.**

1. 이 작업의 목표를 한 문장으로 말해보세요.
2. 지금 실패하는 검사 번호와 각각의 원인 추정은?
3. 건드리면 안 되는 파일은 무엇이고 왜인가요?

**규칙 3개**

- 고쳐야 할 것은 검사 6번과 7번, 두 개뿐입니다. 나머지 8개는 이미 통과 중이니 깨지지 않게 해주세요.
- 아래 "건드리면 안 되는 부분"에 적힌 파일은 수정하지 마세요.
- 파일 전체를 다시 쓰지 말고 **바뀐 부분만** 보여주세요.

---

# 인계 — 비교 기준 고르기

## 목표

사용자가 날짜별 기록에서 한 건을 누르면, 그 날짜가 비교 기준이 되고 차이·방향·단위가 즉시 다시 계산된다.
정해진 검사 10개를 모두 통과시키면 끝이다.

## 현재 상태

- 검사 **8개 통과 (1·2·3·4·5·8·9·10)** / **2개 실패 (6·7)**
- 바뀐 파일
  - `src/core/selectPair.js` (신규) — 비교할 두 기록을 고르는 순수 함수
  - `src/pages/Dashboard/Dashboard.jsx` — `baseKey` 상태, `selectPair` → `computeDiff` 연결
  - `src/components/HistoryList/` — 기록 행을 버튼으로, 선택은 `aria-pressed`
  - `src/components/DiffCard/` — 기능 이름·사용 방법·선택 날짜·`선택 해제` 버튼
- `src/core/computeDiff.js`는 변경 없음

## 실행 명령

```
cd handoff-lab
npm install
npm run dev
```

개발 서버는 http://localhost:5175 에 열린다. 다른 창에서 검사를 돌린다.

```
node handoff-lab/tools/check.mjs
```

번호별 `PASS`/`FAIL`과 이유가 출력된다. `npm run lint`는 경고 0건이어야 한다.

## 통과한 검사

`1` 기본 비교 = 최신 2건 · `2` 지난 날짜 선택 → 재계산 · `3` 선택 표시 이동 · `4` 선택 해제 →
기본 복귀 · `5` 같은 날짜 선택 시 사유 문구 · `8` 장애 5종 후 선택 유지 · `9` 재실행 중복 없음 ·
`10` 09시 기준·배지·출처 링크

## 남은 문제

- **검사 6** — 기록이 1건뿐일 때도 기록 행을 누를 수 있다. 비교가 불가능한 상태이므로 행이 비활성이어야 한다.
  재현: `http://localhost:5175/?fail=auth` + 저장소에 기록 1건만 두기
  (검사 실행기가 자동으로 만든다. 판정 조건은 "행이 `button`이 아니거나 `disabled`" + "2건 이상 필요하다는 문구가 보임")
- **검사 7** — 선택한 날짜가 기록에서 사라져도 선택 상태가 남는다. 점검 도구의 `기록 비우기` 뒤
  `다시 확인`을 누르면 사라졌던 선택이 되살아난다. `selectPair()`는 이미 `reason: "vanished"`를
  돌려주지만 **화면 상태에 연결되어 있지 않다.**

## 다음 행동

1. `Dashboard.jsx`에서 `selection.reason === "vanished"`일 때 `baseKey`를 비운다 (검사 7)
2. `HistoryList`에 "고를 수 있는 상태인지" 여부를 넘겨 기록이 2건 미만이면 행을 버튼이 아닌 채로
   두거나 `disabled` 처리한다 (검사 6)
3. `node tools/check.mjs`로 10개 전부 `PASS` 확인 — 특히 회귀 8·9·10을 매번 함께 확인한다

## 건드리면 안 되는 부분

- `src/core/computeDiff.js` — 회귀 검사 8·9·10의 근거. 계산식을 다른 파일로 옮기거나 시그니처를
  바꾸지 말 것. 선택 기능은 **입력을 바꾸는 방식**으로만 붙인다.
- `src/storage/history.js` — 저장 키(`providerKey:dateKey`)와 "저장 전에 먼저 읽는" 순서.
  과제 4의 통과 기준이고 검사 9가 이걸 본다.
- 선택 상태를 `localStorage`에 저장하지 말 것 — 주소를 새로 열면 항상 기본(최신 2건) 비교여야 한다.

---

# 관련 코드

저장소를 직접 열 수 있으면 아래 대신 실제 파일을 보세요. (`C:\gov\ALEPH\today-dashboard`)

## src/core/selectPair.js — 전체

```js
export const selectPair = (records, baseKey) => {
    if (!Array.isArray(records) || records.length < 2) {
        return { pair: records ?? [], selected: null, reason: null };
    }

    const [latest] = records;

    // 아무것도 고르지 않았으면 최신 2건을 비교합니다.
    if (!baseKey) {
        return { pair: [latest, records[1]], selected: null, reason: null };
    }

    // 자기 자신과의 비교는 차이 0으로 꾸미지 않고 이유를 돌려줍니다.
    if (baseKey === latest.dateKey) {
        return { pair: [], selected: baseKey, reason: "sameDate" };
    }

    const base = records.find((record) => record.dateKey === baseKey);

    // 고른 날짜가 기록에서 사라진 경우.
    if (!base) {
        return { pair: [latest, records[1]], selected: null, reason: "vanished" };
    }

    return { pair: [latest, base], selected: baseKey, reason: null };
};
```

## src/pages/Dashboard/Dashboard.jsx — 발췌

```jsx
function Dashboard() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [history, setHistory] = useState(() => loadHistory());
    const [notes, setNotes] = useState([]);
    const [lastMode, setLastMode] = useState(initialFailureMode);
    const [toolsOpen, setToolsOpen] = useState(isDebugRequested);

    // 사용자가 고른 비교 기준 날짜. 저장소에 넣지 않습니다.
    const [baseKey, setBaseKey] = useState(null);

    /* ... 조회·저장 로직 (이 작업과 무관) ... */

    const status = useMemo(() => describeStatus(state), [state]);

    // 선택 → 계산 순서로 둡니다. computeDiff는 건드리지 않고 입력만 바꿉니다.
    const selection = useMemo(() => selectPair(history, baseKey), [history, baseKey]);

    const diff = useMemo(() => {
        if (selection.reason === "sameDate") {
            return { ok: false, reason: "같은 날짜끼리는 비교하지 않습니다. 다른 날짜를 고르세요." };
        }
        return computeDiff(selection.pair, provider.digits);
    }, [selection]);

    const handleClear = () => {
        setHistory(clearHistory());
        setNotes(["기록을 비웠습니다. 다시 확인을 누르면 오늘 기록부터 새로 저장됩니다."]);
    };

    return (
        <main css={s.page}>
            {/* ... 헤더 · 현재값 카드 ... */}

            <DiffCard
                diff={diff}
                digits={provider.digits}
                selectedKey={selection.selected}
                onClearSelection={() => setBaseKey(null)}
            />

            <HistoryList
                records={history}
                digits={provider.digits}
                notes={notes}
                selectedKey={selection.selected}
                onSelect={setBaseKey}
            />

            {/* ... 인계 문서 · 작업 기록 표 · 점검 도구 ... */}
        </main>
    );
}
```

## src/components/HistoryList/HistoryList.jsx — 전체

```jsx
import * as c from "../../styles/controls";
import { formatValue } from "../../utils/format";
import { REFERENCE_HOUR, formatStamp } from "../../utils/timezone";
import * as s from "./styles";

const ORIGIN_LABEL = {
    live: "직접 조회",
    backfill: "출처의 지난 기록",
};

function HistoryList({ records, digits, notes, selectedKey, onSelect }) {
    return (
        <section css={c.panel}>
            <div css={c.panelHead}>
                <h2 css={c.panelTitle}>날짜별 기록</h2>
                <span css={c.panelHint}>하루 한 건 · 매일 {REFERENCE_HOUR}시 값 · 누르면 비교 기준</span>
            </div>

            {records.length === 0 ? (
                <p css={s.empty}>아직 저장된 기록이 없습니다.</p>
            ) : (
                <ul css={s.list} aria-label="날짜별 기록">
                    {records.map((record) => {
                        const selected = record.dateKey === selectedKey;

                        return (
                            <li key={`${record.providerKey}:${record.dateKey}`}>
                                <button
                                    type="button"
                                    css={s.row(selected)}
                                    aria-pressed={selected}
                                    onClick={() => onSelect(record.dateKey)}>
                                    <span css={s.date}>{record.dateKey}</span>
                                    <span css={s.value}>
                                        {formatValue(record.value, digits)}
                                        <small>{record.unit}</small>
                                    </span>
                                    <span css={s.origin(record.origin)}>
                                        {ORIGIN_LABEL[record.origin]}
                                    </span>
                                    <span css={s.fetched}>{formatStamp(record.fetchedAt)} 조회</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {notes.length > 0 && (
                <ul css={s.notes}>
                    {notes.map((note) => (
                        <li key={note}>{note}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default HistoryList;
```

## src/components/HistoryList/styles.js — 행 스타일 부분

```js
export const list = css`
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    overflow: hidden;

    & > li + li {
        border-top: 1px solid var(--line-soft);
    }
`;

/** 기록 행은 누를 수 있습니다 — 누른 날짜가 비교 기준이 됩니다. */
export const row = (selected) => css`
    display: grid;
    grid-template-columns: 104px 96px auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 13px;
    text-align: left;
    background: ${selected ? "var(--accent-bg)" : "var(--surface-2)"};
    box-shadow: ${selected ? "inset 3px 0 0 var(--accent)" : "none"};
    transition: background 0.15s ease;

    &:hover {
        background: ${selected ? "var(--accent-bg)" : "var(--surface)"};
    }

    @media (max-width: 560px) {
        grid-template-columns: 104px 96px auto;

        & > :last-child {
            grid-column: 1 / -1;
        }
    }
`;
```
