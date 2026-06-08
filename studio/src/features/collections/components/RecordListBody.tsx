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
  statusFilter,
}: {
  collectionId: string;
  schema: CollectionSchema;
  published: Rec[];
  newDrafts: Rec[];
  selectedId?: string;
  // 初期 status 絞り込み（ダッシュボード KPI からの ?status= ドリルダウン）。
  statusFilter?: string;
}) {
  const data = useMemo<ListRow[]>(
    () => [
      ...newDrafts.map((record) => ({ record, draft: true })),
      ...published.map((record) => ({ record, draft: false })),
    ],
    [newDrafts, published],
  );

  // ソート可能な schema 列＝date（近い順）と数値（多い順）。kind に number が無いので値の型で数値判定する。
  const sortFields = useMemo(
    () =>
      schema.fields
        .filter((f) => f.key !== schema.titleField && f.key !== schema.statusField)
        .map((f) => ({
          field: f,
          numeric: data.some((d) => typeof d.record.fields[f.key] === 'number'),
        }))
        .filter((x) => x.field.kind === 'date' || x.numeric),
    [schema, data],
  );

  // 検索は title のみ。status はタブから厳密一致で絞る。ソート用に date/数値列を raw 値で足す（TanStack に型ソートさせる）。
  const columns = useMemo<ColumnDef<ListRow, unknown>[]>(() => {
    const { titleField, statusField } = schema;
    const base: ColumnDef<ListRow, unknown>[] = [
      col.accessor((r) => asString(r.record.fields[titleField]), { id: 'title' }) as ColumnDef<ListRow, unknown>,
      ...(statusField
        ? [
            col.accessor((r) => asString(r.record.fields[statusField]), {
              id: 'status',
              filterFn: 'equalsString',
              enableGlobalFilter: false,
            }) as ColumnDef<ListRow, unknown>,
          ]
        : []),
      col.accessor((r) => r.record.updatedAt, { id: 'updatedAt', enableGlobalFilter: false }) as ColumnDef<ListRow, unknown>,
    ];
    for (const { field } of sortFields) {
      base.push(
        col.accessor((r) => r.record.fields[field.key] ?? undefined, {
          id: field.key,
          enableGlobalFilter: false,
          sortUndefined: 'last',
        }) as ColumnDef<ListRow, unknown>,
      );
    }
    return base;
  }, [schema, sortFields]);

  const sortOptions = useMemo(() => {
    const opts = [
      { value: 'updatedAt:desc', label: t('sortUpdated') },
      { value: 'title:asc', label: t('sortTitle') },
    ];
    for (const { field, numeric } of sortFields) {
      if (numeric) opts.push({ value: `${field.key}:desc`, label: `${field.label}（多い順）` });
      else opts.push({ value: `${field.key}:asc`, label: `${field.label}（近い順）` });
    }
    return opts;
  }, [sortFields]);

  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    statusFilter && schema.statusField ? [{ id: 'status', value: statusFilter }] : [],
  );
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

  const sortId = sorting[0]?.id ?? 'updatedAt';
  const sortValue = `${sortId}:${sorting[0]?.desc ? 'desc' : 'asc'}`;
  const onSort = (v: string) => {
    const [id, dir] = v.split(':');
    setSorting([{ id, desc: dir === 'desc' }]);
  };

  // 行の二次行：ソート中の列の値を見せる（納期順なら納期、受注額順なら金額）。既定は更新日時。
  const sortedField = sortId !== 'updatedAt' && sortId !== 'title' ? schema.fields.find((f) => f.key === sortId) : undefined;
  const secondaryFor = (record: Rec): { label: string; value: string } => {
    if (sortedField) {
      const raw = record.fields[sortedField.key];
      const value = typeof raw === 'number' ? raw.toLocaleString() : asString(raw);
      return { label: sortedField.label, value: value || '—' };
    }
    return { label: t('updated'), value: record.updatedAt };
  };

  function Row({ record, draft }: { record: Rec; draft?: boolean }) {
    const selected = record.id === selectedId;
    const status = schema.statusField ? asString(record.fields[schema.statusField]) : '';
    const sec = secondaryFor(record);
    return (
      <Link href={`/${collectionId}?sel=${record.id}`} scroll={false} className="block">
        <Card className={cn('p-4 transition-colors hover:border-accent', selected && 'border-accent bg-surface')}>
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{asString(record.fields[schema.titleField]) || t('untitled')}</p>
            {status && <StatusBadge status={status} label={statusLabel(status)} />}
            {draft && <span className="chip inline-flex items-center px-2 py-0.5 text-accent border-accent">{t('draft')}</span>}
          </div>
          <div className="mt-2 text-xs text-muted">
            {sec.label} {sec.value}
          </div>
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
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
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
