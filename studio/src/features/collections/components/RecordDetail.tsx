import { notFound } from 'next/navigation';
import { getCollection, listCollections } from '@/composition/collections';
import { StatusBadge } from '@/shared/ui/primitives';
import { asString, asChildren } from '../collection';
import { WorkflowGraph } from './WorkflowGraph';
import { CreateRelatedButton } from './CreateRelatedButton';
import { RecordEditProvider, DetailActions, DetailFields } from './RecordDetailEdit';
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
  const transitions = binding.workflow ? await binding.workflow.transitions().catch(() => []) : [];
  const detailExtras = binding.detailExtras ?? [];

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

  // この record（例：顧客/案件/プロダクト）から作れる子 collection の作成導線（詳細ペインに置く）。
  const createRelated = listCollections().flatMap((b) =>
    (b.meta.createVia ?? [])
      .filter((cv) => cv.via === collection)
      .map((cv) => ({ targetCollection: b.meta.id, fk: cv.fk, parentId: id, label: `${b.meta.label}を作成` })),
  );

  // status の値→ラベル（core 値集合 × overlay ラベル）。バッジ・ワークフロー・履歴で共通に使う。
  const statusLabels = new Map<string, string>();
  // ステッパー用の順序つき status（reference は sort_order 昇順で返る）。
  let statusOrder: { value: string; label: string }[] = [];
  const statusDesc = schema.statusField ? schema.fields.find((f) => f.key === schema.statusField) : undefined;
  if (statusDesc?.kind === 'reference' && statusDesc.refTable && binding.references) {
    const opts = await binding.references.options(statusDesc.refTable, statusDesc.refColumn ?? 'id').catch(() => []);
    for (const o of opts) statusLabels.set(o.value, o.label);
    statusOrder = opts.map((o) => ({ value: o.value, label: o.label }));
  }
  if (statusDesc?.optionLabels) for (const [v, l] of Object.entries(statusDesc.optionLabels)) statusLabels.set(v, l);
  const statusLabel = (code: string) => statusLabels.get(code) ?? code;
  if (statusOrder.length === 0 && statusDesc?.options) statusOrder = statusDesc.options.map((v) => ({ value: v, label: statusLabel(v) }));
  const nextLabeled = nextStates.map((s) => ({ value: s.value, label: statusLabels.get(s.value) ?? s.label }));

  return (
    <RecordEditProvider collectionId={collection} recordId={id} fieldKeys={viewFields.map((f) => f.key)} values={fields}>
      <div className="flex h-full flex-col gap-7 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {schema.statusField && <StatusBadge status={status} label={status ? statusLabel(status) : undefined} />}
            {draft && (
              <span className="inline-flex items-center gap-1 text-xs text-accent">
                <span className="inline-block size-1.5 rounded-full bg-accent" />
                {t('draft')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted">{t('updated')} {working.updatedAt}</p>
        </div>
        <DetailActions
          collectionId={collection}
          recordId={id}
          hasDraft={!!draft}
          editHref={`/${collection}/${id}/edit`}
        />
      </header>

      {binding.workflow && statusOrder.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="section-label text-xs">{t('workflow')}</p>
          <WorkflowGraph
            collectionId={collection}
            recordId={id}
            steps={statusOrder}
            current={status}
            nextValues={nextLabeled.map((s) => s.value)}
            visited={timeline.map((e) => e.to)}
            edges={transitions}
          />
        </section>
      )}

      {detailExtras.map((Extra, i) => (
        <Extra key={i} id={id} />
      ))}

      {createRelated.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {createRelated.map((r) => (
            <CreateRelatedButton key={`${r.targetCollection}-${r.fk}`} {...r} />
          ))}
        </section>
      )}

      {binding.recordActions && binding.recordActions.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {binding.recordActions.map((a) => (
            <form key={a.id} action={a.run.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                {a.label}
              </button>
            </form>
          ))}
        </section>
      )}

      {viewFields.length > 0 && <DetailFields fields={viewFields} refOptions={refOptions} />}

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
    </RecordEditProvider>
  );
}
