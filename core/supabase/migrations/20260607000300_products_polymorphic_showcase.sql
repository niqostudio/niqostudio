-- 公開事例の被写体を「有期の projects」だけでなく「継続の products」にも広げる。
-- truth は分離（projects＝client・NDA・consultation→closed／products＝NDA 無し・active/maintained/sunset）。
-- curation 子（problems/deliverables/metrics）と showcase_entries を被写体ポリモーフィック（project xor product）にし、
-- 公開 view が両者を同じ CaseView 形へ畳む（subject_kind で識別・website は /cases に一本化、将来 /products へ分割可）。

-- 1) products（継続実体＝自社所有。完了状態を持たないのが project との違い）。
CREATE TABLE core.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'active'
    CONSTRAINT products_status_check CHECK (status IN ('active', 'maintained', 'sunset')),
  tech_stack text[] NOT NULL DEFAULT '{}',
  launched_on date,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON core.products
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
ALTER TABLE core.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON core.products FROM anon, authenticated;

-- 2) 被写体ポリモーフィック化：project_id を nullable に下げ product_id を併設、XOR を CHECK で担保。
--    既存の客先行は project_id 有り・product_id null＝num_nonnulls=1 で無傷。
ALTER TABLE core.problems
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN product_id uuid REFERENCES core.products(id) ON DELETE CASCADE,
  ADD CONSTRAINT problems_subject_check CHECK (num_nonnulls(project_id, product_id) = 1);
CREATE INDEX idx_problems_product ON core.problems(product_id);

ALTER TABLE core.deliverables
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN product_id uuid REFERENCES core.products(id) ON DELETE CASCADE,
  ADD CONSTRAINT deliverables_subject_check CHECK (num_nonnulls(project_id, product_id) = 1);
CREATE INDEX idx_deliverables_product ON core.deliverables(product_id);

ALTER TABLE core.metrics
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN product_id uuid REFERENCES core.products(id) ON DELETE CASCADE,
  ADD CONSTRAINT metrics_subject_check CHECK (num_nonnulls(project_id, product_id) = 1);
CREATE INDEX idx_metrics_product ON core.metrics(product_id);

ALTER TABLE core.showcase_entries
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN product_id uuid REFERENCES core.products(id) ON DELETE CASCADE,
  ADD CONSTRAINT showcase_entries_subject_check CHECK (num_nonnulls(project_id, product_id) = 1);
CREATE INDEX idx_showcase_entries_product ON core.showcase_entries(product_id);

-- 3) 公開 view を作り直し：project/product を畳む。
--    product 被写体は自社所有のため NDA ゲート無しで公開（owned）。client は product 時 null（作り手は NIQO で暗黙）。
--    subject_kind を出して website が将来 /products と /cases を分割できるようにする（今は /cases に一本化）。
DROP VIEW IF EXISTS core.public_showcases;
CREATE VIEW core.public_showcases AS
SELECT
  s.slug,
  s.title,
  s.summary,
  s.thumbnail_url,
  s.period,
  s.display_priority,
  s.project_id,
  s.product_id,
  CASE WHEN s.product_id IS NOT NULL THEN 'product' ELSE 'project' END AS subject_kind,
  COALESCE(p.tech_stack, pr.tech_stack) AS tech_stack,
  CASE WHEN n.publish_testimonial THEN p.testimonial END AS testimonial,
  CASE WHEN s.product_id IS NULL AND s.client_display = 'named' AND c.is_public_name_allowed THEN c.public_name END AS client_name,
  CASE WHEN s.product_id IS NULL AND s.client_display IN ('named', 'anonymized') THEN c.industry END AS client_industry,
  CASE WHEN s.product_id IS NOT NULL OR n.publish_problems THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('problem', pr2.problem, 'solution', pr2.solution, 'outcome', pr2.outcome) ORDER BY sp.display_priority DESC)
    FROM core.showcase_problems sp JOIN core.problems pr2 ON pr2.id = sp.problem_id WHERE sp.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS problems,
  CASE WHEN s.product_id IS NOT NULL OR n.publish_deliverables THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('kind', d.kind, 'name', d.name, 'url', d.url, 'images', d.image_urls) ORDER BY sd.display_priority DESC)
    FROM core.showcase_deliverables sd JOIN core.deliverables d ON d.id = sd.deliverable_id WHERE sd.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS deliverables,
  CASE WHEN s.product_id IS NOT NULL OR n.publish_metrics THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', m.label, 'achieved', m.achieved, 'previous', m.previous, 'unit', m.unit, 'kind', m.kind) ORDER BY sm.display_priority DESC)
    FROM core.showcase_metrics sm JOIN core.metrics m ON m.id = sm.metric_id WHERE sm.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS metrics
FROM core.showcase_entries s
LEFT JOIN core.projects p ON p.id = s.project_id
LEFT JOIN core.products pr ON pr.id = s.product_id
LEFT JOIN core.ndas n ON n.project_id = p.id
LEFT JOIN core.clients c ON c.id = p.client_id
WHERE s.status = 'published';

GRANT SELECT ON core.public_showcases TO anon;
