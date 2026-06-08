'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { Card, StatusBadge, SearchField, Select } from '@/shared/ui/primitives';
import { cn } from '@/shared/utils/cn';
import type { CollectionRecord } from '@/shared/model/record';
import type { CollectionSchema } from '@/features/domain-overlay/schema';
import { asString, orderByList, type Fields } from '../collection';
import { t } from '@/shared/i18n';

type Rec = CollectionRecord<Fields>;
// published と下書きを 1 モデルに束ね draft で区別する。検索/フィルタ/ソートは TanStack が持ち、
// 描画（カード・ドラフト/正本の分割）とスキンは自前で持つ＝headless 委譲。
type ListRow = { record: Rec; draft: boolean };

const col = createColumnHelper<ListRow>();

export function RecordListBody({
  collectionId,
  schema,
  published,
  newDrafts,
  selectedId,
}: {
  collectionId: string;
  schema: CollectionSchema;
  published: Rec[];
  newDrafts: Rec[];
  selectedId?: string;
}) {
  const data = useMemo<ListRow[]>(
    () => [
      ...newDrafts.map((record) => ({ record, draft: true })),
      ...published.map((record) => ({ record, draft: false })),
    ],
    [newDrafts, published],
  );

  // 検索は title のみ（status/updatedAt は globalFilter 対象外）。status は厳密一致でタブから絞る。
  const columns = useMemo<ColumnDef<ListRow, string>[]>(() => {
    const { titleField, statusField } = schema;
    return [
      col.accessor((r) => asString(r.record.fields[titleField]), { id: 'title' }),
      ...(statusField
        ? [
            col.accessor((r) => asString(r.record.fields[statusField]), {
              id: 'status',
              filterFn: 'equalsString',
              enableGlobalFilter: false,
            }),
          ]
        : []),
      col.accessor((r) => r.record.updatedAt, { id: 'updatedAt', enableGlobalFilter: false }),
    ];
  }, [schema]);

  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnFilters, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const draftRows = rows.filter((r) => r.original.draft);
  const pubRows = rows.filter((r) => !r.original.draft);

  // status タブ（自前スキン）。行の絞り込み自体は TanStack（columnFilters）が行い、
  // ここは「どの status が在るか・各件数」の提示＝選択に依らず安定させるため data から出す。
  const statusField = schema.statusField ? schema.fields.find((f) => f.key === schema.statusField) : undefined;
  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    if (!schema.statusField) return m;
    for (const { record } of data) {
      const s = asString(record.fields[schema.statusField]);
      if (s) m.set(s, (m.get(s) ?? 0) + 1);
    }
    return m;
  }, [data, schema.statusField]);
  const statusTabs = useMemo(
    () => orderByList([...statusCounts.keys()], statusField?.options ?? []),
    [statusCounts, statusField],
  );

  const activeStatus = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? null;
  const setStatus = (value: string | null) => setColumnFilters(value == null ? [] : [{ id: 'status', value }]);
  const statusLabel = (v: string) => statusField?.optionLabels?.[v] ?? v;

  const sortValue = `${sorting[0]?.id ?? 'updatedAt'}:${sorting[0]?.desc ? 'desc' : 'asc'}`;
  const onSort = (v: string) => {
    const [id, dir] = v.split(':');
    setSorting([{ id, desc: dir === 'desc' }]);
  };

  function Row({ record, draft }: { record: Rec; draft?: boolean }) {
    const selected = record.id === selectedId;
    return (
      <Link href={`/${collectionId}?sel=${record.id}`} scroll={false} className="block">
        <Card className={cn('p-4 transition-colors hover:border-accent', selected && 'border-accent bg-surface')}>
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SearchField value={globalFilter} onChange={setGlobalFilter} placeholder={t('search')} />
        <div className="flex items-center justify-between gap-3">
          {statusTabs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <StatusTab active={activeStatus == null} onClick={() => setStatus(null)} label={t('all')} count={data.length} />
              {statusTabs.map((s) => (
                <StatusTab
                  key={s}
                  active={activeStatus === s}
                  onClick={() => setStatus(s)}
                  label={statusLabel(s)}
                  count={statusCounts.get(s) ?? 0}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          <Select
            aria-label={t('sortBy')}
            value={sortValue}
            onChange={(e) => onSort(e.target.value)}
            className="w-auto shrink-0"
          >
            <option value="updatedAt:desc">{t('sortUpdated')}</option>
            <option value="title:asc">{t('sortTitle')}</option>
          </Select>
        </div>
      </div>

      {rows.length === 0 && (globalFilter || activeStatus) && <p className="text-sm text-muted">{t('noMatches')}</p>}

      {draftRows.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="section-label text-xs">{t('newDrafts')}</p>
          {draftRows.map((r) => (
            <Row key={r.original.record.id} record={r.original.record} draft />
          ))}
        </section>
      )}

      {pubRows.length > 0 && (
        <section className="flex flex-col gap-3">
          {draftRows.length > 0 && <p className="section-label text-xs">{t('publishedSection')}</p>}
          {pubRows.map((r) => (
            <Row key={r.original.record.id} record={r.original.record} />
          ))}
        </section>
      )}
    </div>
  );
}

// status フィルタのタブ（自前スキン）。クリックで TanStack の columnFilters を切り替える。
function StatusTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'chip inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors',
        active ? 'border-accent text-accent' : 'text-muted hover:text-fg',
      )}
    >
      {label}
      <span className="text-xs opacity-70">{count}</span>
    </button>
  );
}
