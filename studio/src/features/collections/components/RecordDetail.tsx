import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { getCollection, listCollections } from '@/composition/collections';
import { StatusBadge } from '@/shared/ui/primitives';
import type { FieldDescriptor } from '@/shared/records/schema';
import { asString, asChildren } from '../collection';
import { WorkflowActions } from './WorkflowActions';
import { CreateRelatedButton } from './CreateRelatedButton';
import { InlineField } from './InlineField';
import { t } from '@/shared/i18n';

// 一覧の右ペインに出す読み取り詳細＋ワークフロー操作（state machine の次状態へ進める）。
// CRUD 編集は /<col>/<id>/edit に分離（このビューは編集しない）。
export async function RecordDetail({ collection, id }: { collection: string; id: string }) {
  const binding = getCollection(collection);
  if (!binding) notFound();

  const schema = await binding.resolveSchema();
  const draft = await binding.drafts.get(id).catch(() => null);
  const working = draft ?? (await binding.store.get(id));
  if (!working) notFound();

  const fields = working.fields as Record<string, unknown>;
  const title = asString(fields[schema.titleField]) || t('untitled');
  const status = schema.statusField ? asString(fields[schema.statusField]) : '';

  const timeline = binding.history ? await binding.history.list(id).catch(() => []) : [];
  const nextStates = binding.workflow ? await binding.workflow.nextStates(status || null).catch(() => []) : [];

  // 読み取り表示するフィールド（status は workflow 側・hidden は overlay で除外済み）。
  const viewFields = schema.fields.filter((f) => f.key !== schema.statusField);

  // reference フィールドの選択肢（値＋表示ラベル＝overlay 優先）。表示・インライン編集の両方で使う。
  const refOptions: Record<string, { value: string; label: string }[]> = {};
  if (binding.references) {
    await Promise.all(
      viewFields
        .filter((f) => f.kind === 'reference' && f.refTable)
        .map(async (f) => {
          const opts = await binding.references!.options(f.refTable!, f.refColumn ?? 'id').catch(() => []);
          refOptions[f.key] = opts.map((o) => ({ value: o.value, label: f.optionLabels?.[o.value] ?? o.label }));
        }),
    );
  }

  // この record（例：顧客）から作れる子 collection（例：案件）の作成導線（詳細ペインに置く）。
  const createRelated = listCollections()
    .filter((b) => b.meta.createVia?.via === collection)
    .map((b) => ({ targetCollection: b.meta.id, fk: b.meta.createVia!.fk, parentId: id, label: `${b.meta.label}を作成` }));

  // status の値→ラベル（core 値集合 × overlay ラベル）。バッジ・ワークフロー・履歴で共通に使う。
  const statusLabels = new Map<string, string>();
  const statusDesc = schema.statusField ? schema.fields.find((f) => f.key === schema.statusField) : undefined;
  if (statusDesc?.kind === 'reference' && statusDesc.refTable && binding.references) {
    const opts = await binding.references.options(statusDesc.refTable, statusDesc.refColumn ?? 'id').catch(() => []);
    for (const o of opts) statusLabels.set(o.value, o.label);
  }
  if (statusDesc?.optionLabels) for (const [v, l] of Object.entries(statusDesc.optionLabels)) statusLabels.set(v, l);
  const statusLabel = (code: string) => statusLabels.get(code) ?? code;
  const nextLabeled = nextStates.map((s) => ({ value: s.value, label: statusLabels.get(s.value) ?? s.label }));

  function display(value: unknown, f: FieldDescriptor): string {
    if (value == null || value === '') return '—';
    if (f.kind === 'list') return Array.isArray(value) ? (value as unknown[]).join('、') || '—' : '—';
    if (f.kind === 'boolean') return value === true ? t('yes') : '—';
    if (f.kind === 'reference') return refOptions[f.key]?.find((o) => o.value === asString(value))?.label ?? asString(value);
    return asString(value);
  }

  return (
    <div className="flex h-full flex-col gap-7 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {schema.statusField && <StatusBadge status={status} label={status ? statusLabel(status) : undefined} />}
            {draft && <span className="chip inline-flex items-center px-2 py-0.5 text-accent border-accent">{t('draft')}</span>}
          </div>
          <p className="text-xs text-muted">{t('updated')} {working.updatedAt}</p>
        </div>
        <Link href={`/${collection}/${id}/edit`} className="btn btn-primary inline-flex shrink-0 items-center gap-1.5">
          <Pencil className="size-4" />
          {t('edit')}
        </Link>
      </header>

      {binding.workflow && (
        <section className="flex flex-col gap-2">
          <p className="section-label text-xs">{t('workflow')}</p>
          <WorkflowActions collectionId={collection} recordId={id} nextStates={nextLabeled} />
        </section>
      )}

      {createRelated.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {createRelated.map((r) => (
            <CreateRelatedButton key={r.targetCollection} {...r} />
          ))}
        </section>
      )}

      {viewFields.length > 0 && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {viewFields.map((f) => (
            <InlineField
              key={f.key}
              collectionId={collection}
              recordId={id}
              d={f}
              value={fields[f.key]}
              display={display(fields[f.key], f)}
              refOptions={refOptions[f.key]}
            />
          ))}
        </section>
      )}

      {schema.children.length > 0 && (
        <section className="flex flex-col gap-1">
          <p className="section-label text-xs">{t('related')}</p>
          {schema.children.map((c) => (
            <div key={c.key} className="flex items-center justify-between text-sm">
              <span>{c.label}</span>
              <span className="text-muted">{asChildren(fields[c.key]).length}</span>
            </div>
          ))}
        </section>
      )}

      {timeline.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="section-label text-xs">{t('statusHistory')}</p>
          <ol className="flex flex-col gap-1.5">
            {timeline
              .slice()
              .reverse()
              .map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="inline-block size-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="text-muted">{e.at.slice(5, 16).replace('T', ' ')}</span>
                  <span>{e.from ? `${statusLabel(e.from)} → ${statusLabel(e.to)}` : statusLabel(e.to)}</span>
                </li>
              ))}
          </ol>
        </section>
      )}
    </div>
  );
}
