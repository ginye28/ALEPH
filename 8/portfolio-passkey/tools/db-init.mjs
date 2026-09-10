/**
 * 스키마를 한 번 적용한다.
 *
 *   DATABASE_URL=... node portfolio-passkey/tools/db-init.mjs
 *   (또는 portfolio-passkey/.env 에 DATABASE_URL을 넣어 두고 `npm run db:init`)
 *
 * db/schema.sql은 전부 `create ... if not exists` / `add column if not exists`라
 * 여러 번 돌려도 같은 결과가 됩니다. 접속 문자열은 화면에 찍지 않습니다.
 */

import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const PROJECT = path.resolve(import.meta.dirname, "..");

// .env 파일이 있으면 읽어 온다 (아주 단순한 파서 — KEY=VALUE 한 줄씩).
const envFile = path.join(PROJECT, ".env");
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
    }
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
    console.error("DATABASE_URL이 없습니다. Vercel의 Neon 연동에서 받은 값을 넣어 주세요.");
    console.error("  예) portfolio-passkey/.env 에 DATABASE_URL=... 한 줄");
    process.exit(1);
}

const sql = neon(url);
const schema = fs.readFileSync(path.join(PROJECT, "db", "schema.sql"), "utf8");

// 주석을 걷어내고 세미콜론 단위로 나눈다 (이 스키마에는 함수 본문 같은 게 없어 안전하다).
const statements = schema
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

console.log(`${statements.length}개 문장을 적용합니다…`);
for (const statement of statements) {
    const label = statement.replace(/\s+/g, " ").slice(0, 70);
    try {
        await sql.query(statement);
        console.log(`  ✓ ${label}…`);
    } catch (error) {
        console.error(`  ✗ ${label}…\n    ${error.message}`);
        process.exit(1);
    }
}

const tables = await sql`select table_name from information_schema.tables
                         where table_schema = 'public' and table_name like 'pk_%'
                         order by table_name`;
console.log(`\n완료. 만들어진 표: ${tables.map((t) => t.table_name).join(", ")}`);
