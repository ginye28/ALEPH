/**
 * 저장소. 여기가 DB에 닿는 **유일한** 파일이고, 이 파일을 import하는 곳은 api/ 폴더뿐이다.
 *
 * 두 가지 구현을 같은 얼굴로 감싼다.
 *  - postgresStore : 진짜 배포. Neon(서버리스 Postgres)에 붙는다. 접속 문자열은 서버에만 있다.
 *  - fileStore     : 로컬 개발용. DATABASE_URL이 없을 때 JSON 파일 하나로 대신한다.
 *
 * 어느 쪽이든 바깥에서 보이는 함수 이름과 반환 모양은 같다. 브라우저가 DB에 직접 닿는
 * 경로는 어느 쪽에도 없다 — 모든 접근은 api/ 의 서버리스 함수를 지난다.
 */

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Vercel의 Neon 연동이 넣어주는 이름들. 어느 것이든 있으면 그걸 쓴다.
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

/** 세션 수명. 이 시간이 지나면 다시 패스키로 들어와야 한다. */
export const SESSION_MINUTES = 12 * 60;

/** 민감한 동작(패스키 삭제) 전에 다시 확인받아야 하는 간격. */
export const REAUTH_MINUTES = 5;

const nowIso = () => new Date().toISOString();
const plusMinutes = (m) => new Date(Date.now() + m * 60 * 1000).toISOString();

/* ------------------------------------------------------------------ 파일 저장소 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE_PATH = process.env.PK_FILE_STORE || join(HERE, "..", ".dev-store", "store.json");

const EMPTY = { users: [], credentials: [], challenges: [], sessions: [], notes: [] };

function fileStore() {
    const read = () => {
        if (!existsSync(FILE_PATH)) return structuredClone(EMPTY);
        try {
            return { ...structuredClone(EMPTY), ...JSON.parse(readFileSync(FILE_PATH, "utf8")) };
        } catch {
            return structuredClone(EMPTY);
        }
    };
    const write = (data) => {
        mkdirSync(dirname(FILE_PATH), { recursive: true });
        writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    };
    const mutate = (fn) => {
        const data = read();
        const result = fn(data);
        write(data);
        return result;
    };

    return {
        backend: "file",

        async createUser({ id, displayName }) {
            return mutate((d) => {
                const row = { id, display_name: displayName, created_at: nowIso() };
                d.users.push(row);
                return row;
            });
        },

        async getUser(id) {
            return read().users.find((u) => u.id === id) || null;
        },

        async createCredential(row) {
            return mutate((d) => {
                const saved = {
                    id: row.id,
                    user_id: row.userId,
                    public_key: row.publicKey,
                    counter: row.counter,
                    device_name: row.deviceName,
                    transports: row.transports || null,
                    created_at: nowIso(),
                };
                d.credentials.push(saved);
                return saved;
            });
        },

        async getCredential(id) {
            return read().credentials.find((c) => c.id === id) || null;
        },

        async listCredentials(userId) {
            return read()
                .credentials.filter((c) => c.user_id === userId)
                .sort((a, b) => a.created_at.localeCompare(b.created_at));
        },

        async deleteCredential({ id, userId }) {
            return mutate((d) => {
                const index = d.credentials.findIndex((c) => c.id === id && c.user_id === userId);
                if (index < 0) return false;
                d.credentials.splice(index, 1);
                return true;
            });
        },

        async updateCounter(id, counter) {
            mutate((d) => {
                const row = d.credentials.find((c) => c.id === id);
                if (row) row.counter = counter;
            });
        },

        async createChallenge(input) {
            return mutate((d) => {
                // 다 쓴 질문은 여기서 함께 치운다.
                const cutoff = plusMinutes(-60);
                d.challenges = d.challenges.filter((c) => c.expires_at > cutoff);

                const row = {
                    id: randomUUID(),
                    challenge: input.challenge,
                    type: input.type,
                    user_id: input.userId ?? null,
                    is_new_account: Boolean(input.isNewAccount),
                    display_name: input.displayName ?? null,
                    device_name: input.deviceName ?? null,
                    expires_at: plusMinutes(2),
                    used_at: null,
                    created_at: nowIso(),
                };
                d.challenges.push(row);
                return row;
            });
        },

        /** 한 번만 통과시킨다 — 이미 썼거나 만료됐으면 실패. */
        async takeChallenge({ id, type }) {
            return mutate((d) => {
                const row = d.challenges.find((c) => c.id === id && c.type === type);
                if (!row) return { ok: false, reason: "not_found" };
                if (row.used_at) return { ok: false, reason: "already_used" };
                if (row.expires_at <= nowIso()) return { ok: false, reason: "expired" };
                row.used_at = nowIso();
                return { ok: true, row };
            });
        },

        async createSession(userId) {
            return mutate((d) => {
                const row = {
                    id: randomUUID(),
                    user_id: userId,
                    expires_at: plusMinutes(SESSION_MINUTES),
                    // 로그인은 재확인으로 치지 않는다 — null로 둔다. 로그인 직후에도
                    // 패스키를 지우려면 패스키를 한 번 더 대야 한다.
                    reauth_at: null,
                    created_at: nowIso(),
                };
                d.sessions.push(row);
                return row;
            });
        },

        async getSession(id) {
            const row = read().sessions.find((s) => s.id === id);
            if (!row || row.expires_at <= nowIso()) return null;
            return row;
        },

        async touchReauth(id) {
            return mutate((d) => {
                const row = d.sessions.find((s) => s.id === id && s.expires_at > nowIso());
                if (!row) return null;
                row.reauth_at = nowIso();
                return row;
            });
        },

        async deleteSession(id) {
            mutate((d) => {
                const index = d.sessions.findIndex((s) => s.id === id);
                if (index >= 0) d.sessions.splice(index, 1);
            });
        },

        async deleteSessionsForUser(userId) {
            mutate((d) => {
                d.sessions = d.sessions.filter((s) => s.user_id !== userId);
            });
        },

        async listNotes(userId) {
            return read()
                .notes.filter((n) => n.user_id === userId)
                .sort((a, b) => a.created_at.localeCompare(b.created_at));
        },

        async getNote(id) {
            return read().notes.find((n) => n.id === id) || null;
        },

        async createNote({ userId, kind, title, body }) {
            return mutate((d) => {
                const row = {
                    id: randomUUID(),
                    user_id: userId,
                    kind,
                    title,
                    body,
                    created_at: nowIso(),
                };
                d.notes.push(row);
                return row;
            });
        },
    };
}

