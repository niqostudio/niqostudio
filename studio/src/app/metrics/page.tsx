import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';
import { MetricsTool } from '@/features/metrics/MetricsTool';
import { SectionLabel } from '@/shared/ui/primitives';

export const dynamic = 'force-dynamic';

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const asNum = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

// メトリクス計測。成果物（deliverable）を選び→URL測定（PSI）→下書きの metrics に反映（technical は成果物紐付け）。
export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; product?: string }>;
}) {
  const { project, product } = await searchParams;
  const m = new CoreMetricsProvider();
  const [deliverables, projects, products, defs] = await Promise.all([
    m.rows('deliverables', ['id', 'name', 'url', 'project_id', 'product_id']).catch(() => []),
    m.rows('projects', ['id', 'title']).catch(() => []),
    m.rows('products', ['id', 'name']).catch(() => []),
    m.rows('metric_definitions', ['key', 'label', 'unit', 'kind', 'auto', 'howto', 'sort_order', 'is_active']).catch(() => []),
  ]);

  const projName = new Map(projects.map((p) => [String(p.id), asStr(p.title)]));
  const prodName = new Map(products.map((p) => [String(p.id), asStr(p.name)]));
  const deliverableOptions = deliverables.map((d) => {
    const pid = asStr(d.project_id);
    const prid = asStr(d.product_id);
    return {
      value: String(d.id),
      label: `${(pid ? projName.get(pid) : prodName.get(prid)) ?? '?'} — ${asStr(d.name) || '(無題)'}`,
      url: asStr(d.url),
      subject: (pid ? 'projects' : 'products') as 'projects' | 'products',
      subjectId: pid || prid,
    };
  });

  const definitions = defs
    .filter((d) => d.is_active !== false)
    .sort((a, b) => asNum(a.sort_order) - asNum(b.sort_order))
    .map((d) => ({
      key: asStr(d.key),
      label: asStr(d.label),
      unit: asStr(d.unit),
      kind: (asStr(d.kind) === 'technical' ? 'technical' : 'business') as 'technical' | 'business',
      auto: d.auto === true,
      howto: asStr(d.howto),
    }));

  // ?project/?product でその被写体の最初の成果物を初期選択。
  const want = project ? { s: 'projects', id: project } : product ? { s: 'products', id: product } : null;
  const defaultDeliverable = want
    ? deliverableOptions.find((o) => o.subject === want.s && o.subjectId === want.id)?.value
    : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-5 md:p-10">
      <header>
        <SectionLabel>メトリクス</SectionLabel>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">メトリクス計測</h1>
      </header>
      <MetricsTool deliverables={deliverableOptions} definitions={definitions} defaultDeliverable={defaultDeliverable} />
    </div>
  );
}
