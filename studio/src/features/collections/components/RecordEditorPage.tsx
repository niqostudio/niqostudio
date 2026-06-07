import { notFound } from 'next/navigation';
import { getCollection } from '@/composition/collections';
import type { ReferenceOption } from '@/ports/domain-store';
import RecordPaneEditor from './RecordPaneEditor';

// 1レコードのエディタ画面（server）。各 collection の route が collection＋id を渡す。
// binding 解決・実効スキーマ・下書き/源/版の読み込みをここに集約（route はこれを呼ぶだけ）。
export async function RecordEditorPage({ collection, id }: { collection: string; id: string }) {
  const binding = getCollection(collection);
  if (!binding) notFound();

  const schema = await binding.resolveSchema();
  const draft = await binding.drafts.get(id).catch(() => null);
  const working = draft ?? (await binding.store.get(id));
  if (!working) notFound();

  const sources = binding.sources ? await binding.sources.listForRecord(id) : [];
  const versions = binding.versions ? await binding.versions.listForRecord(id).catch(() => []) : [];

  // reference フィールド（外向き FK）の選択肢を参照先から live 取得して client へ渡す。
  const referenceOptions: Record<string, ReferenceOption[]> = {};
  if (binding.references) {
    await Promise.all(
      schema.fields
        .filter((f) => f.kind === 'reference' && f.refTable)
        .map(async (f) => {
          const opts = await binding.references!.options(f.refTable!, f.refColumn ?? 'id').catch(() => []);
          // 表示ラベルは overlay の optionLabels を優先（値・制約は core）。
          referenceOptions[f.key] = opts.map((o) => ({ value: o.value, label: f.optionLabels?.[o.value] ?? o.label }));
        }),
    );
  }

  // server 状態が変わったら client エディタを作り直す（保存/取り込み/復元の後）。
  const revision = `${working.updatedAt}|${!!draft}|${sources.length}|${versions.length}`;

  return (
    <RecordPaneEditor
      key={revision}
      collectionId={collection}
      recordId={id}
      schema={schema}
      initialFields={working.fields as Record<string, unknown>}
      isDraft={!!draft}
      updatedAt={working.updatedAt}
      referenceOptions={referenceOptions}
      workflowField={binding.workflow ? schema.statusField : undefined}
      sources={sources.map((s) => ({ id: s.id, ref: s.ref, role: s.role, visibility: s.visibility }))}
      versions={versions.map((v) => ({ id: v.id, origin: v.origin, createdAt: v.createdAt }))}
    />
  );
}
