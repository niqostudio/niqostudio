'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, StatusBadge, SearchField } from '@/shared/ui/primitives';
import type { CollectionRecord } from '@/shared/model/record';
import type { CollectionSchema } from '@/features/domain-overlay/schema';
import { asString, type Fields } from '../collection';
import { t } from '@/shared/i18n';

type Record = CollectionRecord<Fields>;

// 一覧の本体（検索つき）。schema の titleField でカードを描き、絞り込みはクライアントで即時に効かせる。
export function RecordListBody({
  collectionId,
  schema,
  published,
  newDrafts,
  selectedId,
}: {
  collectionId: string;
  schema: CollectionSchema;
  published: Record[];
  newDrafts: Record[];
  selectedId?: string;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const [drafts, pub] = useMemo(() => {
    if (!q) return [newDrafts, published];
    const match = (r: Record) => asString(r.fields[schema.titleField]).toLowerCase().includes(q);
    return [newDrafts.filter(match), published.filter(match)];
  }, [q, newDrafts, published, schema.titleField]);

  function Row({ record, draft }: { record: Record; draft?: boolean }) {
    const selected = record.id === selectedId;
    return (
      <Link href={`/${collectionId}?sel=${record.id}`} scroll={false} className="block">
        <Card className={`p-4 transition-colors hover:border-accent ${selected ? 'border-accent bg-surface' : ''}`}>
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{asString(record.fields[schema.titleField]) || t('untitled')}</p>
            {schema.statusField && <StatusBadge status={asString(record.fields[schema.statusField])} />}
            {draft && <span className="chip inline-flex items-center px-2 py-0.5 text-accent border-accent">{t('draft')}</span>}
          </div>
          <div className="mt-2 text-xs text-muted">{t('updated')} {record.updatedAt}</div>
        </Card>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SearchField value={query} onChange={setQuery} placeholder={t('search')} />

      {q && drafts.length === 0 && pub.length === 0 && (
        <p className="text-sm text-muted">{t('noMatches')}</p>
      )}

      {drafts.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="section-label text-xs">{t('newDrafts')}</p>
          {drafts.map((r) => <Row key={r.id} record={r} draft />)}
        </section>
      )}

      {pub.length > 0 && (
        <section className="flex flex-col gap-3">
          {drafts.length > 0 && <p className="section-label text-xs">{t('publishedSection')}</p>}
          {pub.map((r) => <Row key={r.id} record={r} />)}
        </section>
      )}
    </div>
  );
}
