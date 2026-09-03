-- 과제 8 — 패스키(WebAuthn) 잠금 스키마
--
-- 이 테이블들에 클라이언트(브라우저)가 직접 접근하는 경로는 없다.
-- 브라우저에는 Supabase URL도 키도 배포하지 않는다 — 모든 접근은
-- /api 서버리스 함수가 service_role 키로만 수행한다.
-- RLS는 이중 방어로 켜 두되 정책을 하나도 만들지 않는다(= anon/authenticated 전부 거절).

create extension if not exists pgcrypto;

-- 계정. 이메일도 비밀번호도 없다. 패스키가 곧 계정의 열쇠다.
create table if not exists pk_users (
    id uuid primary key,
    display_name text not null,
    created_at timestamptz not null default now()
);

-- 등록된 패스키(공개키). 개인키는 여기에도, 다른 어디에도 없다 — 기기 안에만 있다.
create table if not exists pk_credentials (
    id text primary key,                              -- authenticator가 준 credential id (base64url)
    user_id uuid not null references pk_users (id) on delete cascade,
    public_key text not null,                         -- 공개키 (base64url). 비밀번호가 아니다.
    counter bigint not null default 0,                -- 복제 authenticator 탐지용 서명 횟수
    device_name text not null,                        -- 사람이 알아볼 이름 (T08-C24)
    transports text [] null,
    created_at timestamptz not null default now()
);
create index if not exists pk_credentials_user_idx on pk_credentials (user_id);

-- 서버가 만든 일회용 질문(challenge). 한 번 쓰면 used_at이 찍혀 재사용 불가 (T08-C31).
-- user_id에 FK를 걸지 않는다: 신규 등록은 "아직 존재하지 않는 계정"을 가리키기 때문이다.
-- 등록을 중간에 취소하면 계정도 자격증명도 만들어지지 않고, 이 줄만 2분 뒤 만료된다 (T08-C25).
create table if not exists pk_challenges (
    id uuid primary key default gen_random_uuid(),
    challenge text not null,
    type text not null check (type in ('registration', 'authentication')),
    user_id uuid null,
    is_new_account boolean not null default false,
    display_name text null,
    device_name text null,
    expires_at timestamptz not null,
    used_at timestamptz null,
    created_at timestamptz not null default now()
);
create index if not exists pk_challenges_expiry_idx on pk_challenges (expires_at);

-- 세션. 이 id가 곧 쿠키 값이고, 안에 아무 정보도 담겨 있지 않다(JWT가 아니다).
-- 로그아웃 = 이 행 삭제 = 그 즉시 무효 (T08-C32·C33).
create table if not exists pk_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references pk_users (id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);
create index if not exists pk_sessions_user_idx on pk_sessions (user_id);

-- 비공개 자료. 전부 지어낸 내용만 넣는다 (T08-C12).
create table if not exists pk_private_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references pk_users (id) on delete cascade,
    kind text not null check (kind in ('project_memo', 'target_company', 'retro')),
    title text not null,
    body text not null,
    created_at timestamptz not null default now()
);
create index if not exists pk_private_notes_user_idx on pk_private_notes (user_id, created_at);

alter table pk_users enable row level security;
alter table pk_credentials enable row level security;
alter table pk_challenges enable row level security;
alter table pk_sessions enable row level security;
alter table pk_private_notes enable row level security;
-- 정책을 만들지 않는다 → service_role 외의 모든 역할은 기본값(전부 거절)에 걸린다.
