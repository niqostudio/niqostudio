import { notFound } from 'next/navigation';
import { asString } from '@/features/collections/collection';
import { NdaChecklist } from './nda-checklist';

// NDA 専用詳細（server）。案件名を解決して読み合わせチェックリストへ渡す。
// collections への静的依存（循環）を避けるため getCollection は dynamic import。
export async function NdaDetail({ collection, id }: { collection: string; id: string }) {
  const { getCollection } = await import('@/composition/collections');
  const binding = getCollection(collection);
  if (!binding) notFound();

  const draft = await binding.drafts.get(id).catch(() => null);
  const working = draft ?? (await binding.store.get(id));
  if (!working) notFound();
  const fields = working.fields as Record<string, unknown>;

  // project_id → 案件名（参照解決）。
  let projectLabel = asString(fields.project_id);
  if (binding.references) {
    const opts = await binding.references.options('projects', 'id').catch(() => []);
    projectLabel = opts.find((o) => o.value === asString(fields.project_id))?.label ?? projectLabel;
  }

  return (
    <NdaChecklist
      recordId={id}
      fields={fields}
      projectLabel={projectLabel}
      hasDraft={!!draft}
      editHref={`/${collection}/${id}/edit`}
      updatedAt={working.updatedAt}
    />
  );
}
