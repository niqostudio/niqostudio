'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import { Action } from '@/shared/ui/primitives';
import { FieldControl, asText, type RefOption } from '@/shared/ui/fields';
import type { FieldDescriptor } from '@/features/domain-overlay/schema';
import { setFieldsAction, publishAction } from '../actions';
import { toast } from '@/features/feedback/toast';
import { useUnsavedGuard } from '@/shared/unsaved';
import { t } from '@/shared/i18n';

type Fields = Record<string, unknown>;
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// 詳細ペインの編集状態を持ち上げる context。ヘッダの DetailActions（保存）と本文の DetailFields が共有し、
// 保存ボタンをヘッダの常設コンテナ（編集と同じ）に置けるようにする。
type Ctx = {
  work: Fields;
  values: Fields;
  set: (key: string, v: unknown) => void;
  editing: string | null;
  setEditing: (key: string | null) => void;
  dirty: boolean;
  busy: boolean;
  save: () => void;
};
const EditCtx = createContext<Ctx | null>(null);
function useRecordEdit(): Ctx {
  const c = useContext(EditCtx);
  if (!c) throw new Error('RecordEditProvider の外で useRecordEdit を使用');
  return c;
}

export function RecordEditProvider({
  collectionId,
  recordId,
  fieldKeys,
  values,
  children,
}: {
  collectionId: string;
  recordId: string;
  fieldKeys: string[];
  values: Fields;
  children: ReactNode;
}) {
  const router = useRouter();
  const [work, setWork] = useState<Fields>(values);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dirtyKeys = fieldKeys.filter((k) => !eq(work[k], values[k]));
  const dirty = dirtyKeys.length > 0;

  // 未保存ガード（横断）：アプリ内遷移・リロードを確認で止める。
  useUnsavedGuard(dirty);

  const set = (key: string, v: unknown) => setWork((w) => ({ ...w, [key]: v }));

  async function save() {
    setBusy(true);
    try {
      const patch: Fields = {};
      for (const k of dirtyKeys) patch[k] = work[k];
      await setFieldsAction(collectionId, recordId, patch);
      toast.success(t('saved'));
      setEditing(null);
      router.refresh();
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditCtx.Provider value={{ work, values, set, editing, setEditing, dirty, busy, save }}>
      {children}
    </EditCtx.Provider>
  );
}

// ヘッダのアクション群（保存/反映/編集）。常設コンテナなので保存の出現で高さが変わらない。
export function DetailActions({
  collectionId,
  recordId,
  hasDraft,
  editHref,
}: {
  collectionId: string;
  recordId: string;
  hasDraft: boolean;
  editHref: string;
}) {
  const { dirty, busy, save } = useRecordEdit();
  return (
    <div className="flex shrink-0 items-center gap-2">
      {dirty && (
        <Action variant="primary" onClick={save} disabled={busy}>
          {t('save')}
        </Action>
      )}
      {hasDraft && (
        <form action={publishAction.bind(null, collectionId, recordId)}>
          <Action variant="primary" type="submit">
            {t('publish')}
          </Action>
        </form>
      )}
      <Action variant="secondary" href={editHref}>
        <Pencil className="size-4" />
        {t('edit')}
      </Action>
    </div>
  );
}

// 本文の項目編集。boolean は直接トグル、その他はクリックでインライン編集。読み/編集で行高を固定。
export function DetailFields({
  fields,
  refOptions,
}: {
  fields: FieldDescriptor[];
  refOptions: Record<string, RefOption[]>;
}) {
  const { work, values, set, editing, setEditing } = useRecordEdit();

  function display(f: FieldDescriptor, v: unknown): string {
    if (v == null || v === '') return '—';
    if (f.kind === 'list') return Array.isArray(v) ? (v as unknown[]).join('、') || '—' : '—';
    if (f.kind === 'reference') return refOptions[f.key]?.find((o) => o.value === asText(v))?.label ?? asText(v);
    if (f.kind === 'select') return f.optionLabels?.[asText(v)] ?? asText(v);
    return asText(v);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((f) => {
        const v = work[f.key];
        const changed = !eq(v, values[f.key]);
        const wide = f.kind === 'textarea' || f.kind === 'list';
        return (
          <div key={f.key} className={wide ? 'sm:col-span-2' : undefined}>
            <span className="flex items-center gap-1 text-xs text-muted">
              {f.label}
              {f.required && <span className="text-error">*</span>}
              {changed && <span className="inline-block size-1.5 rounded-full bg-accent" title={t('unsaved')} />}
            </span>
            {f.kind === 'boolean' ? (
              <div className="mt-0.5 flex min-h-9 items-center">
                <button
                  type="button"
                  onClick={() => set(f.key, !(v === true))}
                  className="flex items-center gap-2 text-sm transition-colors hover:text-accent"
                >
                  <span
                    className={`grid size-4 place-items-center rounded-sm border text-[10px] ${v === true ? 'border-accent text-accent' : 'border-border text-transparent'}`}
                  >
                    ✓
                  </span>
                  <span>{v === true ? t('yes') : '—'}</span>
                </button>
              </div>
            ) : wide ? (
              // 背の高い項目（list/textarea）は常に入力欄＝読↔編の切替が無く高さがずれない。
              <div className="mt-0.5">
                <FieldControl d={f} value={v} refOptions={refOptions[f.key]} onChange={(nv) => set(f.key, nv)} />
              </div>
            ) : editing === f.key ? (
              <div className="mt-0.5 flex min-h-9 items-center gap-1">
                <FieldControl d={f} value={v} refOptions={refOptions[f.key]} onChange={(nv) => set(f.key, nv)} />
                <button
                  type="button"
                  title={t('close')}
                  onClick={() => {
                    set(f.key, values[f.key]);
                    setEditing(null);
                  }}
                  className="shrink-0 text-muted transition-colors hover:text-error"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(f.key)}
                className="mt-0.5 flex min-h-9 w-full items-center break-words text-left text-sm transition-colors hover:text-accent"
              >
                {display(f, v)}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
