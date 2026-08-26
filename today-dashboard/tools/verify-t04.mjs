/**
 * T04 조건 자체 검사기.
 *
 * 두 가지를 한 번에 확인합니다.
 *   1. 공개 자산 17개의 SHA-256이 asset-manifest.json과 일치하는가
 *   2. fixture 9종을 계약 순서대로 재생했을 때 각 fixture의 expected와 실제 상태가 같은가
 *
 *   node today-dashboard/tools/verify-t04.mjs
 *
 * 앱과 같은 모듈(src/replay/evaluationState.js)을 씁니다 — 검사기용 사본을 따로 두면
 * 검사만 통과하고 화면은 다르게 동작하는 일이 생깁니다.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
    resetEvaluationState,
    runFixture,
    validateStatus,
} from "../src/replay/evaluationState.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PKG = path.join(ROOT, "t04-real-information-board-public-v1");
const APP_FIXTURES = path.join(ROOT, "today-dashboard", "src", "replay", "fixtures");

const problems = [];
const ok = (text) => console.log(`  PASS  ${text}`);
const bad = (text) => {
    console.log(`  FAIL  ${text}`);
    problems.push(text);
};

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// ───────────────────────────────────────── 1. 자산 무결성
console.log("\n1. 공개 자산 SHA-256 (asset-manifest.json 대조)");

const manifest = JSON.parse(fs.readFileSync(path.join(PKG, "asset-manifest.json"), "utf-8"));
const entries = manifest[Object.keys(manifest).find((k) => Array.isArray(manifest[k]))];

let matched = 0;
for (const entry of entries) {
    const rel = entry.path ?? entry.file ?? entry.name;
    const want = String(entry.sha256 ?? entry.hash ?? "").toLowerCase();
    const file = path.join(PKG, rel);
    if (!fs.existsSync(file)) {
        bad(`자산 없음 — ${rel}`);
        continue;
    }
    if (sha256(file) === want) matched += 1;
    else bad(`해시 불일치 — ${rel}`);
}
if (matched === entries.length) ok(`자산 ${matched}개 전부 일치`);

// 앱에 묶어 둔 사본이 원본과 같은지. 다르면 화면이 다른 입력으로 재생하게 됩니다.
console.log("\n2. 앱에 묶인 fixture 사본이 원본과 같은가");
let same = 0;
for (const name of fs.readdirSync(APP_FIXTURES)) {
    const origin = path.join(PKG, "fixtures", name);
    if (sha256(origin) === sha256(path.join(APP_FIXTURES, name))) same += 1;
    else bad(`사본 불일치 — src/replay/fixtures/${name}`);
}
if (same === 9) ok("fixture 9종 사본 전부 원본과 동일");

// ───────────────────────────────────────── 3. 상태 전이
const load = (id) => {
    const file = fs
        .readdirSync(APP_FIXTURES)
        .map((n) => JSON.parse(fs.readFileSync(path.join(APP_FIXTURES, n), "utf-8")))
        .find((f) => f.fixture_id === id);
    if (!file) throw new Error(`fixture 없음: ${id}`);
    return file;
};

/** 한 순서를 재생하고 마지막 fixture의 expected와 대조합니다. */
const replay = (title, ids) => {
    let state = resetEvaluationState();
    ids.forEach((id) => {
        state = runFixture(state, load(id));
    });

    const last = load(ids[ids.length - 1]);
    const want = last.expected;
    const got = {
        freshness: state.status.freshness,
        error_code: state.status.error_code,
        row_count: state.daily_readings.length,
        stored_value: state.current_reading ? state.current_reading.normalized_value : null,
    };

    const diffs = [];
    if (got.freshness !== want.freshness) diffs.push(`freshness ${got.freshness}≠${want.freshness}`);
    if (got.error_code !== want.error_code) diffs.push(`error_code ${got.error_code}≠${want.error_code}`);
    if (got.row_count !== want.row_count) diffs.push(`row_count ${got.row_count}≠${want.row_count}`);
    if (want.stored_value !== undefined && got.stored_value !== want.stored_value) {
        diffs.push(`stored_value ${got.stored_value}≠${want.stored_value}`);
    }
    if (!validateStatus(state.status)) diffs.push("status가 스키마 위반");

    if (diffs.length === 0) {
        ok(`${title} → ${got.freshness}/${got.error_code} · 행 ${got.row_count} · 값 ${got.stored_value}`);
    } else {
        bad(`${title} — ${diffs.join(" · ")}`);
    }
    return state;
};

