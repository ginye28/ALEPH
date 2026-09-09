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
                // 이 패스키로 들어온 세션은 이제 "지금 이 기기"를 가리킬 수 없다.
                // (Postgres 쪽은 on delete set null이 같은 일을 한다.)
                for (const session of d.sessions) {
                    if (session.credential_id === id) session.credential_id = null;
                }
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

        async createSession(userId, credentialId = null) {
            return mutate((d) => {
                const row = {
                    id: randomUUID(),
                    user_id: userId,
                    // 어느 패스키로 들어왔는지 — 화면의 "지금 이 기기" 표시에 쓴다.
                    credential_id: credentialId,
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

        // 아래 "합친" 함수들은 파일 저장소에는 왕복이랄 게 없어(디스크 파일 하나) 성능
        // 이점이 없지만, postgresStore와 같은 이름·모양을 유지해야 lib/session.js와
        // api/*.js가 두 백엔드 중 무엇을 쓰는지 몰라도 되게 하는 원칙이 안 깨진다.

        /** currentUser()가 쓰던 getSession+getUser 두 번을 하나로. */
        async getSessionWithUser(id) {
            const row = read().sessions.find((s) => s.id === id);
            if (!row || row.expires_at <= nowIso()) return null;
            const user = read().users.find((u) => u.id === row.user_id) || null;
            if (!user) return null;
            return { session: row, user };
        },

        /** login/verify·reauth/verify가 쓰던 takeChallenge+getCredential 두 번을 하나로. */
        async takeChallengeWithCredential({ id, type, credentialId }) {
            const taken = await this.takeChallenge({ id, type });
            const credential = await this.getCredential(credentialId);
            return { taken, credential };
        },

        /** login/verify가 쓰던 updateCounter+createSession 두 번을 하나로. */
        async bumpCounterAndCreateSession({ credentialId, counter, userId }) {
            await this.updateCounter(credentialId, counter);
            return this.createSession(userId, credentialId);
        },

        /** reauth/verify가 쓰던 updateCounter+touchReauth 두 번을 하나로. */
        async bumpCounterAndTouchReauth({ credentialId, counter, sessionId }) {
            await this.updateCounter(credentialId, counter);
            return this.touchReauth(sessionId);
        },

        /** credentials/[id].js DELETE가 쓰던 deleteCredential+listCredentials 두 번을 하나로. */
        async deleteCredentialAndCount({ id, userId }) {
            const deleted = await this.deleteCredential({ id, userId });
            const remaining = await this.listCredentials(userId);
            return { deleted, remaining: remaining.length };
        },

        /**
         * register/verify의 새 계정 분기가 쓰던 createCredential + createNote(반복) +
         * createSession을 하나로. createUser는 이 앞에서 이미 끝나 있어야 한다
         * (patch_credentials.user_id가 pk_users를 참조하므로 — Postgres 쪽 순서 안전성과
         * 맞춘 것이다).
         */
        async finishNewAccountCredential({ userId, credential, seedNotes }) {
            const savedCredential = await this.createCredential({ ...credential, userId });
            for (const note of seedNotes) {
                await this.createNote({ userId, ...note });
            }
            const session = await this.createSession(userId, credential.id);
            return { credential: savedCredential, session };
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

        // register/login/reauth 세 흐름의 1단계가 전부 이 함수를 지난다 — 만료 청소를
        // 별도 왕복으로 하지 않고 같은 문장의 형제 CTE로 묶어 매번 한 왕복으로 줄인다.
        async createChallenge(input) {
            return first(
                await sql`with cleaned as (
                              -- 다 쓴 질문 청소. 만료된 지 한 시간이 지난 줄은 남겨 둘 이유가 없다.
                              delete from pk_challenges where expires_at < now() - interval '1 hour'
                          )
                          insert into pk_challenges
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

        async createSession(userId, credentialId = null) {
            const expiresAt = plusMinutes(SESSION_MINUTES);
            try {
                return first(
                    // reauth_at은 비워 둔다 — 로그인은 재확인으로 치지 않는다.
                    await sql`insert into pk_sessions (user_id, credential_id, expires_at)
                              values (${userId}, ${credentialId}, ${expiresAt})
                              returning *`,
                );
            } catch (error) {
                // credential_id는 나중에 추가한 칸이다(schema.sql의 add column if not exists).
                // 마이그레이션(npm run db:init)보다 코드가 먼저 배포되면 이 칸이 아직 없어서
                // 42703(undefined_column)이 난다. 그때 로그인 전체가 막히는 것보다는
                // "지금 이 기기" 표시 하나를 포기하는 편이 낫다 — 그 칸 없이 다시 넣는다.
                if (error?.code !== "42703") throw error;
                return first(
                    await sql`insert into pk_sessions (user_id, expires_at)
                              values (${userId}, ${expiresAt})
                              returning *`,
                );
            }
        },

        async getSession(id) {
            return first(
                await sql`select * from pk_sessions where id = ${id} and expires_at > now()`,
            );
        },

        /**
         * currentUser()가 부르던 getSession + getUser 두 번의 왕복을 JOIN 하나로 줄인다.
         * 인증이 필요한 요청은 전부(비공개 자료 조회, 계정 삭제, 재확인 등) 이 함수를
         * 지나므로 여기 하나를 줄이는 게 가장 값이 크다.
         */
        async getSessionWithUser(id) {
            const row = first(
                await sql`select
                              s.id as s_id, s.user_id as s_user_id, s.credential_id,
                              s.expires_at as s_expires_at, s.reauth_at,
                              s.created_at as s_created_at,
                              u.id as u_id, u.display_name, u.created_at as u_created_at
                          from pk_sessions s
                          join pk_users u on u.id = s.user_id
                          where s.id = ${id} and s.expires_at > now()`,
            );
            if (!row) return null;
            return {
                session: {
                    id: row.s_id,
                    user_id: row.s_user_id,
                    credential_id: row.credential_id,
                    expires_at: row.s_expires_at,
                    reauth_at: row.reauth_at,
                    created_at: row.s_created_at,
                },
                user: { id: row.u_id, display_name: row.display_name, created_at: row.u_created_at },
            };
        },

        /**
         * login/verify·reauth/verify가 부르던 takeChallenge + getCredential 두 번의 왕복을
         * 하나로. credentialId는 요청 본문에서 오는 값이라 challenge를 소진한 결과와
         * 무관하다 — 그래서 같은 문장 안에 나란히 넣어도 순서 걱정이 없다.
         *
         * `taken` CTE에 RETURNING이 있어도 실패(0행)할 수 있다 — 그럴 때는 기존과 똑같이
         * 별도 질의로 왜 실패했는지 구분한다(성공 경로에서만 왕복이 줄고, 실패는 드물어서
         * 거기까지 합칠 값이 없다).
         */
        async takeChallengeWithCredential({ id, type, credentialId }) {
            const row = first(
                await sql`with taken as (
                              update pk_challenges
                              set used_at = now()
                              where id = ${id} and type = ${type}
                                and used_at is null and expires_at > now()
                              returning *
                          )
                          select
                              (select row_to_json(taken)::text from taken) as challenge_json,
                              (select row_to_json(c)::text from pk_credentials c
                               where c.id = ${credentialId}) as credential_json`,
            );
            const credential = row?.credential_json ? JSON.parse(row.credential_json) : null;
            if (row?.challenge_json) {
                return { taken: { ok: true, row: JSON.parse(row.challenge_json) }, credential };
            }
            // 실패 이유를 구분해 준다(로그·검사용) — 기존과 같은 진단 질의.
            const existing = first(await sql`select * from pk_challenges where id = ${id}`);
            let reason = "not_found";
            if (existing?.used_at) reason = "already_used";
            else if (existing) reason = "expired";
            return { taken: { ok: false, reason }, credential };
        },

        /**
         * login/verify가 부르던 updateCounter + createSession 두 번의 왕복을 하나로.
         * 세션이 참조하는 credential 행은 이미 존재하는 행(카운터만 바뀜)이라, 두 CTE의
         * 실행 순서가 어느 쪽이든 외래키 검사에 문제가 없다.
         */
        async bumpCounterAndCreateSession({ credentialId, counter, userId }) {
            const expiresAt = plusMinutes(SESSION_MINUTES);
            try {
                const row = first(
                    await sql`with updated as (
                                  update pk_credentials set counter = ${counter} where id = ${credentialId}
                              ), inserted as (
                                  insert into pk_sessions (user_id, credential_id, expires_at)
                                  values (${userId}, ${credentialId}, ${expiresAt})
                                  returning *
                              )
                              select row_to_json(inserted)::text as session_json from inserted`,
                );
                return JSON.parse(row.session_json);
            } catch (error) {
                // createSession()과 같은 안전망 — credential_id 칸이 아직 없는 배포판 대비.
                if (error?.code !== "42703") throw error;
                const row = first(
                    await sql`with updated as (
                                  update pk_credentials set counter = ${counter} where id = ${credentialId}
                              ), inserted as (
                                  insert into pk_sessions (user_id, expires_at)
                                  values (${userId}, ${expiresAt})
                                  returning *
                              )
                              select row_to_json(inserted)::text as session_json from inserted`,
                );
                return JSON.parse(row.session_json);
            }
        },

        /**
         * reauth/verify가 부르던 updateCounter + touchReauth 두 번의 왕복을 하나로.
         */
        async bumpCounterAndTouchReauth({ credentialId, counter, sessionId }) {
            const row = first(
                await sql`with updated as (
                              update pk_credentials set counter = ${counter} where id = ${credentialId}
                          ), touched as (
                              update pk_sessions set reauth_at = now()
                              where id = ${sessionId} and expires_at > now()
                              returning *
                          )
                          select row_to_json(touched)::text as session_json from touched`,
            );
            return row?.session_json ? JSON.parse(row.session_json) : null;
        },

        /**
         * credentials/[id].js DELETE가 부르던 deleteCredential + listCredentials 두 번의
         * 왕복을 하나로. 남은 개수가 "지운 뒤"의 값이어야 하므로, remaining을 deleted가
         * 지운 id를 실제로 제외하는 조건으로 계산한다 — 형제 CTE라 해도 이렇게 명시적으로
         * 참조를 걸면(deleted를 셀렉트에서 실제로 읽으므로) 스냅샷 순서를 신경 쓸 필요가
         * 없어진다.
         */
        async deleteCredentialAndCount({ id, userId }) {
            const row = first(
                await sql`with deleted as (
                              delete from pk_credentials where id = ${id} and user_id = ${userId}
                              returning id
                          )
                          select
                              (select count(*) from deleted)::int as deleted_count,
                              (select count(*) from pk_credentials
                               where user_id = ${userId}
                                 and id not in (select id from deleted))::int as remaining_count`,
            );
            return { deleted: (row?.deleted_count ?? 0) > 0, remaining: row?.remaining_count ?? 0 };
        },

        /**
         * register/verify의 새 계정 분기가 부르던 createCredential + createNote(3번 반복) +
         * createSession, 총 5번의 왕복을 하나로. createUser는 이 앞에서 이미 끝나 있어야
         * 한다 — pk_credentials·pk_private_notes가 pk_users를 참조하는데, 이 함수 안의
         * 형제 CTE들은 서로를 참조하지 않아 Postgres가 실행 순서를 보장하지 않는다.
         * createUser를 별도 왕복으로 먼저 커밋해 두면(직전 문장이라 이후 문장에서는 항상
         * 보인다) 이 안전 문제가 아예 생기지 않는다.
         */
        async finishNewAccountCredential({ userId, credential, seedNotes }) {
            const expiresAt = plusMinutes(SESSION_MINUTES);
            const kinds = seedNotes.map((n) => n.kind);
            const titles = seedNotes.map((n) => n.title);
            const bodies = seedNotes.map((n) => n.body);
            try {
                const row = first(
                    await sql`with cred as (
                                  insert into pk_credentials (id, user_id, public_key, counter, device_name, transports)
                                  values (${credential.id}, ${userId}, ${credential.publicKey}, ${credential.counter},
                                          ${credential.deviceName}, ${credential.transports})
                                  returning *
                              ), notes as (
                                  insert into pk_private_notes (user_id, kind, title, body)
                                  select ${userId}, k, t, b
                                  from unnest(${kinds}::text[], ${titles}::text[], ${bodies}::text[]) as x(k, t, b)
                                  returning *
                              ), sess as (
                                  insert into pk_sessions (user_id, credential_id, expires_at)
                                  values (${userId}, ${credential.id}, ${expiresAt})
                                  returning *
                              )
                              select
                                  (select row_to_json(cred)::text from cred) as credential_json,
                                  (select row_to_json(sess)::text from sess) as session_json`,
                );
                return {
                    credential: JSON.parse(row.credential_json),
                    session: JSON.parse(row.session_json),
                };
            } catch (error) {
                if (error?.code !== "42703") throw error;
                const row = first(
                    await sql`with cred as (
                                  insert into pk_credentials (id, user_id, public_key, counter, device_name, transports)
                                  values (${credential.id}, ${userId}, ${credential.publicKey}, ${credential.counter},
                                          ${credential.deviceName}, ${credential.transports})
                                  returning *
                              ), notes as (
                                  insert into pk_private_notes (user_id, kind, title, body)
                                  select ${userId}, k, t, b
                                  from unnest(${kinds}::text[], ${titles}::text[], ${bodies}::text[]) as x(k, t, b)
                                  returning *
                              ), sess as (
                                  insert into pk_sessions (user_id, expires_at)
                                  values (${userId}, ${expiresAt})
                                  returning *
                              )
                              select
                                  (select row_to_json(cred)::text from cred) as credential_json,
                                  (select row_to_json(sess)::text from sess) as session_json`,
                );
                return {
                    credential: JSON.parse(row.credential_json),
                    session: JSON.parse(row.session_json),
                };
            }
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
