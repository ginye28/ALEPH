/**
 * 저장소. 여기가 DB에 닿는 **유일한** 파일이고, 이 파일을 import하는 곳은 api/ 폴더뿐이다.
 *
 * 두 가지 구현을 같은 얼굴로 감싼다.
 *  - supabaseStore : 진짜 배포. service_role 키로 접근하며, 이 키는 서버에만 있다.
 *  - fileStore     : 로컬 개발용. Supabase 환경변수가 없을 때 JSON 파일 하나로 대신한다.
 *
 * 어느 쪽이든 바깥에서 보이는 함수 이름과 반환 모양은 같다.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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
                    expires_at: plusMinutes(12 * 60),
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

/* --------------------------------------------------------------- Supabase 저장소 */

function supabaseStore() {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const one = async (query) => {
        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        return data ?? null;
    };
    const many = async (query) => {
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data ?? [];
    };

    return {
        backend: "supabase",

        async createUser({ id, displayName }) {
            return one(
                sb.from("pk_users").insert({ id, display_name: displayName }).select(),
            );
        },

        async getUser(id) {
            return one(sb.from("pk_users").select("*").eq("id", id));
        },

        async createCredential(row) {
            return one(
                sb
                    .from("pk_credentials")
                    .insert({
                        id: row.id,
                        user_id: row.userId,
                        public_key: row.publicKey,
                        counter: row.counter,
                        device_name: row.deviceName,
                        transports: row.transports || null,
                    })
                    .select(),
            );
        },

        async getCredential(id) {
            return one(sb.from("pk_credentials").select("*").eq("id", id));
        },

        async listCredentials(userId) {
            return many(
                sb
                    .from("pk_credentials")
                    .select("*")
                    .eq("user_id", userId)
                    .order("created_at", { ascending: true }),
            );
        },

        async deleteCredential({ id, userId }) {
            // user_id 조건이 핵심 — 남의 자격증명은 애초에 지워지지 않는다.
            const rows = await many(
                sb.from("pk_credentials").delete().eq("id", id).eq("user_id", userId).select(),
            );
            return rows.length > 0;
        },

        async updateCounter(id, counter) {
            const { error } = await sb.from("pk_credentials").update({ counter }).eq("id", id);
            if (error) throw new Error(error.message);
        },

        async createChallenge(input) {
            return one(
                sb
                    .from("pk_challenges")
                    .insert({
                        challenge: input.challenge,
                        type: input.type,
                        user_id: input.userId ?? null,
                        is_new_account: Boolean(input.isNewAccount),
                        display_name: input.displayName ?? null,
                        device_name: input.deviceName ?? null,
                        expires_at: plusMinutes(2),
                    })
                    .select(),
            );
        },

        /**
         * 한 번만 통과시킨다. `used_at is null` 조건을 UPDATE에 함께 걸어 DB가 판정하게 한다 —
         * 읽고 나서 쓰는 방식이면 두 요청이 동시에 들어올 때 둘 다 통과할 수 있다.
         */
        async takeChallenge({ id, type }) {
            const claimed = await many(
                sb
                    .from("pk_challenges")
                    .update({ used_at: nowIso() })
                    .eq("id", id)
                    .eq("type", type)
                    .is("used_at", null)
                    .gt("expires_at", nowIso())
                    .select(),
            );
            if (claimed.length > 0) return { ok: true, row: claimed[0] };

            // 왜 실패했는지 구분해 준다(로그·검사용). 없으면 not_found.
            const existing = await one(sb.from("pk_challenges").select("*").eq("id", id));
            if (!existing) return { ok: false, reason: "not_found" };
            if (existing.used_at) return { ok: false, reason: "already_used" };
            return { ok: false, reason: "expired" };
        },

        async createSession(userId) {
            return one(
                sb
                    .from("pk_sessions")
                    .insert({ user_id: userId, expires_at: plusMinutes(12 * 60) })
                    .select(),
            );
        },

        async getSession(id) {
            return one(
                sb.from("pk_sessions").select("*").eq("id", id).gt("expires_at", nowIso()),
            );
        },

        async deleteSession(id) {
            const { error } = await sb.from("pk_sessions").delete().eq("id", id);
            if (error) throw new Error(error.message);
        },

        async deleteSessionsForUser(userId) {
            const { error } = await sb.from("pk_sessions").delete().eq("user_id", userId);
            if (error) throw new Error(error.message);
        },

        async listNotes(userId) {
            return many(
                sb
                    .from("pk_private_notes")
                    .select("*")
                    .eq("user_id", userId)
                    .order("created_at", { ascending: true }),
            );
        },

        async getNote(id) {
            return one(sb.from("pk_private_notes").select("*").eq("id", id));
        },

        async createNote({ userId, kind, title, body }) {
            return one(
                sb
                    .from("pk_private_notes")
                    .insert({ user_id: userId, kind, title, body })
                    .select(),
            );
        },
    };
}

/* ------------------------------------------------------------------------ 선택 */

export const supabaseConfigured = Boolean(SUPABASE_URL && SERVICE_ROLE);
export const store = supabaseConfigured ? supabaseStore() : fileStore();
