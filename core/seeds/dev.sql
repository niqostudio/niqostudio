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

-- サービス（公開）。projects.service_id が参照するため先に投入。
insert into public.services (
  id, slug, name, name_ja, headline, summary, target_pains, coverage,
  deliverables, pricing, price_min, currency, duration, is_active, display_order
) values (
  '66666666-6666-4666-8666-666666666666',
  'web-renewal', 'Web Renewal', 'ウェブ・リニューアル', 'サイト刷新と運用改善',
  'ダミーのサービス概要。', array['更新できない', '集客が弱い'], array['設計', '実装', 'CMS'],
  array['サイト一式', 'CMS 配線'], '{"plan": "renewal"}'::jsonb, 300000, 'JPY', '6週間', true, 1
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

-- 案件（projects）。service_id＝提供サービス・tech_stack＝技術＋横断基盤・testimonial＝顧客の声。
insert into public.projects (
  id, client_id, service_id, title, status, started_on, ended_on,
  internal_notes, tech_stack, testimonial
) values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  '架空ベーカリーの Web・業務改善', 'delivered', '2026-01-10', '2026-03-20',
  '開発用のダミー案件（内部メモ）。',
  array['Astro', 'Supabase', 'Cloudflare Workers', 'Terraform (IaC)'],
  '{"quote": "対応が丁寧で助かりました。", "role": "店主"}'::jsonb
);

-- 要望（requirements・すり合わせの生の声）
insert into public.requirements (id, project_id, content, note, display_order) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'スマホで予約を受けたい', 'すり合わせ初回', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', '商品写真を活かしたい', null, 2);

-- 課題→対応→結果（problems・1:N）。現状〔as-is〕は problem の文脈に含む。
insert into public.problems (id, project_id, problem, solution, outcome, display_order) values
  ('88888888-8888-4888-8888-888888888881', '22222222-2222-4222-8222-222222222222',
   '公式サイトが古く更新されず、集客導線がない', 'Astro で公式サイトを再構築し導線を設計', '検索流入と来店が増加', 1),
  ('88888888-8888-4888-8888-888888888882', '22222222-2222-4222-8222-222222222222',
   '予約が電話のみで取りこぼし・二重予約が発生', '予約管理システムを新設', '取りこぼし減・処理時間を短縮', 2);

-- スコープ（scope_items・作る/作らない）
insert into public.scope_items (id, project_id, item, included, note, display_order) values
  ('99999999-9999-4999-8999-999999999991', '22222222-2222-4222-8222-222222222222', '予約管理システム', true, '今回の中核', 1),
  ('99999999-9999-4999-8999-999999999992', '22222222-2222-4222-8222-222222222222', 'ネット決済', false, '次フェーズで検討', 2);

-- 設計判断（project_decisions・ADR）
insert into public.project_decisions (id, project_id, topic, decision, rationale, status, display_order) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222',
   'ホスティング', 'Cloudflare を採用', 'コストと配信速度の両立。', 'accepted', 1);

-- 成果物（deliverables・url＋スクショ）
insert into public.deliverables (id, project_id, kind, name, description, url, image_urls, display_order) values
  ('33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222222', 'public_web', '公式サイト', 'ダミーの公開サイト。', 'https://example.com', array['https://example.com/og.png'], 1),
  ('33333333-3333-4333-8333-333333333332', '22222222-2222-4222-8222-222222222222', 'business_system', '予約管理システム', 'ダミーの業務システム。', null, '{}', 2);

-- メトリクス（metrics・goal は内部のみ）
insert into public.metrics (id, project_id, deliverable_id, label, achieved, previous, goal, unit, kind, display_order) values
  ('44444444-4444-4444-8444-444444444441', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333331', 'LCP', '1.6', '4.2', null, 's', 'technical', 1),
  ('44444444-4444-4444-8444-444444444442', '22222222-2222-4222-8222-222222222222', null, '月間来店数', '180', '100', '150', '件/月', 'business', 2),
  ('44444444-4444-4444-8444-444444444443', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333332', '予約処理時間', '3', '15', null, '分/件', 'business', 3);

-- NDA 同意（ndas・案件ごと・カテゴリ単位の公開可否）
insert into public.ndas (id, project_id, reference, agreed_on, status, publish_problems, publish_deliverables, publish_metrics, publish_testimonial) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '22222222-2222-4222-8222-222222222222', 'NDA-2026-001', '2026-01-15', 'agreed', true, true, true, true);

-- 事例（showcase_entries・curation）。同一 project に 2 件＝1案件:N を例示。
insert into public.showcase_entries (
  id, project_id, slug, title, summary, thumbnail_url, period, client_display, status, display_order
) values
  ('55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222222',
   'fic-bakery-site', '公式サイトのリニューアルで集客を改善', 'ダミーの事例サマリ（公開）。', 'https://example.com/og.png', '2026 Q1', 'named', 'published', 1),
  ('55555555-5555-4555-8555-555555555552', '22222222-2222-4222-8222-222222222222',
   'fic-bakery-ops', '予約業務の手間を削減', 'ダミーの事例サマリ（公開・匿名）。', null, '2026 Q1', 'anonymized', 'published', 2);

-- 選択（事例ごとに公開する課題・成果物・数値）
insert into public.showcase_problems (showcase_id, problem_id, display_order) values
  ('55555555-5555-4555-8555-555555555551', '88888888-8888-4888-8888-888888888881', 1),
  ('55555555-5555-4555-8555-555555555552', '88888888-8888-4888-8888-888888888882', 1);

insert into public.showcase_deliverables (showcase_id, deliverable_id, display_order) values
  ('55555555-5555-4555-8555-555555555551', '33333333-3333-4333-8333-333333333331', 1),
  ('55555555-5555-4555-8555-555555555552', '33333333-3333-4333-8333-333333333332', 1);

insert into public.showcase_metrics (showcase_id, metric_id, display_order) values
  ('55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444441', 1),
  ('55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444442', 2),
  ('55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444443', 1);
