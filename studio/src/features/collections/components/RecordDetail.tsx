import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getCollection, listCollections } from '@/composition/collections';
import { StatusBadge } from '@/shared/ui/primitives';
import { asString } from '../collection';
import { WorkflowGraph } from './WorkflowGraph';
import { CreateRelatedButton } from './CreateRelatedButton';
import { RecordEditProvider, DetailActions, DetailChildren, DetailFields } from './RecordDetailEdit';
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

  // 読み取り表示するフィールド（status は workflow 側・hidden は overlay で除外済み）。
  const viewFields = schema.fields.filter((f) => f.key !== schema.statusField);
  const refFields = viewFields.filter((f) => f.kind === 'reference' && f.refTable);
  const statusDesc = schema.statusField ? schema.fields.find((f) => f.key === schema.statusField) : undefined;
  const statusRef = statusDesc?.kind === 'reference' && statusDesc.refTable ? statusDesc : undefined;

  // 互いに独立な取得は並列に（履歴 / 次状態 / 遷移 / 参照選択肢 / 状態マスタ）。
  const [timeline, nextStates, transitions, refResolved, statusOpts] = await Promise.all([
    binding.history ? binding.history.list(id).catch(() => []) : Promise.resolve([]),
    binding.workflow ? binding.workflow.nextStates(status || null).catch(() => []) : Promise.resolve([]),
    binding.workflow ? binding.workflow.transitions().catch(() => []) : Promise.resolve([]),
    binding.references
      ? Promise.all(
          refFields.map(async (f) => {
            const opts = await binding.references!.options(f.refTable!, f.refColumn ?? 'id').catch(() => []);
            return [f.key, opts.map((o) => ({ value: o.value, label: f.optionLabels?.[o.value] ?? o.label }))] as const;
          }),
        )
      : Promise.resolve([] as (readonly [string, { value: string; label: string }[]])[]),
    statusRef && binding.references
      ? binding.references.options(statusRef.refTable!, statusRef.refColumn ?? 'id').catch(() => [])
      : Promise.resolve([] as { value: string; label: string }[]),
  ]);
  const detailExtras = binding.detailExtras ?? [];
  const refOptions: Record<string, { value: string; label: string }[]> = Object.fromEntries(refResolved);

  // この record（例：顧客/案件/プロダクト）から作れる子 collection の作成導線（詳細ペインに置く）。
  const createRelated = listCollections().flatMap((b) =>
    (b.meta.createVia ?? [])
      .filter((cv) => cv.via === collection)
      .map((cv) => ({ targetCollection: b.meta.id, fk: cv.fk, parentId: id, label: `${b.meta.label}を作成`, icon: b.meta.icon })),
  );

  // status の値→ラベル＋順序（マスタ × overlay ラベル）。バッジ・ワークフロー・履歴で共通に使う。
  const statusLabels = new Map<string, string>();
  let statusOrder: { value: string; label: string }[] = [];
  if (statusRef) {
    for (const o of statusOpts) statusLabels.set(o.value, o.label);
    statusOrder = statusOpts.map((o) => ({ value: o.value, label: o.label }));
  }
  if (statusDesc?.optionLabels) for (const [v, l] of Object.entries(statusDesc.optionLabels)) statusLabels.set(v, l);
  const statusLabel = (code: string) => statusLabels.get(code) ?? code;
  if (statusOrder.length === 0 && statusDesc?.options) statusOrder = statusDesc.options.map((v) => ({ value: v, label: statusLabel(v) }));
  const nextLabeled = nextStates.map((s) => ({ value: s.value, label: statusLabels.get(s.value) ?? s.label }));

  // 親（createVia の親 FK）を解決してヘッダのパンくずに出す（projects→顧客 等・汎用）。
  // fk が overlay で hidden だと refOptions に乗らないため、無ければ親テーブルを直接解決する。
  let parentCrumb: string | undefined;
  for (const cv of binding.meta.createVia ?? []) {
    const val = asString(fields[cv.fk]);
    if (!val) continue;
    let label = refOptions[cv.fk]?.find((o) => o.value === val)?.label;
    if (!label && binding.references) {
      const opts = await binding.references.options(cv.via, 'id').catch(() => []);
      label = opts.find((o) => o.value === val)?.label;
    }
    if (label) {
      parentCrumb = label;
      break;
    }
  }

  // 作成系アクション（createVia ＋ recordActions）。workflow があれば右に縦積み、無ければ単独で横並び。
  const actionButtons =
    createRelated.length > 0 || (binding.recordActions?.length ?? 0) > 0 ? (
      <>
        {createRelated.map((r) => (
          <CreateRelatedButton key={`${r.targetCollection}-${r.fk}`} {...r} />
        ))}
        {binding.recordActions?.map((a) => (
          <form key={a.id} action={a.run.bind(null, id)}>
            <button type="submit" className="btn btn-secondary inline-flex items-center gap-1.5">
              {a.icon && <a.icon className="size-4" />}
              {a.label}
            </button>
          </form>
        ))}
      </>
    ) : null;

  return (
    <RecordEditProvider collectionId={collection} recordId={id} fieldKeys={viewFields.map((f) => f.key)} values={fields}>
      <div className="flex h-full flex-col gap-7 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {parentCrumb && (
              <span className="inline-flex items-center gap-1 text-sm text-muted">
                {parentCrumb}
                <ChevronRight className="size-3.5 text-faint" />
              </span>
            )}
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

      {binding.workflow && statusOrder.length > 0 ? (
        <section className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="section-label mb-2 text-xs">{t('workflow')}</p>
            <WorkflowGraph
              collectionId={collection}
              recordId={id}
              steps={statusOrder}
              current={status}
              nextValues={nextLabeled.map((s) => s.value)}
              visited={timeline.map((e) => e.to)}
              edges={transitions}
            />
          </div>
          {actionButtons && <div className="flex shrink-0 flex-col items-start gap-2">{actionButtons}</div>}
        </section>
      ) : (
        actionButtons && <section className="flex flex-wrap gap-2">{actionButtons}</section>
      )}

      {detailExtras.map((Extra, i) => (
        <Extra key={i} id={id} />
      ))}

      {viewFields.length > 0 && <DetailFields fields={viewFields} refOptions={refOptions} />}

      {schema.children.length > 0 && <DetailChildren items={schema.children} />}

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
