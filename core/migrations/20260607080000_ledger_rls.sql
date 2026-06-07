-- migrate:up
-- dbmate の適用台帳は public に作られる。public は Data API へ露出させず REVOKE 済みだが、
-- Supabase の既定権限で新規 public テーブルが anon に grant され得るため、deny-all RLS を
-- 有効化して多層防御する（dbmate は BYPASSRLS 接続のため自身の記録には無影響）。
alter table public.core_migrations enable row level security;

-- migrate:down
alter table public.core_migrations disable row level security;
