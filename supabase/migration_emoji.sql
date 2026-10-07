-- 마이그레이션: 목표 이모지 컬럼 추가 (이미 테이블이 생성된 프로젝트용)
-- Supabase SQL Editor 에 붙여넣고 Run. 기존 데이터는 보존됩니다.

alter table public.goals add column if not exists emoji text not null default '🎯';
