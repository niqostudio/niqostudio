-- 表示順を display_priority（降順・大きいほど先・0=末尾）に統一。公開 featured 一覧（services・curation）だけが持つ。
-- 既存 display_order の視覚順を保つため値を反転（scope ごとに max+1-display_order）＝website の表示順は不変。
-- truth 子＋clients の display_order は撤去（authoring 順は studio draft が持つ）。
-- project_statuses の並びは「優先度」でなく「パイプラインのシーケンス」なので別概念（sort_order のまま・touch しない）。

-- 公開 view は display_order に依存するため先に落とす（後で display_priority で作り直す）。
DROP VIEW IF EXISTS public.showcases;

-- 1) 公開 featured 一覧：display_order → display_priority（順序保存の反転）。

-- services（scope=全体）
ALTER TABLE public.services ADD COLUMN display_priority integer NOT NULL DEFAULT 0;
UPDATE public.services t SET display_priority = sub.dp
  FROM (SELECT id, (max(display_order) OVER () + 1 - display_order) AS dp FROM public.services) sub
  WHERE t.id = sub.id;
ALTER TABLE public.services DROP COLUMN display_order;
CREATE INDEX idx_services_priority ON public.services(display_priority DESC);

-- showcase_entries（scope=全体）
ALTER TABLE public.showcase_entries ADD COLUMN display_priority integer NOT NULL DEFAULT 0;
UPDATE public.showcase_entries t SET display_priority = sub.dp
  FROM (SELECT id, (max(display_order) OVER () + 1 - display_order) AS dp FROM public.showcase_entries) sub
  WHERE t.id = sub.id;
ALTER TABLE public.showcase_entries DROP COLUMN display_order;
CREATE INDEX idx_showcase_entries_priority ON public.showcase_entries(display_priority DESC);

-- showcase_problems / _deliverables / _metrics（scope=showcase_id）
ALTER TABLE public.showcase_problems ADD COLUMN display_priority integer NOT NULL DEFAULT 0;
UPDATE public.showcase_problems t SET display_priority = sub.dp
  FROM (SELECT showcase_id, problem_id, (max(display_order) OVER (PARTITION BY showcase_id) + 1 - display_order) AS dp FROM public.showcase_problems) sub
  WHERE t.showcase_id = sub.showcase_id AND t.problem_id = sub.problem_id;
ALTER TABLE public.showcase_problems DROP COLUMN display_order;

ALTER TABLE public.showcase_deliverables ADD COLUMN display_priority integer NOT NULL DEFAULT 0;
UPDATE public.showcase_deliverables t SET display_priority = sub.dp
  FROM (SELECT showcase_id, deliverable_id, (max(display_order) OVER (PARTITION BY showcase_id) + 1 - display_order) AS dp FROM public.showcase_deliverables) sub
  WHERE t.showcase_id = sub.showcase_id AND t.deliverable_id = sub.deliverable_id;
ALTER TABLE public.showcase_deliverables DROP COLUMN display_order;

ALTER TABLE public.showcase_metrics ADD COLUMN display_priority integer NOT NULL DEFAULT 0;
UPDATE public.showcase_metrics t SET display_priority = sub.dp
  FROM (SELECT showcase_id, metric_id, (max(display_order) OVER (PARTITION BY showcase_id) + 1 - display_order) AS dp FROM public.showcase_metrics) sub
  WHERE t.showcase_id = sub.showcase_id AND t.metric_id = sub.metric_id;
ALTER TABLE public.showcase_metrics DROP COLUMN display_order;

-- 2) truth 子＋clients：authoring 順は studio へ。core からは撤去。
ALTER TABLE public.requirements DROP COLUMN display_order;
ALTER TABLE public.problems DROP COLUMN display_order;
ALTER TABLE public.scope_items DROP COLUMN display_order;
ALTER TABLE public.project_decisions DROP COLUMN display_order;
ALTER TABLE public.deliverables DROP COLUMN display_order;
ALTER TABLE public.metrics DROP COLUMN display_order;
ALTER TABLE public.project_repositories DROP COLUMN display_order;
ALTER TABLE public.clients DROP COLUMN display_order;

-- 3) 公開 view を display_priority DESC で作り直す（cases 順は website 側の order・子はここで DESC 集約）。
CREATE VIEW public.showcases AS
SELECT
  s.slug,
  s.title,
  s.summary,
  s.thumbnail_url,
  s.period,
  s.display_priority,
  s.project_id,
  p.tech_stack,
  CASE WHEN n.publish_testimonial THEN p.testimonial END AS testimonial,
  CASE WHEN s.client_display = 'named' AND c.is_public_name_allowed THEN c.public_name END AS client_name,
  CASE WHEN s.client_display IN ('named', 'anonymized') THEN c.industry END AS client_industry,
  CASE WHEN n.publish_problems THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('problem', pr.problem, 'solution', pr.solution, 'outcome', pr.outcome) ORDER BY sp.display_priority DESC)
    FROM public.showcase_problems sp
    JOIN public.problems pr ON pr.id = sp.problem_id
    WHERE sp.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS problems,
  CASE WHEN n.publish_deliverables THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('kind', d.kind, 'name', d.name, 'url', d.url, 'images', d.image_urls) ORDER BY sd.display_priority DESC)
    FROM public.showcase_deliverables sd
    JOIN public.deliverables d ON d.id = sd.deliverable_id
    WHERE sd.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS deliverables,
  CASE WHEN n.publish_metrics THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', m.label, 'achieved', m.achieved, 'previous', m.previous, 'unit', m.unit, 'kind', m.kind) ORDER BY sm.display_priority DESC)
    FROM public.showcase_metrics sm
    JOIN public.metrics m ON m.id = sm.metric_id
    WHERE sm.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS metrics
FROM public.showcase_entries s
JOIN public.projects p ON p.id = s.project_id
LEFT JOIN public.ndas n ON n.project_id = p.id
LEFT JOIN public.clients c ON c.id = p.client_id
WHERE s.status = 'published';

GRANT SELECT ON public.showcases TO anon;