/* ------------------------------------------------------------- Postgres 저장소 */

/**
 * Neon(서버리스 Postgres). `neon()`은 HTTP로 질의를 보내므로 서버리스 함수마다
 * 커넥션 풀을 여닫는 문제가 없다. 태그드 템플릿(`sql\`...\``)이 값을 자동으로
 * 파라미터로 묶어 주므로 문자열을 이어 붙여 SQL을 만들지 않는다.
 */
function postgresStore() {
    const sql = neon(DATABASE_URL);
    const first = (rows) => rows[0] ?? null;

    return {
        backend: "postgres",

        async createUser({ id, displayName }) {
            return first(
                await sql`insert into pk_users (id, display_name)
                          values (${id}, ${displayName})
                          returning *`,
            );
        },

        async getUser(id) {
            return first(await sql`select * from pk_users where id = ${id}`);
        },

        async createCredential(row) {
            return first(
                await sql`insert into pk_credentials
                              (id, user_id, public_key, counter, device_name, transports)
                          values (${row.id}, ${row.userId}, ${row.publicKey}, ${row.counter},
                                  ${row.deviceName}, ${row.transports})
                          returning *`,
            );
        },

        async getCredential(id) {
            return first(await sql`select * from pk_credentials where id = ${id}`);
        },

        async listCredentials(userId) {
            return sql`select * from pk_credentials
                       where user_id = ${userId}
                       order by created_at`;
        },

        async deleteCredential({ id, userId }) {
            // user_id 조건이 핵심 — 남의 자격증명은 애초에 지워지지 않는다.
            const rows = await sql`delete from pk_credentials
                                   where id = ${id} and user_id = ${userId}
                                   returning id`;
            return rows.length > 0;
        },

        async updateCounter(id, counter) {
            await sql`update pk_credentials set counter = ${counter} where id = ${id}`;
        },

        async createChallenge(input) {
            // 다 쓴 질문은 여기서 함께 치운다 — 만료된 지 한 시간이 지난 줄은 남겨 둘 이유가 없다.
            await sql`delete from pk_challenges where expires_at < now() - interval '1 hour'`;

            return first(
                await sql`insert into pk_challenges
                              (challenge, type, user_id, is_new_account, display_name, device_name, expires_at)
                          values (${input.challenge}, ${input.type}, ${input.userId ?? null},
                                  ${Boolean(input.isNewAccount)}, ${input.displayName ?? null},
                                  ${input.deviceName ?? null}, ${plusMinutes(2)})
                          returning *`,
            );
        },

        /**
         * 한 번만 통과시킨다. `used_at is null` 조건을 UPDATE에 함께 걸어 DB가 판정하게 한다 —
         * 읽고 나서 쓰는 방식이면 두 요청이 동시에 들어올 때 둘 다 통과할 수 있다.
         */
        async takeChallenge({ id, type }) {
            const claimed = await sql`update pk_challenges
                                      set used_at = now()
                                      where id = ${id} and type = ${type}
                                        and used_at is null and expires_at > now()
                                      returning *`;
            if (claimed.length > 0) return { ok: true, row: claimed[0] };

            // 왜 실패했는지 구분해 준다(로그·검사용).
            const existing = first(await sql`select * from pk_challenges where id = ${id}`);
            if (!existing) return { ok: false, reason: "not_found" };
            if (existing.used_at) return { ok: false, reason: "already_used" };
            return { ok: false, reason: "expired" };
        },

        async createSession(userId) {
            return first(
                // reauth_at은 비워 둔다 — 로그인은 재확인으로 치지 않는다.
                await sql`insert into pk_sessions (user_id, expires_at)
                          values (${userId}, ${plusMinutes(SESSION_MINUTES)})
                          returning *`,
            );
        },

        async getSession(id) {
            return first(
                await sql`select * from pk_sessions where id = ${id} and expires_at > now()`,
            );
        },

        async touchReauth(id) {
            return first(
                await sql`update pk_sessions set reauth_at = now()
                          where id = ${id} and expires_at > now()
                          returning *`,
            );
        },

        async deleteSession(id) {
            await sql`delete from pk_sessions where id = ${id}`;
        },

        async deleteSessionsForUser(userId) {
            await sql`delete from pk_sessions where user_id = ${userId}`;
        },

        async listNotes(userId) {
            return sql`select * from pk_private_notes
                       where user_id = ${userId}
                       order by created_at`;
        },

        async getNote(id) {
            return first(await sql`select * from pk_private_notes where id = ${id}`);
        },

        async createNote({ userId, kind, title, body }) {
            return first(
                await sql`insert into pk_private_notes (user_id, kind, title, body)
                          values (${userId}, ${kind}, ${title}, ${body})
                          returning *`,
            );
        },
    };
}

/* ------------------------------------------------------------------------ 선택 */

export const databaseConfigured = Boolean(DATABASE_URL);
export const store = databaseConfigured ? postgresStore() : fileStore();
