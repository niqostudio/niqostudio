-- 開発用 seed（製品マスタのみ・完全フィクションのコード）。本番の products は core からの sync で投入される。
insert into identity.products (code, name) values
  ('demo-app', 'Demo App'),
  ('demo-tool', 'Demo Tool')
on conflict (code) do nothing;
