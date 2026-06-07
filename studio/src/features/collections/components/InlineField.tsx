'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { FieldInput } from '@/shared/ui/fields';
import type { FieldDescriptor } from '@/features/domain-overlay/schema';
import { setFieldAction } from '../actions';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

// 詳細ペインの項目別インライン編集。読み取り時は鉛筆、押すとその項目だけ編集→保存（下書きに反映）。
export function InlineField({
  collectionId,
  recordId,
  d,
  value,
  display,
  refOptions,
}: {
  collectionId: string;
  recordId: string;
  d: FieldDescriptor;
  value: unknown;
  display: string;
  refOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState<unknown>(value);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await setFieldAction(collectionId, recordId, d.key, val);
      setEditing(false);
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <FieldInput d={d} value={val} refOptions={refOptions} onChange={setVal} />
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={busy} className="btn btn-primary">{t('save')}</button>
          <button onClick={() => { setVal(value); setEditing(false); }} className="text-xs text-muted hover:text-accent">{t('close')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-0.5">
      <span className="text-xs text-muted">{d.label}</span>
      <div className="flex items-start gap-2">
        <span className="text-sm break-words">{display}</span>
        <button
          onClick={() => { setVal(value); setEditing(true); }}
          title={t('edit')}
          className="mt-0.5 shrink-0 text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
