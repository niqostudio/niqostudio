-- core を事業の正本へ。truth（projects＋子）× NDA 同意（ndas・カテゴリ単位の公開可否）× curation（showcase_entries＋選択結合）。
-- 公開は単一 view `showcases`（owner 権限で投影・anon は view のみ・published×選択×カテゴリ許可）。
-- truth 行は publishable を持たず、公開ゲートは ndas に集約。内部表は anon/authenticated REVOKE＋RLS（多層防御）。
-- works/cases は廃止。DB は showcase 語彙（公開 view=showcases / 編集元=showcase_entries）。website が「ケーススタディ/cases」へ翻訳。

-- 1) projects（engagement spine）：service_id＝提供サービス参照・tech_stack＝技術＋横断基盤・testimonial＝顧客の声。旧 scope は廃止。
ALTER TABLE public.projects
  ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN tech_stack text[] NOT NULL DEFAULT '{}',
  ADD COLUMN testimonial jsonb,
  DROP COLUMN scope;
CREATE INDEX idx_projects_service ON public.projects(service_id);

-- 2) requirements（すり合わせの生の要望。1案件:N）。
CREATE TABLE public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  note text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_requirements_project ON public.requirements(project_id);
CREATE TRIGGER set_updated_at_requirements BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.requirements FROM anon, authenticated;

-- 3) problems（課題→対応→結果のトリプル。1案件:N。現状〔as-is〕は problem の文脈に含む）。
CREATE TABLE public.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  problem text NOT NULL,
  solution text,
  outcome text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_problems_project ON public.problems(project_id);
CREATE TRIGGER set_updated_at_problems BEFORE UPDATE ON public.problems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.problems FROM anon, authenticated;

-- 4) scope_items（to_be 配下の作る/作らない。included=true で作る）。内部のみ。
CREATE TABLE public.scope_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item text NOT NULL,
  included boolean NOT NULL,
  note text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scope_items_project ON public.scope_items(project_id);
CREATE TRIGGER set_updated_at_scope_items BEFORE UPDATE ON public.scope_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.scope_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scope_items FROM anon, authenticated;

-- 5) project_decisions（ADR。topic は独立論点〔要望と 1:1 でない〕。superseded_by で撤回チェーン）。内部のみ。
CREATE TABLE public.project_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  topic text NOT NULL,
  decision text NOT NULL,
  rationale text,
  internal_notes text,
  status text NOT NULL DEFAULT 'accepted'
    CONSTRAINT project_decisions_status_check CHECK (status IN ('accepted', 'superseded')),
  superseded_by uuid REFERENCES public.project_decisions(id) ON DELETE SET NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_decisions_project ON public.project_decisions(project_id);
CREATE INDEX idx_project_decisions_superseded_by ON public.project_decisions(superseded_by);
CREATE TRIGGER set_updated_at_project_decisions BEFORE UPDATE ON public.project_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.project_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_decisions FROM anon, authenticated;

-- 6) deliverables（離散 OUTPUT。url＝公開先・image_urls＝成果物スクショ）。横断基盤は projects.tech_stack へ。
CREATE TABLE public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  description text,
  url text,
  image_urls text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliverables_project ON public.deliverables(project_id);
CREATE TRIGGER set_updated_at_deliverables BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deliverables FROM anon, authenticated;

-- 7) metrics（測定の正本。achieved＝結果〔必須〕・previous＝過去値・goal＝目標〔内部のみ・view 非露出〕）。
CREATE TABLE public.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deliverable_id uuid REFERENCES public.deliverables(id) ON DELETE SET NULL,
  label text NOT NULL,
  achieved text NOT NULL,
  previous text,
  goal text,
  unit text,
  kind text NOT NULL DEFAULT 'business'
    CONSTRAINT metrics_kind_check CHECK (kind IN ('technical', 'business')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_metrics_project ON public.metrics(project_id);
CREATE INDEX idx_metrics_deliverable ON public.metrics(deliverable_id);
CREATE TRIGGER set_updated_at_metrics BEFORE UPDATE ON public.metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.metrics FROM anon, authenticated;

-- 8) ndas（公開可否の正本＝案件ごと・カテゴリ単位の同意。truth 行は publishable を持たず gate は全部ここ）。
CREATE TABLE public.ndas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  reference text,
  agreed_on date,
  status text NOT NULL DEFAULT 'draft'
    CONSTRAINT ndas_status_check CHECK (status IN ('draft', 'agreed')),
  notes text,
  publish_problems boolean NOT NULL DEFAULT false,
  publish_deliverables boolean NOT NULL DEFAULT false,
  publish_metrics boolean NOT NULL DEFAULT false,
  publish_testimonial boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_updated_at_ndas BEFORE UPDATE ON public.ndas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.ndas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ndas FROM anon, authenticated;

