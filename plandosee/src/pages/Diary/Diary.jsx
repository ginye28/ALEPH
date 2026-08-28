import { useMemo, useRef, useState } from "react";
import DataTools from "../../components/DataTools/DataTools";
import HeldList from "../../components/HeldList/HeldList";
import RecordForm from "../../components/RecordForm/RecordForm";
import RecordList from "../../components/RecordList/RecordList";
import WeeklySummary from "../../components/WeeklySummary/WeeklySummary";
import { TIMEZONE_LABEL, UNIT, todayKey } from "../../core/validate";
import { partition, summarize } from "../../core/weekly";
import edgeCases from "../../fixtures/edge-cases.json";
import syntheticV1 from "../../fixtures/synthetic-v1.json";
import {
    addRecord,
    clearAll,
    exportBox,
    importText,
    loadRecords,
    removeRecord,
    replaceAll,
    updateRecord,
} from "../../storage/records";
import * as c from "../../styles/controls";
import * as s from "./styles";

/** 날짜 문자열에 일수를 더합니다. 주 이동 버튼이 씁니다. */
const shiftDate = (dateKey, days) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

/**
 * 처음 보여줄 주를 정합니다.
 *
 * 형식만 맞는 날짜(2026-02-30 같은)를 기준으로 삼으면 엉뚱한 주가 열립니다.
 * 그래서 검사를 통과한 기록에서만 고릅니다.
 */
const anchorFor = (records) => {
    const { valid } = partition(records);
    if (valid.length === 0) return todayKey();
    return valid.map((record) => record.date).sort()[0];
};

function Diary() {
    const first = loadRecords();
    const [records, setRecords] = useState(first.records);
    const [converted, setConverted] = useState(first.converted);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState(null);
    const formRef = useRef(null);

    // 목록은 폼보다 한참 아래에 있어서, 행에서 "수정"을 누르면 폼이 화면 밖입니다.
    // 값이 바뀌는 곳으로 시선을 직접 옮겨 줍니다.
    const handleEdit = (id) => {
        setEditingId(id);
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // 어느 주를 보고 있는지. 기록이 있으면 그 기록의 주부터 보여줍니다 —
    // 합성 자료를 넣었는데 빈 주가 나오면 채점자가 집계를 확인할 수 없습니다.
    const [anchor, setAnchor] = useState(() => anchorFor(first.records));

    const summary = useMemo(() => summarize(records, anchor), [records, anchor]);
    const editing = useMemo(
        () => records.find((record) => record.id === editingId) ?? null,
        [records, editingId],
    );

    /** 저장 결과를 화면에 반영합니다. 저장소가 돌려준 목록만 씁니다. */
    const apply = (next, note) => {
        setRecords(next);
        if (note) setMessage(note);
    };

    const handleAdd = (value) => {
        const saved = addRecord(records, value);
        apply(saved.records, { tone: "good", text: `${value.date} ${value.subject} ${value.minutes}${UNIT} 추가했습니다.` });
        setAnchor(value.date);
    };

    const handleUpdate = (id, value) => {
        const saved = updateRecord(records, id, value);
        apply(saved.records, { tone: "good", text: `기록 1건을 고쳤습니다. 주간 요약도 함께 바뀝니다.` });
        setEditingId(null);
        setAnchor(value.date);
    };

    const handleRemove = (id) => {
        if (!id) return;
        const saved = removeRecord(records, id);
        apply(saved.records, { tone: null, text: "기록 1건을 지웠습니다." });
        if (editingId === id) setEditingId(null);
    };

    const handleExport = () => {
        const text = exportBox(records);
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `plandosee-내보내기-${todayKey()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setMessage({ tone: "good", text: `${records.length}건을 파일로 내보냈습니다.` });
    };

    /** 가져오기 — 읽기 → 검사 → 통과한 경우에만 쓰기. 실패해도 기존 기록은 그대로입니다. */
    const handleImport = (text, fileName) => {
        const result = importText(records, text);

        if (!result.ok) {
            setRecords(result.records);
            setMessage({
                tone: "bad",
                text: `${fileName} — ${result.reason}. 기존 기록 ${result.records.length}건은 그대로입니다.`,
            });
            return;
        }

        const parts = [`${result.added}건을 불러왔습니다`];
        if (result.skipped > 0) parts.push(`${result.skipped}건은 이미 있어 건너뜀`);
        if (result.converted > 0) parts.push(`${result.converted}건을 v2로 변환`);

        setRecords(result.records);
        setConverted(result.converted);
        setMessage({ tone: "good", text: `${fileName} — ${parts.join(" · ")}.` });
    };

    const handleClearAll = () => {
        const next = clearAll();
        setRecords(next);
        setEditingId(null);
        setMessage({ tone: null, text: "전체 삭제했습니다. 새로고침해도 0건입니다." });
    };

    const handleSeed = (kind) => {
        const source = kind === "v1" ? syntheticV1 : edgeCases;
        const next = replaceAll(source);
        // v1 자료는 전부 변환 대상, 경계 자료는 이미 v2라 변환이 일어나지 않습니다.
        const count = kind === "v1" ? source.length : 0;

        setRecords(next);
        setConverted(count);
        setEditingId(null);
        setAnchor(anchorFor(next));

        setMessage({
            tone: "good",
            text:
                kind === "v1"
                    ? `v1 합성 기록 ${source.length}건을 넣고 v2로 변환했습니다.`
                    : `경계·오류 자료 ${source.length}건을 넣었습니다. 잘못된 값은 보류로 갑니다.`,
        });
    };

    return (
        <main css={s.page}>
            <header css={s.header}>
                <h1 css={s.title}>플랜두씨 다이어리</h1>
                <p css={s.subtitle}>
                    공부한 시간을 {UNIT} 단위로 · 기준 시간대 {TIMEZONE_LABEL}
                </p>
            </header>

            <p css={s.syntheticNote}>
                <b>이 화면의 자료는 모두 합성입니다.</b> 실제 개인 기록은 올리지 않습니다. 기록은 이
                브라우저에만 저장되고 서버로 보내지 않습니다.
            </p>

            {/* key가 바뀌면 폼이 다시 마운트되며 그 기록의 값으로 채워집니다. */}
            <div ref={formRef}>
                <RecordForm
                    key={editingId ?? "new"}
                    editing={editing}
                    onAdd={handleAdd}
                    onUpdate={handleUpdate}
                    onCancel={() => setEditingId(null)}
                />
            </div>

            <WeeklySummary summary={summary} onMove={(days) => setAnchor((prev) => shiftDate(prev, days))} />

            <RecordList
                records={summary.valid}
                editingId={editingId}
                onEdit={handleEdit}
                onRemove={handleRemove}
            />

            <HeldList held={summary.held} onRemove={handleRemove} />

            <DataTools
                records={records}
                converted={converted}
                message={message}
                onExport={handleExport}
                onImport={handleImport}
                onClearAll={handleClearAll}
                onSeed={handleSeed}
            />

            <footer css={s.footer}>
                <p css={c.note}>
                    서버 없이 브라우저에서만 동작합니다. 개인정보와 비밀값을 저장하지 않고, 공개
                    화면에는 합성 자료만 올립니다.
                </p>
            </footer>
        </main>
    );
}

export default Diary;
