import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';
import { NdaCreate } from '@/composition/details/NdaCreate';
import { BackLink } from '@/shared/ui/primitives';

export const dynamic = 'force-dynamic';

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

// NDA 作成：顧客 → 案件（絞り込み）で選んで作る専用画面。NDA は案件に 1:1 なので既存 NDA の案件は除外。
export default async function NdaNewPage() {
  const m = new CoreMetricsProvider();
  const [clients, projects, ndas] = await Promise.all([
    m.rows('clients', ['id', 'public_name']).catch(() => []),
    m.rows('projects', ['id', 'title', 'client_id']).catch(() => []),
    m.rows('ndas', ['project_id']).catch(() => []),
  ]);
  const hasNda = new Set(ndas.map((n) => asStr(n.project_id)));
  const clientOpts = clients.map((c) => ({ value: String(c.id), label: asStr(c.public_name) || String(c.id) }));
  const projectOpts = projects
    .filter((p) => asStr(p.client_id) && !hasNda.has(String(p.id)))
    .map((p) => ({ value: String(p.id), label: asStr(p.title) || String(p.id), clientId: asStr(p.client_id) }));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-5 md:p-10">
      <div>
        <BackLink href="/ndas">NDA 一覧へ</BackLink>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">NDA を作成</h1>
        <p className="mt-1 text-sm text-muted">顧客 → 案件を選んで作成します（NDA は案件に 1:1）。</p>
      </div>
      <NdaCreate clients={clientOpts} projects={projectOpts} />
    </div>
  );
}
