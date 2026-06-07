'use client';

import { useState } from 'react';
import { Input, Select, Textarea } from './primitives';
import type { FieldDescriptor } from '@/shared/records/schema';
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

export function FieldInput({
  d, value, onChange, refOptions,
}: {
  d: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  refOptions?: RefOption[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{d.label}</span>
      {d.kind === 'textarea' ? (
        <Textarea value={asText(value)} rows={2} className="w-full" onChange={(e) => onChange(e.target.value || null)} />
      ) : d.kind === 'select' ? (
        <Select value={asText(value)} className="w-full" onChange={(e) => onChange(e.target.value || null)}>
          {(d.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      ) : d.kind === 'reference' ? (
        <Select value={asText(value)} className="w-full" onChange={(e) => onChange(e.target.value || null)}>
          {!d.required && <option value="">{t('none')}</option>}
          {(refOptions ?? []).map((o) => <option key={o.value} value={o.value}>{o.label || t('untitled')}</option>)}
        </Select>
      ) : d.kind === 'boolean' ? (
        <span className="flex items-center gap-2">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-sm">{t('yes')}</span>
        </span>
      ) : d.kind === 'list' ? (
        <TagInput value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
      ) : (
        <Input
          type={d.kind === 'date' ? 'date' : 'text'}
          value={asText(value)}
          className="w-full"
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}
    </label>
  );
}
