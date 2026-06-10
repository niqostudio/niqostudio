-- migrate:up
-- メトリクスのカタログ（マスタ）。機械的（technical・スクリプト測定可）とビジネス観点（business）を区別し、
-- 手動のものは測り方（howto）を持つ。studio で編集する。metrics（値）はここを参照せず反映時に label/unit/kind をコピー。
create table core.metric_definitions (
  id uuid default gen_random_uuid() not null,
  key text not null,
  label text not null,
  unit text,
  kind text default 'business'::text not null,
  auto boolean default false not null,
  howto text,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint metric_definitions_pkey primary key (id),
  constraint metric_definitions_key_key unique (key),
  constraint metric_definitions_kind_check check (kind = any (array['technical'::text, 'business'::text]))
);

create trigger set_updated_at_metric_definitions before update on core.metric_definitions
  for each row execute function core.set_updated_at();

alter table core.metric_definitions enable row level security;

grant all on table core.metric_definitions to service_role;

-- 初期カタログ。technical（auto＝PageSpeed Insights で測定）＋ business（手動・測り方つき）。
insert into core.metric_definitions (key, label, unit, kind, auto, howto, sort_order) values
  ('performance',    'Performance',    '点', 'technical', true,  null, 10),
  ('seo',            'SEO',            '点', 'technical', true,  null, 20),
  ('accessibility',  'Accessibility',  '点', 'technical', true,  null, 30),
  ('best_practices', 'Best Practices', '点', 'technical', true,  null, 40),
  ('lcp',            'LCP',            'ms', 'technical', true,  null, 50),
  ('cls',            'CLS',            '',   'technical', true,  null, 60),
  ('tbt',            'TBT',            'ms', 'technical', true,  null, 70),
  ('fcp',            'FCP',            'ms', 'technical', true,  null, 80),
  ('speed_index',    'Speed Index',    'ms', 'technical', true,  null, 90),
  ('ttfb',           'TTFB',           'ms', 'technical', true,  null, 100),
  ('page_kb',        'ページサイズ',   'KB', 'technical', true,  null, 110),
  ('dom_size',       'DOM要素数',      '要素','technical', true,  null, 120),
  ('cvr',            'コンバージョン率','%',  'business',  false, 'GA4 等で「CV数 ÷ セッション数 ×100」。before/after で計測期間を揃える。', 200),
  ('inquiries',      '問い合わせ数',   '件', 'business',  false, '同一期間の問い合わせ件数（このシステムの一覧、または GA4 のイベント）。', 210),
  ('revenue',        '売上',           '円', 'business',  false, '会計（freee 等）の対象期間の売上。税抜で揃える。', 220);

-- migrate:down
drop table if exists core.metric_definitions;
