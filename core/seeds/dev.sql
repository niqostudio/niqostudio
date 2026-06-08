-- 開発用ダミーシード（完全フィクション）。実顧客データは絶対に入れない。
-- 本番データは Supabase Studio から投入する（README / operations.md）。
-- db:reset 時に supabase/config.toml の [db.seed] から読み込まれ、スキーマ整合と RLS を検証できる。

-- プロフィール（singleton）
insert into core.profile (
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
insert into core.services (
  id, slug, name, name_ja, headline, summary, target_pains, coverage,
  deliverables, pricing, price_min, currency, duration, is_active, display_priority
) values (
  '66666666-6666-4666-8666-666666666666',
  'web-renewal', 'Web Renewal', 'ウェブ・リニューアル', 'サイト刷新と運用改善',
  'ダミーのサービス概要。', array['更新できない', '集客が弱い'], array['設計', '実装', 'CMS'],
  array['サイト一式', 'CMS 配線'], '{"plan": "renewal"}'::jsonb, 300000, 'JPY', '6週間', true, 10
);

-- クライアント（公開実績に紐づく架空企業）
insert into core.clients (
  id, slug, public_name, real_name, is_public_name_allowed,
  industry, size, description
) values (
  '11111111-1111-4111-8111-111111111111',
  'fic-bakery', '架空ベーカリー', 'ダミー商号（非公開）', true,
  '飲食', 'small', '開発用のダミークライアント。'
);

-- 案件（projects）。service_id＝提供サービス・tech_stack＝技術＋横断基盤・testimonial＝顧客の声。
insert into core.projects (
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
insert into core.requirements (id, project_id, content, note) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'スマホで予約を受けたい', 'すり合わせ初回'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', '商品写真を活かしたい', null);

-- 課題→対応→結果（problems・1:N）。現状〔as-is〕は problem の文脈に含む。
insert into core.problems (id, project_id, problem, solution, outcome) values
  ('88888888-8888-4888-8888-888888888881', '22222222-2222-4222-8222-222222222222',
   '公式サイトが古く更新されず、集客導線がない', 'Astro で公式サイトを再構築し導線を設計', '検索流入と来店が増加'),
  ('88888888-8888-4888-8888-888888888882', '22222222-2222-4222-8222-222222222222',
   '予約が電話のみで取りこぼし・二重予約が発生', '予約管理システムを新設', '取りこぼし減・処理時間を短縮');

-- スコープ（scope_items・作る/作らない）
insert into core.scope_items (id, project_id, item, included, note) values
  ('99999999-9999-4999-8999-999999999991', '22222222-2222-4222-8222-222222222222', '予約管理システム', true, '今回の中核'),
  ('99999999-9999-4999-8999-999999999992', '22222222-2222-4222-8222-222222222222', 'ネット決済', false, '次フェーズで検討');

-- 設計判断（project_decisions・ADR）
insert into core.project_decisions (id, project_id, topic, decision, rationale, status) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222',
   'ホスティング', 'Cloudflare を採用', 'コストと配信速度の両立。', 'accepted');

-- 成果物（deliverables・url＋スクショ）
insert into core.deliverables (id, project_id, kind, name, description, url, image_urls) values
  ('33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222222', 'public_web', '公式サイト', 'ダミーの公開サイト。', 'https://example.com', array['https://example.com/og.png']),
  ('33333333-3333-4333-8333-333333333332', '22222222-2222-4222-8222-222222222222', 'business_system', '予約管理システム', 'ダミーの業務システム。', null, '{}');

-- メトリクス（metrics・goal は内部のみ）
insert into core.metrics (id, project_id, deliverable_id, label, achieved, previous, goal, unit, kind) values
  ('44444444-4444-4444-8444-444444444441', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333331', 'LCP', '1.6', '4.2', null, 's', 'technical'),
  ('44444444-4444-4444-8444-444444444442', '22222222-2222-4222-8222-222222222222', null, '月間来店数', '180', '100', '150', '件/月', 'business'),
  ('44444444-4444-4444-8444-444444444443', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333332', '予約処理時間', '3', '15', null, '分/件', 'business');

-- NDA 同意（ndas・案件ごと・カテゴリ単位の公開可否）
insert into core.ndas (id, project_id, reference, agreed_on, status, publish_problems, publish_deliverables, publish_metrics, publish_testimonial) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '22222222-2222-4222-8222-222222222222', 'NDA-2026-001', '2026-01-15', 'agreed', true, true, true, true);

-- 事例（showcase_entries・curation）。同一 project に 2 件＝1案件:N を例示。
insert into core.showcase_entries (
  id, project_id, slug, title, summary, thumbnail_url, period, client_display, status, display_priority
) values
  ('55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222222',
   'fic-bakery-site', '公式サイトのリニューアルで集客を改善', 'ダミーの事例サマリ（公開）。', 'https://example.com/og.png', '2026 Q1', 'named', 'published', 20),
  ('55555555-5555-4555-8555-555555555552', '22222222-2222-4222-8222-222222222222',
   'fic-bakery-ops', '予約業務の手間を削減', 'ダミーの事例サマリ（公開・匿名）。', null, '2026 Q1', 'anonymized', 'published', 10);

-- 選択（事例ごとに公開する課題・成果物・数値）。display_priority は降順（大きいほど先）。
insert into core.showcase_problems (showcase_id, problem_id, display_priority) values
  ('55555555-5555-4555-8555-555555555551', '88888888-8888-4888-8888-888888888881', 10),
  ('55555555-5555-4555-8555-555555555552', '88888888-8888-4888-8888-888888888882', 10);

insert into core.showcase_deliverables (showcase_id, deliverable_id, display_priority) values
  ('55555555-5555-4555-8555-555555555551', '33333333-3333-4333-8333-333333333331', 10),
  ('55555555-5555-4555-8555-555555555552', '33333333-3333-4333-8333-333333333332', 10);

insert into core.showcase_metrics (showcase_id, metric_id, display_priority) values
  ('55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444441', 20),
  ('55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444442', 10),
  ('55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444443', 10);

-- 問い合わせ（inquiries・公開フォーム由来のダミー）。契約フローの各段階を網羅：
-- new（未対応）→ responded（一次返信・無料相談調整）→ converted（受注＝案件化）／ archived（見送り）。
insert into core.inquiries (id, name, company, email, subject, message, status, internal_notes, delivery_status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '架空 太郎', '架空ベーカリー', 'taro@example.com',
   'サイトのリニューアル相談', 'ダミーの本文。予約導線を整えたい。', 'new', null, 'delivered'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '架空 花子', null, 'hanako@example.com',
   '保守の見積もり', 'ダミーの本文。既存サイトの保守を相談したい。', 'responded', '一次返信済み。無料相談を調整中。', 'delivered'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', '架空 次郎', '架空商店', 'jiro@example.com',
   '無料相談の希望', 'ダミーの本文。新規 EC を検討したい。', 'converted', '無料相談→事前設計へ。案件化済み。', 'delivered'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', '架空 三郎', null, 'saburo@example.com',
   '料金について', 'ダミーの本文。予算が合わず見送り。', 'archived', '予算未達で見送り。', 'delivered'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd5', '架空 四子', '架空デザイン', 'shiko@example.com',
   'コーポレートサイト制作', 'ダミーの本文。会社案内サイトを作りたい。', 'new', null, 'bounced');


-- === 追加ダミー（バリエーション）：services / clients / products / projects / inquiries ===

-- サービス追加（is_active=false の保守も含む）
insert into core.services (id, slug, name, name_ja, headline, summary, target_pains, coverage, deliverables, pricing, price_min, currency, duration, is_active, display_priority) values
  ('66666666-6666-4666-8666-666666666602', 'biz-system', 'Business System', '業務システム構築', '社内業務の自動化と一元管理', 'ダミーのサービス概要。', array['手作業が多い','二重入力'], array['要件定義','実装','運用'], array['管理画面','DB 設計'], '{"plan":"system"}'::jsonb, 800000, 'JPY', '3ヶ月', true, 20),
  ('66666666-6666-4666-8666-666666666603', 'maintenance', 'Maintenance', '保守・運用', '継続的な改善と安定運用', 'ダミーのサービス概要。', array['更新が滞る','障害対応'], array['監視','更新','改善'], array['月次レポート','改善対応'], '{"plan":"retainer"}'::jsonb, 30000, 'JPY', '月額', false, 5);

-- クライアント追加（業種/規模バリエーション・1社は匿名 is_public_name_allowed=false）
insert into core.clients (id, slug, public_name, real_name, is_public_name_allowed, industry, size, description) values
  ('11111111-1111-4111-8111-111111111102', 'fic-clinic', '架空クリニック', 'ダミー医療法人', true, '医療', 'small', '開発用ダミー。'),
  ('11111111-1111-4111-8111-111111111103', 'fic-apparel', '架空アパレル', 'ダミー商号（非公開）', false, '小売', 'medium', '開発用ダミー（匿名）。'),
  ('11111111-1111-4111-8111-111111111104', 'fic-saas', '架空ソフトウェア', 'ダミー株式会社', true, 'IT', 'large', '開発用ダミー。');

-- 顧客担当者（contacts・会社に紐づく人。問い合わせ変換・案件化で生成される想定）
insert into core.contacts (id, client_id, name, email, phone, role, notes) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '11111111-1111-4111-8111-111111111111', '架空 太郎', 'taro@example.com', '090-0000-0001', '店主', '架空ベーカリーの担当者。'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '11111111-1111-4111-8111-111111111102', '架空 五郎', 'goro@example.com', null, '事務長', '架空クリニックの担当者（問い合わせ由来）。'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', null, '架空 見込', 'midumi@example.com', null, null, '会社未割当の見込み担当者（無料相談前）。');

-- 自社プロダクト（active / maintained / sunset の3状態）
insert into core.products (id, slug, name, summary, status, tech_stack, launched_on, internal_notes) values
  ('77777777-7777-4777-8777-777777777701', 'reserve-hub', '予約ハブ', '店舗向け予約管理 SaaS（ダミー）。', 'active', array['Next.js','Supabase','Cloudflare Workers'], '2026-02-01', '開発用ダミー製品。'),
  ('77777777-7777-4777-8777-777777777702', 'invoice-mini', '請求ミニ', '個人事業向け請求書 SaaS（ダミー）。', 'maintained', array['Astro','Supabase'], '2025-09-15', '開発用ダミー製品。'),
  ('77777777-7777-4777-8777-777777777703', 'old-analytics', '旧アナリティクス', '提供終了したダミー製品。', 'sunset', array['Remix'], '2024-04-01', 'sunset 例。');

-- プロダクト紐付けの課題/成果物/数値（product_id・project とは xor）
insert into core.problems (id, product_id, problem, solution, outcome) values
  ('88888888-8888-4888-8888-888888888701', '77777777-7777-4777-8777-777777777701', '店舗の予約が紙・電話で煩雑', '予約ハブで一元化', '取りこぼし減・処理短縮');
insert into core.deliverables (id, product_id, kind, name, description, url, image_urls) values
  ('33333333-3333-4333-8333-333333333701', '77777777-7777-4777-8777-777777777701', 'public_web', '予約ハブ LP', 'ダミー。', 'https://example.com/reserve', array['https://example.com/reserve-og.png']);
insert into core.metrics (id, product_id, deliverable_id, label, achieved, previous, goal, unit, kind) values
  ('44444444-4444-4444-8444-444444444701', '77777777-7777-4777-8777-777777777701', null, 'MRR', '120000', '80000', '200000', '円/月', 'business');

-- プロダクト事例（published / draft）
insert into core.showcase_entries (id, product_id, slug, title, summary, thumbnail_url, period, client_display, status, display_priority) values
  ('55555555-5555-4555-8555-555555555561', '77777777-7777-4777-8777-777777777701', 'reserve-hub-launch', '自社プロダクト「予約ハブ」をローンチ', 'ダミーの事例（自社製品）。', 'https://example.com/reserve-og.png', '2026 Q1', 'hidden', 'published', 30),
  ('55555555-5555-4555-8555-555555555562', '77777777-7777-4777-8777-777777777702', 'invoice-mini-intro', '請求ミニの紹介（下書き）', 'ダミー（下書き）。', null, '2025 Q3', 'hidden', 'draft', 5);
insert into core.showcase_problems (showcase_id, problem_id, display_priority) values
  ('55555555-5555-4555-8555-555555555561', '88888888-8888-4888-8888-888888888701', 10);
insert into core.showcase_deliverables (showcase_id, deliverable_id, display_priority) values
  ('55555555-5555-4555-8555-555555555561', '33333333-3333-4333-8333-333333333701', 10);
insert into core.showcase_metrics (showcase_id, metric_id, display_priority) values
  ('55555555-5555-4555-8555-555555555561', '44444444-4444-4444-8444-444444444701', 10);

-- 受託案件追加（新規 client/service に紐付け・状態バリエーション）
insert into core.projects (id, client_id, service_id, title, status, started_on, internal_notes, tech_stack) values
  ('22222222-2222-4222-8222-222222222301', '11111111-1111-4111-8111-111111111102', '66666666-6666-4666-8666-666666666602', '架空クリニックの予約・問診システム', 'active', '2026-04-01', '開発用ダミー案件。', array['Next.js','Supabase']);
insert into core.projects (id, client_id, service_id, title, status, started_on, ended_on, internal_notes, tech_stack, testimonial) values
  ('22222222-2222-4222-8222-222222222302', '11111111-1111-4111-8111-111111111103', '66666666-6666-4666-8666-666666666666', '架空アパレルの EC サイト構築', 'delivered', '2025-11-01', '2026-02-10', '開発用ダミー案件。', array['Astro','Shopify'], '{"quote":"売上が伸びました。","role":"EC 担当"}'::jsonb);
insert into core.projects (id, client_id, service_id, title, started_on, ended_on, internal_notes, tech_stack) values
  ('22222222-2222-4222-8222-222222222303', '11111111-1111-4111-8111-111111111104', '66666666-6666-4666-8666-666666666602', '架空ソフトウェアの社内管理システム', '2025-06-01', '2025-12-20', '開発用ダミー案件。', array['Next.js','Supabase']);
update core.projects set status = 'discovery' where id = '22222222-2222-4222-8222-222222222303';
update core.projects set status = 'active'    where id = '22222222-2222-4222-8222-222222222303';
update core.projects set status = 'delivered' where id = '22222222-2222-4222-8222-222222222303';
update core.projects set status = 'closed'    where id = '22222222-2222-4222-8222-222222222303';

-- 新案件の課題/要望（一覧に中身を持たせる）
insert into core.problems (id, project_id, problem, solution, outcome) values
  ('88888888-8888-4888-8888-888888888301', '22222222-2222-4222-8222-222222222301', '予約と問診が別々で患者対応に手間', '予約・問診を統合', '受付時間を短縮'),
  ('88888888-8888-4888-8888-888888888302', '22222222-2222-4222-8222-222222222302', 'EC が無く店頭のみ', 'EC サイトを構築', 'オンライン売上が発生');
insert into core.requirements (id, project_id, content, note) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb301', '22222222-2222-4222-8222-222222222301', 'LINE で予約を受けたい', 'すり合わせ初回');

-- 問い合わせ追加（converted は converted_contact_id で担当者に紐付け）
insert into core.inquiries (id, name, company, email, subject, message, status, converted_contact_id, internal_notes, delivery_status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd6', '架空 五郎', '架空クリニック', 'goro@example.com', '予約システムの相談', 'ダミー本文。予約・問診を統合したい。', 'converted', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '無料相談→案件化。', 'delivered'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd7', '架空 六美', null, 'rokumi@example.com', '料金プランの質問', 'ダミー本文。', 'responded', null, '一次返信済み。', 'delivered');

-- === 新機能のダミー（contacts 紐付け・工数・打合せ・返信） ===

-- 案件の主担当者（C: projects.contact_id）
update core.projects set contact_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1' where id = '22222222-2222-4222-8222-222222222222';
update core.projects set contact_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2' where id = '22222222-2222-4222-8222-222222222301';

-- 工数（work_logs）
insert into core.work_logs (id, project_id, worked_on, hours, task) values
  ('f0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', '2026-01-12', 6.0, '要件ヒアリング'),
  ('f0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', '2026-02-05', 8.5, 'サイト実装'),
  ('f0000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', '2026-03-01', 4.0, '予約システム調整');

-- 打ち合わせ（meetings・顧客/案件/問い合わせのいずれにも紐づく）
insert into core.meetings (id, client_id, project_id, inquiry_id, title, met_on, duration_min, status, notes) values
  ('f1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', null, 'キックオフ', '2026-01-10', 60, 'done', 'ダミー議事録。'),
  ('f1000000-0000-4000-8000-000000000002', null, null, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '無料相談', '2026-06-15', 30, 'scheduled', '問い合わせ由来の無料相談。');

-- 問い合わせ返信ログ（inquiry_replies）
insert into core.inquiry_replies (id, inquiry_id, body) values
  ('f2000000-0000-4000-8000-000000000001', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'お問い合わせありがとうございます。無料相談の日程を調整させてください。');

-- 請求書（invoices）。入金済・未入金・期日超過・下書き・案件なし保守 のバリエーション。
insert into core.invoices (id, client_id, project_id, invoice_no, title, subtotal, tax, status, issued_on, due_on, paid_on) values
  ('f3000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'INV-2026-001', '架空ベーカリー Web 制作 一括', 300000, 30000, 'paid', '2026-03-25', '2026-04-30', '2026-04-22'),
  ('f3000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222301', 'INV-2026-002', '架空クリニック 予約システム 着手金', 200000, 20000, 'sent', '2026-05-20', '2026-06-30', null),
  ('f3000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222302', 'INV-2026-003', '架空アパレル EC 構築 一括', 500000, 50000, 'sent', '2026-04-10', '2026-05-10', null),
  ('f3000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222303', null, '架空ソフトウェア 社内システム 最終', 800000, 80000, 'draft', null, null, null),
  ('f3000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', null, 'INV-2026-004', '月額保守 6月分', 30000, 3000, 'sent', '2026-06-01', '2026-06-30', null);

-- 源泉徴収・実入金の例（法人→個人の報酬で源泉される想定。入金額＝総額−源泉）。
update core.invoices set withholding = 30630, paid_amount = 299370 where id = 'f3000000-0000-4000-8000-000000000001';
-- 請求先住所の例。
update core.clients set address = '東京都架空区ダミー 1-2-3 架空ビル' where id = '11111111-1111-4111-8111-111111111111';

-- 追加プロジェクトの成果物（詳細ペインの成果物一覧・事例化の素材）。
insert into core.deliverables (id, project_id, kind, name, description, url, image_urls) values
  ('33333333-3333-4333-8333-333333334401', '22222222-2222-4222-8222-222222222301', 'business_system', '予約・問診統合システム', 'ダミー。予約と問診を1つに。', null, '{}'),
  ('33333333-3333-4333-8333-333333334402', '22222222-2222-4222-8222-222222222301', 'public_web', '医院案内サイト', 'ダミーの公開サイト。', 'https://example.com/clinic', array['https://example.com/clinic-og.png']),
  ('33333333-3333-4333-8333-333333334403', '22222222-2222-4222-8222-222222222302', 'public_web', 'EC サイト', 'ダミーの EC。', 'https://example.com/shop', array['https://example.com/shop-og.png']),
  ('33333333-3333-4333-8333-333333334404', '22222222-2222-4222-8222-222222222303', 'business_system', '社内管理システム', 'ダミーの業務システム。', null, '{}');

-- 成果物に紐づくメトリクス（before/after・goal は内部）。
insert into core.metrics (id, project_id, deliverable_id, label, achieved, previous, goal, unit, kind) values
  ('44444444-4444-4444-8444-444444444401', '22222222-2222-4222-8222-222222222301', '33333333-3333-4333-8333-333333334402', 'LCP', '1.4', '3.8', null, 's', 'technical'),
  ('44444444-4444-4444-8444-444444444402', '22222222-2222-4222-8222-222222222302', '33333333-3333-4333-8333-333333334403', '転換率', '2.8', '1.1', '2.5', '%', 'business');
