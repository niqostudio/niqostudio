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
import type { CollectionSchema, FieldDescriptor } from '@/features/domain-overlay/schema';
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
  refOptions,
}: {
  collectionId: string;
  schema: CollectionSchema;
  published: Rec[];
  newDrafts: Rec[];
  selectedId?: string;
  // 初期 status 絞り込み（ダッシュボード KPI からの ?status= ドリルダウン）。
  statusFilter?: string;
  // reference 列の値→ラベル（フィルタの表示用・server で解決して渡す）。
  refOptions?: Record<string, { value: string; label: string }[]>;
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
        .map((f) => ({ field: f, numeric: data.some((d) => typeof d.record.fields[f.key] === 'number') }))
        .filter((x) => x.field.kind === 'date' || (x.field.kind === 'text' && x.numeric)),
    [schema, data],
  );

  // フィルタ可能な列＝categorical（reference / select / boolean）。status はタブで別管理。
  const filterFields = useMemo(
    () =>
      schema.fields.filter(
        (f) =>
          f.key !== schema.statusField &&
          (f.kind === 'reference' || f.kind === 'select' || f.kind === 'boolean'),
      ),
    [schema],
  );

  const labelFor = (f: FieldDescriptor, v: string): string => {
    if (f.kind === 'reference') return refOptions?.[f.key]?.find((o) => o.value === v)?.label ?? v;
    if (f.kind === 'boolean') return v === 'true' ? t('yes') : t('no');
    return f.optionLabels?.[v] ?? v;
  };

  // 各フィルタ列の選択肢＝データに実在する値だけ（status タブと同じ思想・1値なら出さない）。
  const filterOptions = useMemo(() => {
    const m: Record<string, { value: string; label: string }[]> = {};
    for (const f of filterFields) {
      const present = new Set<string>();
      for (const { record } of data) {
        const raw = record.fields[f.key];
        if (raw !== null && raw !== undefined && raw !== '') present.add(String(raw));
      }
      m[f.key] = [...present].sort().map((v) => ({ value: v, label: labelFor(f, v) }));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFields, data, refOptions]);

  const visibleFilters = filterFields.filter((f) => (filterOptions[f.key]?.length ?? 0) >= 2);

  // 検索は title のみ。ソート用に date/数値列、フィルタ用に categorical 列を足す（raw 値で TanStack に委譲）。
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
    for (const f of filterFields) {
      base.push(
        col.accessor((r) => asString(r.record.fields[f.key]), {
          id: f.key,
          filterFn: 'equalsString',
          enableGlobalFilter: false,
        }) as ColumnDef<ListRow, unknown>,
      );
    }
    return base;
  }, [schema, sortFields, filterFields]);

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

  // 値の出入りに依らず安定させるため、status タブの集計は data から出す（選択中フィルタを無視）。
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

  // 列フィルタの汎用 set/get（status タブ・categorical フィルタ共用。他列の選択は保持）。
  const filterValue = (id: string) => (columnFilters.find((f) => f.id === id)?.value as string) ?? null;
  const setFilter = (id: string, value: string | null) =>
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id);
      return value == null ? rest : [...rest, { id, value }];
    });

  const activeStatus = filterValue('status');
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

  // 下書きかどうかは「新規下書き」セクション見出しで示す＝行に chip を出さない（status と同列に見せない）。
  function Row({ record }: { record: Rec }) {
    const selected = record.id === selectedId;
    const status = schema.statusField ? asString(record.fields[schema.statusField]) : '';
    const sec = secondaryFor(record);
    return (
      <Link href={`/${collectionId}?sel=${record.id}`} scroll={false} className="block">
        <Card className={cn('p-4 transition-colors hover:border-accent', selected && 'border-accent bg-surface')}>
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{asString(record.fields[schema.titleField]) || t('untitled')}</p>
            {status && <StatusBadge status={status} label={statusLabel(status)} />}
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
        <div className="flex items-center gap-2">
          <SearchField value={globalFilter} onChange={setGlobalFilter} placeholder={t('search')} className="flex-1" />
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

        {(statusTabs.length > 0 || visibleFilters.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* status は chip 全出しでなく件数つきプルダウン。 */}
            {statusTabs.length > 0 && (
              <Select
                aria-label={statusField?.label ?? 'status'}
                value={activeStatus ?? ''}
                onChange={(e) => setFilter('status', e.target.value || null)}
                className="w-auto"
              >
                <option value="">
                  {statusField?.label ?? 'ステータス'}：{t('all')}（{data.length}）
                </option>
                {statusTabs.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}（{statusCounts.get(s) ?? 0}）
                  </option>
                ))}
              </Select>
            )}
            {visibleFilters.map((f) =>
              f.kind === 'boolean' ? (
                // 真偽はチェックボックス（ON＝true のみ表示）。
                <label key={f.key} className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={filterValue(f.key) === 'true'}
                    onChange={(e) => setFilter(f.key, e.target.checked ? 'true' : null)}
                  />
                  {f.label}
                </label>
              ) : (
                // カテゴリ（参照/選択）はプルダウン（単一選択）。
                <Select
                  key={f.key}
                  aria-label={f.label}
                  value={filterValue(f.key) ?? ''}
                  onChange={(e) => setFilter(f.key, e.target.value || null)}
                  className="w-auto"
                >
                  <option value="">
                    {f.label}：{t('all')}
                  </option>
                  {filterOptions[f.key].map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ),
            )}
          </div>
        )}
      </div>

      {rows.length === 0 && (globalFilter || columnFilters.length > 0) && <p className="text-sm text-muted">{t('noMatches')}</p>}

      {draftRows.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="section-label text-xs">{t('newDrafts')}</p>
          {draftRows.map((r) => (
            <Row key={r.original.record.id} record={r.original.record} />
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
