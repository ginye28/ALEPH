-- 과제 8 — 패스키(WebAuthn) 잠금 스키마 (Neon / Postgres)
--
-- 브라우저가 이 테이블들에 직접 닿는 경로는 없습니다. 접속 문자열은 서버(Vercel 함수)에만
-- 있고, 모든 읽기·쓰기는 api/ 의 핸들러가 lib/store.js 를 거쳐서만 합니다.
--
-- 과제 6·7에서는 Supabase를 썼기 때문에 브라우저가 PostgREST로 DB에 직접 붙을 수 있었고,
-- 그래서 RLS(행 수준 보안)가 꼭 필요했습니다. 여기서는 그런 통로 자체가 없어 RLS를 켜지
-- 않습니다 — 접근 통제는 전부 서버 코드(lib/session.js 의 requireUser)가 합니다.

create extension if not exists pgcrypto;

-- 계정. 이메일도 비밀번호도 없습니다. 패스키가 곧 계정의 열쇠입니다.
create table if not exists pk_users (
    id uuid primary key,
    display_name text not null,
    created_at timestamptz not null default now()
);

-- 등록된 패스키(공개키). 개인키는 여기에도, 다른 어디에도 없습니다 — 기기 안에만 있습니다.
create table if not exists pk_credentials (
    id text primary key,                              -- authenticator가 준 credential id (base64url)
    user_id uuid not null references pk_users (id) on delete cascade,
    public_key text not null,                         -- 공개키 (base64url). 비밀번호가 아닙니다.
    counter bigint not null default 0,                -- 복제 authenticator 탐지용 서명 횟수
    device_name text not null,                        -- 사람이 알아볼 이름 (T08-C24)
    transports text [] null,
    created_at timestamptz not null default now()
);
create index if not exists pk_credentials_user_idx on pk_credentials (user_id);

-- 서버가 만든 일회용 질문(challenge). 한 번 쓰면 used_at이 찍혀 재사용 불가 (T08-C31).
-- user_id에 FK를 걸지 않습니다: 신규 등록은 "아직 존재하지 않는 계정"을 가리키기 때문입니다.
-- 등록을 중간에 취소하면 계정도 자격증명도 만들어지지 않고, 이 줄만 2분 뒤 만료됩니다 (T08-C25).
create table if not exists pk_challenges (
    id uuid primary key default gen_random_uuid(),
    challenge text not null,
    type text not null check (type in ('registration', 'authentication', 'reauth')),
    user_id uuid null,
    is_new_account boolean not null default false,
    display_name text null,
    device_name text null,
    expires_at timestamptz not null,
    used_at timestamptz null,
    created_at timestamptz not null default now()
);
create index if not exists pk_challenges_expiry_idx on pk_challenges (expires_at);

-- 세션. 이 id가 곧 쿠키 값이고, 안에 아무 정보도 담겨 있지 않습니다(JWT가 아닙니다).
-- 로그아웃 = 이 행 삭제 = 그 즉시 무효 (T08-C32·C33).
--
-- reauth_at — 마지막으로 "지우기 직전 재확인"을 통과한 시각. 패스키를 지우는 것 같은
-- 되돌릴 수 없는 동작은 이 시각이 최근(5분 이내)일 때만 허용합니다.
-- **로그인은 재확인으로 치지 않습니다** — 로그인 때는 null로 둡니다. 그래야 로그인한 채
-- 자리를 비운 사이에 남이 와서 패스키를 지워 버리는 일이 생기지 않습니다.
create table if not exists pk_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references pk_users (id) on delete cascade,
    expires_at timestamptz not null,
    reauth_at timestamptz null,
    created_at timestamptz not null default now()
);
create index if not exists pk_sessions_user_idx on pk_sessions (user_id);

-- 비공개 자료. 전부 지어낸 내용만 넣습니다 (T08-C12).
create table if not exists pk_private_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references pk_users (id) on delete cascade,
    kind text not null check (kind in ('project_memo', 'target_company', 'retro')),
    title text not null,
    body text not null,
    created_at timestamptz not null default now()
);
create index if not exists pk_private_notes_user_idx on pk_private_notes (user_id, created_at);

-- 이미 만들어 둔 스키마를 고치는 경우를 위해 (있으면 넘어갑니다).
alter table pk_sessions add column if not exists reauth_at timestamptz null;
