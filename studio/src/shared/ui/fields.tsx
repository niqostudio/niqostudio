'use client';

import { useState } from 'react';
import { Input, Select, Textarea } from './primitives';
import { DatePicker } from './DatePicker';
import type { FieldDescriptor } from '@/features/domain-overlay/schema';
import { t } from '@/shared/i18n';

// schema 駆動のフィールド描画（記述子1つで入力欄を出す）。collection 詳細・子編集で共有。
export type RefOption = { value: string; label: string };

export function asText(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export function defaultFor(d: FieldDescriptor): unknown {
  return d.kind === 'list' ? [] : d.kind === 'boolean' ? false : null;
}

// 2カラム配置の行分割。背の高い項目（textarea/list）は全幅、それ以外は2つずつ対にする。
// 日付は「日付同士」でのみ対にして、開始/終了のような対称データを必ず左右に並べる
// （手前の全幅項目で auto-flow のパリティが崩れて対が割れるのを防ぐ）。
export function packFieldRows<T extends { kind?: string }>(items: T[]): T[][] {
  const wide = (d: T) => d.kind === 'textarea' || d.kind === 'list';
  const rows: T[][] = [];
  let i = 0;
  while (i < items.length) {
    const f = items[i];
    const next = items[i + 1];
    if (!wide(f) && next && !wide(next) && (f.kind === 'date' ? next.kind === 'date' : next.kind !== 'date')) {
      rows.push([f, next]);
      i += 2;
    } else {
      rows.push([f]);
      i += 1;
    }
  }
  return rows;
}

// ラベルを1つずつ足すタグ入力（text[] 用）。確定チップは入力欄の外に出し、クリックで削除。
function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [pending, setPending] = useState('');
  const add = () => {
    const v = pending.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setPending('');
  };
  return (
    <div className="flex flex-col gap-2">
      <Input
        value={pending}
        placeholder={t('tagPlaceholder')}
        className="w-full"
        onChange={(e) => setPending(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              title={t('remove')}
              className="chip inline-flex items-center px-2 py-0.5 text-xs hover:border-error hover:text-error hover:line-through"
              onClick={() => onChange(value.filter((x) => x !== tag))}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 入力欄本体（ラベル無し）。詳細ペインのインライン編集は自前ラベルと併用するため分離。
export function FieldControl({
  d,
  value,
  onChange,
  refOptions,
}: {
  d: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  refOptions?: RefOption[];
}) {
  if (d.kind === 'textarea')
    return <Textarea value={asText(value)} rows={2} className="w-full" onChange={(e) => onChange(e.target.value || null)} />;
  if (d.kind === 'select')
    return (
      <Select value={asText(value)} className="w-full" onChange={(e) => onChange(e.target.value || null)}>
        {!d.required && <option value="">{t('none')}</option>}
        {(d.options ?? []).map((o) => (
          <option key={o} value={o}>
            {d.optionLabels?.[o] ?? o}
          </option>
        ))}
      </Select>
    );
  if (d.kind === 'reference')
    return (
      <Select value={asText(value)} className="w-full" onChange={(e) => onChange(e.target.value || null)}>
        {!d.required && <option value="">{t('none')}</option>}
        {(refOptions ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label || t('untitled')}
          </option>
        ))}
      </Select>
    );
  if (d.kind === 'boolean')
    return (
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm">{t('yes')}</span>
      </span>
    );
  if (d.kind === 'list') return <TagInput value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
  if (d.kind === 'date')
    return <DatePicker value={asText(value)} className="w-full" onChange={(v) => onChange(v || null)} />;
  return <Input type="text" value={asText(value)} className="w-full" onChange={(e) => onChange(e.target.value || null)} />;
}

export function FieldInput({
  d,
  value,
  onChange,
  refOptions,
}: {
  d: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  refOptions?: RefOption[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">
        {d.label}
        {d.required && <span className="text-error"> *</span>}
      </span>
      <FieldControl d={d} value={value} onChange={onChange} refOptions={refOptions} />
    </label>
  );
}
