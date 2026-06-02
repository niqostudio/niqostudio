-- 開発用ダミーシード（完全フィクション）。実顧客データは絶対に入れない。
-- 本番データは Supabase Studio から投入する（README / operations.md）。
-- db:reset 時に supabase/config.toml の [db.seed] から読み込まれ、スキーマ整合と RLS を検証できる。

-- プロフィール（singleton）
insert into public.profile (
  id, display_name, handle, tagline, bio, skills,
  operation_policy, contact_email, social_links, logo_svg
) values (
  'singleton',
  'DUMMY STUDIO',
  'dummystudio',
  'つくるを、ちいさく。',
  '開発用のダミープロフィール。',
  array['Web', 'Astro', 'Supabase'],
  'ダミーの運用方針。',
  'hello@example.com',
  '[{"label": "GitHub", "url": "https://example.com/github"}]'::jsonb,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>'
);

-- クライアント（公開実績に紐づく架空企業）
insert into public.clients (
  id, slug, public_name, real_name, is_public_name_allowed,
  industry, size, description, display_order
) values (
  '11111111-1111-4111-8111-111111111111',
  'fic-bakery', '架空ベーカリー', 'ダミー商号（非公開）', true,
  '飲食', 'small', '開発用のダミークライアント。', 1
);

-- 実績（works・公開）
insert into public.works (
  slug, title, client_id, period, scope, tech_stack,
  summary, public_url, status, display_order
) values (
  'fic-bakery-site', '架空ベーカリーの公式サイト',
  '11111111-1111-4111-8111-111111111111', '2026',
  array['Web', 'Design'], array['Astro', 'Supabase'],
  'ダミーの実績概要。', 'https://example.com', 'published', 1
);

-- 事例（cases・公開）
insert into public.cases (
  slug, title, summary, client_id, problem, solution, outcome,
  metrics, status, published_at, display_order
) values (
  'fic-bakery-growth', '架空ベーカリーの集客改善', 'ダミーの事例サマリ。',
  '11111111-1111-4111-8111-111111111111',
  'ダミーの課題。', 'ダミーの解決策。', 'ダミーの成果。',
  '[{"label": "来店数", "before": "100", "after": "180"}]'::jsonb,
  'published', '2026-03-01', 1
);

-- サービス（公開）
insert into public.services (
  slug, name, name_ja, headline, summary, target_pains, coverage,
  deliverables, pricing, price_min, currency, duration, is_active, display_order
) values (
  'web-starter', 'Web Starter', 'ウェブ・スターター', '小さく始める Web 制作',
  'ダミーのサービス概要。', array['集客が弱い'], array['設計', '実装'],
  array['サイト一式'], '{"plan": "starter"}'::jsonb, 100000, 'JPY', '4週間', true, 1
);
