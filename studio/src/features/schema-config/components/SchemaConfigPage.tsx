import { notFound } from 'next/navigation';
import { getCollection } from '@/composition/collections';
import { coreStructure } from '@/adapters/domain-store/supabase/structure';
import type { FieldKind } from '@/features/domain-overlay/schema';
import { SchemaConfigForm, type EditableSemantics } from './SchemaConfigForm';

// live 構造＋現在の実効スキーマから「編集可能な semantics」を起こして configurator に渡す（pre-fill）。
export async function SchemaConfigPage({ collection }: { collection: string }) {
  const binding = getCollection(collection);
  if (!binding) notFound();

  const structure = await coreStructure(collection);
  const effective = await binding.resolveSchema();

  const fieldByKey = new Map(effective.fields.map((f) => [f.key, f]));
  const fields: EditableSemantics['fields'] = {};
  for (const sf of structure.fields) {
    const ef = fieldByKey.get(sf.name);
    fields[sf.name] = ef
      ? { label: ef.label, kind: ef.kind, description: ef.description ?? '', hidden: false, optionLabels: ef.optionLabels ?? {} }
      : { label: sf.name, kind: sf.baseKind, description: '', hidden: true, optionLabels: {} };
  }

  // reference フィールドの選択肢（値＋core ラベル）を取り、値ラベルを overlay で編集できるようにする。
  const optionSets: Record<string, { value: string; coreLabel: string }[]> = {};
  if (binding.references) {
    await Promise.all(
      effective.fields
        .filter((f) => f.kind === 'reference' && f.refTable)
        .map(async (f) => {
          const opts = await binding.references!.options(f.refTable!, f.refColumn ?? 'id').catch(() => []);
          optionSets[f.key] = opts.map((o) => ({ value: o.value, coreLabel: o.label }));
        }),
    );
  }

  const childByKey = new Map(effective.children.map((c) => [c.key, c]));
  const children: EditableSemantics['children'] = {};
  for (const sc of structure.childTables) {
    const ec = childByKey.get(sc.table);
    const ecf = new Map((ec?.fields ?? []).map((f) => [f.key, f]));
    const cf: Record<string, { label: string; kind: FieldKind; description: string }> = {};
    for (const f of sc.fields) {
      const e = ecf.get(f.name);
      cf[f.name] = e
        ? { label: e.label, kind: e.kind, description: e.description ?? '' }
        : { label: f.name, kind: f.baseKind, description: '' };
    }
    children[sc.table] = ec
      ? { included: true, label: ec.label, description: ec.description ?? '', fields: cf }
      : { included: false, label: sc.table, description: '', fields: cf };
  }

  const initial: EditableSemantics = {
    titleField: effective.titleField,
    statusField: effective.statusField ?? '',
    fields,
    children,
  };

  return <SchemaConfigForm collection={collection} structure={structure} initial={initial} optionSets={optionSets} />;
}