-- 9) showcase_entries（curation＝1事例の front 体裁＋選択。物語の本体は projects/problems）。project に 1:N。
CREATE TABLE public.showcase_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text,
  thumbnail_url text,
  period text,
  client_display text NOT NULL DEFAULT 'anonymized'
    CONSTRAINT showcase_entries_client_display_check CHECK (client_display IN ('named', 'anonymized', 'hidden')),
  status text NOT NULL DEFAULT 'draft'
    CONSTRAINT showcase_entries_status_check CHECK (status IN ('draft', 'published', 'archived')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_showcase_entries_project ON public.showcase_entries(project_id);
CREATE INDEX idx_showcase_entries_status ON public.showcase_entries(status);
CREATE TRIGGER set_updated_at_showcase_entries BEFORE UPDATE ON public.showcase_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.showcase_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.showcase_entries FROM anon, authenticated;

-- 10) 選択結合（事例ごとに公開する problems/deliverables/metrics を選ぶ。複製ゼロ）。
CREATE TABLE public.showcase_problems (
  showcase_id uuid NOT NULL REFERENCES public.showcase_entries(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (showcase_id, problem_id)
);
ALTER TABLE public.showcase_problems ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.showcase_problems FROM anon, authenticated;

CREATE TABLE public.showcase_deliverables (
  showcase_id uuid NOT NULL REFERENCES public.showcase_entries(id) ON DELETE CASCADE,
  deliverable_id uuid NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (showcase_id, deliverable_id)
);
ALTER TABLE public.showcase_deliverables ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.showcase_deliverables FROM anon, authenticated;

CREATE TABLE public.showcase_metrics (
  showcase_id uuid NOT NULL REFERENCES public.showcase_entries(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (showcase_id, metric_id)
);
ALTER TABLE public.showcase_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.showcase_metrics FROM anon, authenticated;

-- 11) clients：旧公開ポリシー（works/cases 参照）を撤去し anon 直読みを止める（view が owner 権限で解決）。
DROP POLICY IF EXISTS clients_anon_select ON public.clients;
REVOKE ALL ON public.clients FROM anon;

-- 12) 旧 works/cases を廃止（公開は showcases view に統合）。本番は空想定（非空なら事前移行）。
DROP POLICY IF EXISTS works_anon_select ON public.works;
DROP POLICY IF EXISTS cases_anon_select ON public.cases;
DROP TABLE IF EXISTS public.works;
DROP TABLE IF EXISTS public.cases;

-- 13) 公開 view（owner 所有＝内部表を読む“定義者”view。anon は view のみ・published のみ）。
-- 公開可否は ndas のカテゴリ同意（LEFT JOIN＝無ければ非公開＝fail-safe）。problems/deliverables/metrics は「選択 AND カテゴリ許可」。
-- testimonial は publish_testimonial、client は is_public_name_allowed×client_display で解決。goal は出さない。security_invoker は付けない。
CREATE VIEW public.showcases AS
SELECT
  s.slug,
  s.title,
  s.summary,
  s.thumbnail_url,
  s.period,
  s.display_order,
  s.project_id,
  p.tech_stack,
  CASE WHEN n.publish_testimonial THEN p.testimonial END AS testimonial,
  CASE WHEN s.client_display = 'named' AND c.is_public_name_allowed THEN c.public_name END AS client_name,
  CASE WHEN s.client_display IN ('named', 'anonymized') THEN c.industry END AS client_industry,
  CASE WHEN n.publish_problems THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('problem', pr.problem, 'solution', pr.solution, 'outcome', pr.outcome) ORDER BY sp.display_order)
    FROM public.showcase_problems sp
    JOIN public.problems pr ON pr.id = sp.problem_id
    WHERE sp.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS problems,
  CASE WHEN n.publish_deliverables THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('kind', d.kind, 'name', d.name, 'url', d.url, 'images', d.image_urls) ORDER BY sd.display_order)
    FROM public.showcase_deliverables sd
    JOIN public.deliverables d ON d.id = sd.deliverable_id
    WHERE sd.showcase_id = s.id
  ), '[]'::jsonb) ELSE '[]'::jsonb END AS deliverables,
  CASE WHEN n.publish_metrics THEN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', m.label, 'achieved', m.achieved, 'previous', m.previous, 'unit', m.unit, 'kind', m.kind) ORDER BY sm.display_order)
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
