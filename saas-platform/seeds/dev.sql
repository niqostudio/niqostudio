-- 開発用 seed（製品マスタのみ）。本番の products は Supabase Studio から投入する。
insert into identity.products (code, name) values
  ('lstep-hub', 'Lステップ連携ハブ'),
  ('sindo', 'sindo'),
  ('cmsify', 'cmsify'),
  ('preflight', 'preflight')
on conflict (code) do nothing;
