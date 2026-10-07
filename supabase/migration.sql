-- 통합 마이그레이션: 소프트 딜리트 + 이모지 (이미 테이블이 생성된 프로젝트용)
-- Supabase SQL Editor 에 붙여넣고 Run 한 번이면 됩니다. 기존 데이터는 보존됩니다.
-- (migration_soft_delete.sql + migration_emoji.sql 를 합친 것)

-- 소프트 딜리트 컬럼
alter table public.goals        add column if not exists deleted_at timestamptz;
alter table public.transactions add column if not exists deleted_at timestamptz;

-- 목표 이모지 컬럼
alter table public.goals add column if not exists emoji text not null default '🎯';

-- 활성 행 조회용 부분 인덱스 (선택)
create index if not exists goals_active_idx
  on public.goals (created_at) where deleted_at is null;
create index if not exists transactions_active_idx
  on public.transactions (goal_id, created_at desc) where deleted_at is null;

-- 복구가 필요할 때 (어드민 수동):
--   update public.transactions set deleted_at = null where id = '...';
--   update public.goals        set deleted_at = null where id = '...';
