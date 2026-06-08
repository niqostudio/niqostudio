'use client';

import { useState } from 'react';
import { Input, Select, Textarea } from './primitives';
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
  return (
    <Input
      type={d.kind === 'date' ? 'date' : 'text'}
      value={asText(value)}
      className="w-full"
      onChange={(e) => onChange(e.target.value || null)}
    />
  );
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
      <span className="text-sm text-muted">{d.label}</span>
      <FieldControl d={d} value={value} onChange={onChange} refOptions={refOptions} />
    </label>
  );
}
