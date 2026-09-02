-- 플랜두씨 다이어리 2 (7.md) — Supabase 스키마.
-- 새 Supabase 프로젝트의 SQL 편집기에서 이 파일 전체를 한 번 실행합니다.
-- 과제 6(plandosee)의 Supabase 프로젝트와는 별개의 새 프로젝트에 올립니다.
--
-- 과제 6에서 이어받은 원칙:
--   1. 계획은 고치지 않고 갈아엎지도 않습니다 — plan_revisions에 이력만 쌓습니다.
--   2. 계획·할일 삭제는 하드 삭제가 아니라 deleted_at 소프트 삭제입니다. 둘 다 DELETE 정책이
--      아예 없어 하드 삭제가 구조적으로 불가능합니다.
--   3. 완료는 이벤트가 아니라 상태입니다 — status/completed_at을 WHERE로 가드해 갱신하므로
--      두 번 눌러도 쌓일 무언가 자체가 없습니다.
--   4. 이력 테이블(plan_revisions·execution_records·review_notes)은 UPDATE/DELETE 정책을
--      아예 두지 않아 RLS 수준에서 항상 append-only입니다.
--
-- 과제 7에서 새로 추가하는 원칙:
--   5. 모든 표에 user_id를 직접 둡니다(부모 표를 조인해 소유자를 확인하지 않습니다) —
--      정책이 짧고 빨라 실수할 자리가 줄어듭니다.
--   6. user_id는 클라이언트가 보낸 값을 절대 신뢰하지 않습니다. INSERT 전에 stamp_owner()
--      트리거가 항상 auth.uid()로 덮어씁니다. 요청 본문에 남의 계정 id를 적어 보내도 소용없습니다.
--   7. RLS는 auth.uid() = user_id로만 select/insert/update를 허용합니다 — 로그인하지 않았거나
--      (auth.uid()가 null) 남의 행이면 그 어떤 조작도 거절됩니다.

create extension if not exists pgcrypto;

-- 모든 표의 INSERT 전에 소유자 칼럼을 항상 현재 로그인한 사용자로 덮어씁니다.
-- security definer가 아니어도 auth.uid()는 요청자의 세션에서 그대로 읽히므로 invoker 권한으로 충분합니다.
create or replace function stamp_owner()
returns trigger language plpgsql as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

-- ── 계획 (카드 1) ────────────────────────────────────────────────
create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  carried_from_review_id uuid null,
  deleted_at timestamptz null
);
create trigger plans_stamp_owner before insert on plans
  for each row execute function stamp_owner();

create table plan_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  plan_id uuid not null references plans(id),
  revision_no int not null,
  title text not null,
  period_start date not null,
  period_end date not null,
  priority text not null check (priority in ('low','medium','high')),
  success_criteria text not null,
  estimated_minutes int not null check (estimated_minutes > 0),
  note text null,
  created_at timestamptz not null default now(),
  unique (plan_id, revision_no)
);
create trigger plan_revisions_stamp_owner before insert on plan_revisions
  for each row execute function stamp_owner();
create index plan_revisions_plan_idx on plan_revisions (plan_id, revision_no desc);

-- 계획마다 최신 개정본 한 줄. "현재 계획"은 항상 이 뷰에서 다시 구합니다 — 캐시하지 않습니다.
-- 일반 뷰라 RLS를 따로 걸지 않아도 plan_revisions의 RLS를 그대로 물려받습니다.
create view plan_current as
  select distinct on (plan_id) *
  from plan_revisions
  order by plan_id, revision_no desc;

-- ── 할 일 (카드 2) ───────────────────────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  plan_id uuid not null references plans(id),
  title text not null,
  detail text null,
  due_date date null,
  priority text not null check (priority in ('low','medium','high')),
  tags text[] not null default '{}',
  estimated_minutes int not null check (estimated_minutes > 0),
  status text not null default 'todo' check (status in ('todo','done')),
  completed_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_completed_consistency check ((status = 'done') = (completed_at is not null))
);
create trigger tasks_stamp_owner before insert on tasks
  for each row execute function stamp_owner();
create index tasks_plan_idx on tasks (plan_id) where deleted_at is null;
create index tasks_due_idx on tasks (due_date) where deleted_at is null;

-- ── 실행 기록 (카드 3) ───────────────────────────────────────────
create table execution_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  task_id uuid not null references tasks(id),
  started_at timestamptz not null,
  ended_at timestamptz null,
  actual_minutes int not null check (actual_minutes >= 0),
  blocked_reason text null,
  created_at timestamptz not null default now(),
  constraint execution_time_order check (ended_at is null or ended_at >= started_at)
);
create trigger execution_records_stamp_owner before insert on execution_records
  for each row execute function stamp_owner();
create index execution_task_idx on execution_records (task_id);

-- ── 돌아보기의 "고칠 점" 이력 (카드 4) ───────────────────────────
create table review_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  plan_id uuid not null references plans(id),
  note text not null,
  created_at timestamptz not null default now()
);
create trigger review_notes_stamp_owner before insert on review_notes
  for each row execute function stamp_owner();

alter table plans
  add constraint plans_carried_from_review_fk
  foreign key (carried_from_review_id) references review_notes(id);