console.log("\n3. 정상·일별 저장 (C20 · C21)");
const success = replay("D1-A → D1-B → D2", ["T04-NORMAL-D1-A", "T04-NORMAL-D1-B", "T04-NORMAL-D2"]);

{
    // 같은 날 두 번은 한 행으로 합쳐지고 record_id가 유지돼야 합니다.
    let s = resetEvaluationState();
    s = runFixture(s, load("T04-NORMAL-D1-A"));
    const firstId = s.daily_readings[0].record_id;
    s = runFixture(s, load("T04-NORMAL-D1-B"));
    if (s.daily_readings.length === 1 && s.daily_readings[0].record_id === firstId) {
        ok(`C20 같은 날 재실행 → 행 1건, record_id 유지 (${firstId})`);
    } else {
        bad(`C20 같은 날 재실행 — 행 ${s.daily_readings.length}건, record_id 바뀜`);
    }
    if (success.daily_readings.length === 2) ok("C21 다음 날짜 → 새 행 생성");
    else bad(`C21 다음 날짜 — 행 ${success.daily_readings.length}건`);

    const cmp = success.last_comparison;
    if (cmp.state === "comparable" && cmp.magnitude === 15) {
        ok(`전일 대비 재계산 → ${cmp.direction} ${cmp.magnitude} ${cmp.unit}`);
    } else {
        bad(`전일 대비 — ${JSON.stringify(cmp)}`);
    }
}

console.log("\n4. 실패 5종 (C12~C16 · C17 · C18)");
const BASELINE = ["T04-NORMAL-D1-A", "T04-NORMAL-D1-B"];
const seen = new Set();
for (const id of ["T04-TIMEOUT", "T04-AUTH-401", "T04-RATE-429", "T04-OFFLINE", "T04-SCHEMA-BREAK"]) {
    const state = replay(id, [...BASELINE, id]);
    seen.add(state.status.error_code);
    // C17 — 실패가 마지막 정상값과 행을 지우지 않았는가
    if (state.current_reading?.normalized_value !== 105 || state.daily_readings.length !== 1) {
        bad(`C17 ${id} — 마지막 정상값/행이 보존되지 않음`);
    }
}
if (seen.size === 5) ok(`C12~C16 실패 5종이 서로 다른 error_code (${[...seen].join(", ")})`);
else bad(`실패 종류가 겹침 — ${[...seen].join(", ")}`);

console.log("\n5. 오류 뒤 회복 (C19)");
{
    let state = resetEvaluationState();
    [...BASELINE, "T04-TIMEOUT"].forEach((id) => {
        state = runFixture(state, load(id));
    });
    const before = {
        freshness: state.status.freshness,
        error_code: state.status.error_code,
        rows: state.daily_readings.length,
        value: state.current_reading.normalized_value,
    };
    if (before.freshness === "stale" && before.error_code === "timeout" && before.rows === 1 && before.value === 105) {
        ok("복구 전 — stale/timeout · 행 1건 · 마지막 정상값 105");
    } else {
        bad(`복구 전 상태가 다름 — ${JSON.stringify(before)}`);
    }

    state = runFixture(state, load("T04-RECOVER-D2"));
    const added = state.daily_readings.filter((r) => r.record_date === "2026-08-25");
    if (
        state.status.freshness === "fresh" &&
        state.status.error_code === "none" &&
        state.daily_readings.length === 2 &&
        added.length === 1 &&
        state.current_reading.normalized_value === 120
    ) {
        ok("복구 후 — fresh/none · 행 2건 · 2026-08-25 신규 1건 · 값 120");
    } else {
        bad(
            `복구 후 상태가 다름 — ${state.status.freshness}/${state.status.error_code} · 행 ${state.daily_readings.length} · 신규 ${added.length} · 값 ${state.current_reading.normalized_value}`,
        );
    }
}

// ───────────────────────────────────────── 결과
console.log("\n─────────────────────────────");
if (problems.length === 0) {
    console.log("전부 통과");
    process.exit(0);
}
console.log(`실패 ${problems.length}건`);
problems.forEach((p) => console.log(`  - ${p}`));
process.exit(1);
