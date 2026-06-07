import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CollectionRecord } from '@/shared/model/record';
import { getCollection } from '@/composition/collections';
import type { Fields } from '../collection';
import { createRecordAction } from '../actions';
import { RecordListBody } from './RecordListBody';
import { RecordDetail } from './RecordDetail';
import { t } from '@/shared/i18n';
import { Settings, Plus } from 'lucide-react';

// 一覧（master）＋右ペイン詳細（detail）。行クリックで ?sel=<id> を選び、右に読み取り詳細＋ワークフロー。
// CRUD 編集は詳細の「編集」から /<col>/<id>/edit へ分離。
export default async function RecordList({ collectionId, selectedId }: { collectionId: string; selectedId?: string }) {
  const binding = getCollection(collectionId);
  if (!binding) notFound();

  const schema = await binding.resolveSchema();
  const published = await binding.store.list();
  const drafts = await binding.drafts.list().catch(() => [] as CollectionRecord<Fields>[]);
  const publishedIds = new Set(published.map((r) => r.id));
  const newDrafts = drafts.filter((d) => !publishedIds.has(d.id));

  return (
    <div className="flex h-full">
      <div className="flex w-full max-w-md shrink-0 flex-col gap-8 overflow-y-auto border-r border-border-subtle p-5 md:p-8">
        <header className="flex min-h-10 items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{binding.meta.label}</h1>
          <div className="flex items-center gap-3">
            <Link href={`/schema/${collectionId}`} title="スキーマ設定" className="text-muted transition-colors hover:text-accent">
              <Settings className="size-5" />
            </Link>
            {!binding.meta.createVia && (
              <form action={createRecordAction.bind(null, collectionId, undefined)}>
                <button type="submit" className="btn btn-primary inline-flex items-center gap-1.5">
                  <Plus className="size-4" />
                  {t('new')}
                </button>
              </form>
            )}
          </div>
        </header>

        <RecordListBody
          collectionId={collectionId}
          schema={schema}
          published={published}
          newDrafts={newDrafts}
          selectedId={selectedId}
        />
      </div>

      <div className="hidden flex-1 overflow-hidden md:block">
        {selectedId ? (
          <RecordDetail collection={collectionId} id={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted">{t('selectHint')}</div>
        )}
      </div>
    </div>
  );
}