-- ── 돌아보기 집계 함수 ───────────────────────────────────────────
-- p_today는 반드시 클라이언트가 KST 기준으로 계산한 날짜 문자열을 넘깁니다.
-- DB의 now()/CURRENT_DATE(UTC)를 신뢰하면 KST 자정 근처에서 하루 밀립니다.
-- security definer가 아닌 일반 함수(invoker 권한)라 tasks/execution_records의 RLS를
-- 그대로 통과해 호출자 본인 소유 행만 집계합니다.
create or replace function plan_review(p_plan_id uuid, p_today date)
returns table (
  plan_count int, done_count int, overdue_count int, blocked_count int,
  estimated_total int, actual_total int, diff int
) language sql stable as $$
  with scoped as (
    select * from tasks where plan_id = p_plan_id and deleted_at is null
  ),
  actual as (
    select scoped.id as task_id, coalesce(sum(er.actual_minutes), 0) as minutes
    from scoped left join execution_records er on er.task_id = scoped.id
    group by scoped.id
  ),
  blocked as (
    select distinct task_id from execution_records
    where blocked_reason is not null and length(trim(blocked_reason)) > 0
  )
  select
    count(*)::int,
    count(*) filter (where status = 'done')::int,
    count(*) filter (where status <> 'done' and due_date is not null and due_date < p_today)::int,
    count(*) filter (where scoped.id in (select task_id from blocked))::int,
    coalesce(sum(estimated_minutes), 0)::int,
    coalesce((select sum(minutes) from actual), 0)::int,
    (coalesce((select sum(minutes) from actual), 0) - coalesce(sum(estimated_minutes), 0))::int
  from scoped;
$$;
grant execute on function plan_review(uuid, date) to authenticated;

-- ── 세션 즉시 무효화 ──────────────────────────────────────────────
-- JWT 액세스 토큰은 stateless라 signOut()을 불러도 그 자체로는 만료 시각(exp, 기본 1시간)까지
-- 계속 "서명은 유효"합니다. 그래서 auth.uid()만 검사하면 로그아웃한 뒤에도 훔친 토큰이
-- 한동안 계속 통합니다. Supabase Auth는 로그인마다 auth.sessions에 행을 하나 만들고
-- signOut()이 그 행을 지우므로, 토큰 안의 session_id 클레임이 auth.sessions에 지금도 있는지를
-- 매 요청마다 같이 검사하면 로그아웃 즉시(=행이 사라진 순간) 그 토큰은 완전히 죽습니다.
-- authenticated 역할은 auth.sessions에 직접 SELECT 권한이 없어 security definer로 우회합니다.
create or replace function session_is_active()
returns boolean
language sql
security definer
set search_path = auth, public
stable
as $$
  select exists (
    select 1 from auth.sessions where id = (auth.jwt()->>'session_id')::uuid
  );
$$;
grant execute on function session_is_active() to authenticated;

-- 로그인하지 않으면 auth.uid()가 null이라 모든 정책이 자동으로 거절합니다.
-- anon 역할에는 아무 정책도 주지 않아 비로그인 접근이 구조적으로 막힙니다.
alter table plans enable row level security;
alter table plan_revisions enable row level security;
alter table tasks enable row level security;
alter table execution_records enable row level security;
alter table review_notes enable row level security;

create policy plans_select on plans for select using (auth.uid() = user_id and session_is_active());
create policy plans_insert on plans for insert with check (auth.uid() = user_id and session_is_active());
create policy plans_update on plans for update using (auth.uid() = user_id and session_is_active()) with check (auth.uid() = user_id and session_is_active());
-- DELETE 정책 없음 → 하드 삭제 불가, deleted_at 소프트 삭제만 가능합니다.

create policy plan_revisions_select on plan_revisions for select using (auth.uid() = user_id and session_is_active());
create policy plan_revisions_insert on plan_revisions for insert with check (auth.uid() = user_id and session_is_active());
-- UPDATE/DELETE 정책 없음 → 계획 개정 이력은 항상 append-only입니다.

create policy tasks_select on tasks for select using (auth.uid() = user_id and session_is_active());
create policy tasks_insert on tasks for insert with check (auth.uid() = user_id and session_is_active());
create policy tasks_update on tasks for update using (auth.uid() = user_id and session_is_active()) with check (auth.uid() = user_id and session_is_active());
-- DELETE 정책 없음 → 하드 삭제 불가, deleted_at 소프트 삭제만 가능합니다.

create policy execution_records_select on execution_records for select using (auth.uid() = user_id and session_is_active());
create policy execution_records_insert on execution_records for insert with check (auth.uid() = user_id and session_is_active());
-- UPDATE/DELETE 정책 없음 → 실행기록은 항상 append-only입니다.

create policy review_notes_select on review_notes for select using (auth.uid() = user_id and session_is_active());
create policy review_notes_insert on review_notes for insert with check (auth.uid() = user_id and session_is_active());
-- UPDATE/DELETE 정책 없음 → 고칠 점 이력도 항상 append-only입니다.

-- ── 계정 삭제 (카드 5) ───────────────────────────────────────────
-- auth.users 레코드 자체를 지우려면 service_role 키(관리자 API)가 필요해 클라이언트에서
-- 직접 호출할 수 없습니다. 대신 로그인한 본인 권한으로 자신의 데이터 행만 전부 하드 삭제하는
-- 함수를 둡니다 — RLS 범위 안에서 동작하므로 남의 행은 건드릴 수 없습니다.
create or replace function delete_my_data()
returns void language plpgsql security invoker as $$
begin
  delete from execution_records where user_id = auth.uid();
  delete from review_notes where user_id = auth.uid();
  update plans set carried_from_review_id = null where user_id = auth.uid();
  delete from tasks where user_id = auth.uid();
  delete from plan_revisions where user_id = auth.uid();
  delete from plans where user_id = auth.uid();
end;
$$;
grant execute on function delete_my_data() to authenticated;
