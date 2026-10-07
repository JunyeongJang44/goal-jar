-- Supabase 프로젝트의 SQL Editor 에 붙여넣고 실행하세요.
-- (supabase.com > 프로젝트 > SQL Editor > New query > Run)
--
-- 목표(goals)를 여러 개 만들 수 있고, 각 목표에 입금/출금(transactions)을 기록한다.
-- 로그인 없이 링크 아는 사람 누구나 읽기/쓰기 가능 (RLS 전체 허용).

-- 1) 목표 테이블 (여러 행)
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '새 목표',
  emoji         text not null default '🎯',
  target_amount bigint not null default 0,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz           -- 소프트 딜리트: null 이면 활성, 값 있으면 삭제됨
);

-- 2) 입출금 기록 테이블
--    type: 'deposit'(입금) | 'withdraw'(출금)
--    amount: 항상 양수. 누적액 계산 시 type 으로 더하고 뺀다.
--    memo: 코멘트, 10자 이하 (DB 제약으로 강제)
create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  name       text not null default '익명',
  type       text not null default 'deposit' check (type in ('deposit', 'withdraw')),
  amount     bigint not null check (amount > 0),
  memo       text check (char_length(memo) <= 10),
  created_at timestamptz not null default now(),
  deleted_at timestamptz           -- 소프트 딜리트: null 이면 활성, 값 있으면 삭제됨
);

create index if not exists transactions_goal_idx
  on public.transactions (goal_id, created_at desc);

-- 3) RLS: 로그인 없이 누구나 읽기/쓰기
alter table public.goals        enable row level security;
alter table public.transactions enable row level security;

create policy "goals public read"   on public.goals        for select using (true);
create policy "goals public write"  on public.goals        for all    using (true) with check (true);
create policy "tx public read"       on public.transactions for select using (true);
create policy "tx public write"      on public.transactions for all    using (true) with check (true);

-- 4) 실시간(Realtime) 활성화
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.transactions;
