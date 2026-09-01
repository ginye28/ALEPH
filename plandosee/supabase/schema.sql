-- 플랜두씨 다이어리 (6N.md) — Supabase 스키마.
-- Supabase 프로젝트의 SQL 편집기에서 이 파일 전체를 한 번 실행합니다.
--
-- 설계 원칙:
--   1. 계획은 고치지 않고 갈아엎지도 않습니다 — plan_revisions에 이력만 쌓습니다 (T06-C08).
--   2. 계획·할일 삭제는 하드 삭제가 아니라 deleted_at 소프트 삭제입니다. 둘 다 DELETE 정책이
--      아예 없어 anon 키로도 하드 삭제가 구조적으로 불가능합니다 (T06-C28 "지우지 않은" 요건).
--      계획을 지워도 그 계획의 개정 이력·할일·실행기록은 그대로 DB에 남습니다 — 목록에서만 빠집니다.
--   3. 완료는 이벤트가 아니라 상태입니다 — status/completed_at을 WHERE로 가드해 갱신하므로
--      두 번 눌러도 쌓일 무언가 자체가 없습니다 (T06-C21·C22).
--   4. 이력 테이블(plan_revisions·execution_records·review_notes)은 UPDATE/DELETE 정책을
--      아예 두지 않아 RLS 수준에서 항상 append-only입니다.
--   5. 로그인이 없으므로 SELECT/INSERT는 anon에게 넓게 열려 있습니다. 이것은 진짜 접근
--      통제가 아니라 "링크를 아는 사람은 볼 수 있다"는 6N.md의 명시된 전제입니다.
--      잠그는 일은 과제 7의 몫입니다.

create extension if not exists pgcrypto;

-- ── 계획 (카드 1) ────────────────────────────────────────────────
create table plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  carried_from_review_id uuid null,
  deleted_at timestamptz null
);

create table plan_revisions (
  id uuid primary key default gen_random_uuid(),
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
create index plan_revisions_plan_idx on plan_revisions (plan_id, revision_no desc);

-- 계획마다 최신 개정본 한 줄. "현재 계획"은 항상 이 뷰에서 다시 구합니다 — 캐시하지 않습니다.
create view plan_current as
  select distinct on (plan_id) *
  from plan_revisions
  order by plan_id, revision_no desc;

-- ── 할 일 (카드 2) ───────────────────────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
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
create index tasks_plan_idx on tasks (plan_id) where deleted_at is null;
create index tasks_due_idx on tasks (due_date) where deleted_at is null;

-- ── 실행 기록 (카드 3) ───────────────────────────────────────────
create table execution_records (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id),
  started_at timestamptz not null,
  ended_at timestamptz null,
  actual_minutes int not null check (actual_minutes >= 0),
  blocked_reason text null,
  created_at timestamptz not null default now(),
  constraint execution_time_order check (ended_at is null or ended_at >= started_at)
);
create index execution_task_idx on execution_records (task_id);

-- ── 돌아보기의 "고칠 점" 이력 (카드 4) ───────────────────────────
create table review_notes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id),
  note text not null,
  created_at timestamptz not null default now()
);

alter table plans
  add constraint plans_carried_from_review_fk
  foreign key (carried_from_review_id) references review_notes(id);

-- ── 돌아보기 집계 함수 ───────────────────────────────────────────
-- p_today는 반드시 클라이언트가 KST 기준으로 계산한 날짜 문자열을 넘깁니다.
-- DB의 now()/CURRENT_DATE(UTC)를 신뢰하면 KST 자정 근처에서 하루 밀립니다.
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
grant execute on function plan_review(uuid, date) to anon, authenticated;

-- ── RLS ──────────────────────────────────────────────────────────
alter table plans enable row level security;
alter table plan_revisions enable row level security;
alter table tasks enable row level security;
alter table execution_records enable row level security;
alter table review_notes enable row level security;

create policy plans_select on plans for select using (true);
create policy plans_insert on plans for insert with check (true);
create policy plans_update on plans for update using (true) with check (true);
-- DELETE 정책 없음 → 하드 삭제 불가, deleted_at 소프트 삭제만 가능합니다 (tasks와 같은 방식).

create policy plan_revisions_select on plan_revisions for select using (true);
create policy plan_revisions_insert on plan_revisions for insert with check (true);

create policy tasks_select on tasks for select using (true);
create policy tasks_insert on tasks for insert with check (true);
create policy tasks_update on tasks for update using (true) with check (true);
-- DELETE 정책 없음 → 하드 삭제 불가, deleted_at 소프트 삭제만 가능합니다.

create policy execution_records_select on execution_records for select using (true);
create policy execution_records_insert on execution_records for insert with check (true);
-- UPDATE/DELETE 정책 없음 → 실행기록은 항상 append-only입니다.

create policy review_notes_select on review_notes for select using (true);
create policy review_notes_insert on review_notes for insert with check (true);
-- UPDATE/DELETE 정책 없음 → 고칠 점 이력도 항상 append-only입니다.
