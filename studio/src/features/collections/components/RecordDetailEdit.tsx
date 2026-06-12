'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Action } from '@/shared/ui/primitives';
import { FieldControl, FieldInput, asText, defaultFor, packFieldRows, type RefOption } from '@/shared/ui/fields';
import type { FieldDescriptor } from '@/features/domain-overlay/schema';
import { discardDraftAction, publishAction, saveDraftJson } from '../actions';
import { toast } from '@/features/feedback/toast';
import { useUnsavedGuard } from '@/shared/unsaved';
import { t } from '@/shared/i18n';

type Fields = Record<string, unknown>;
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const childRows = (w: Fields, key: string) => (Array.isArray(w[key]) ? (w[key] as Fields[]) : []);

// 詳細ペインの編集状態（親フィールド＋子コレクション）を持ち上げる context。
// ヘッダの DetailActions（保存）と本文の DetailFields / DetailChildren が共有し、保存は1つに集約する。
type Ctx = {
  work: Fields;
  values: Fields;
  set: (key: string, v: unknown) => void;
  addChild: (key: string, row: Fields) => void;
  setChildField: (key: string, id: string, field: string, v: unknown) => void;
  removeChild: (key: string, id: string) => void;
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
  values,
  children,
}: {
  collectionId: string;
  recordId: string;
  // 受け取るが dirty は work 全体（親＋子）で判定するため未使用。
  fieldKeys: string[];
  values: Fields;
  children: ReactNode;
}) {
  const router = useRouter();
  const [work, setWork] = useState<Fields>(values);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 親フィールドも子配列も含めた全体差分で「未保存」を判定する（保存は1つ）。
  const dirty = !eq(work, values);
  useUnsavedGuard(dirty);

  const set = (key: string, v: unknown) => setWork((w) => ({ ...w, [key]: v }));
  const addChild = (key: string, row: Fields) => setWork((w) => ({ ...w, [key]: [...childRows(w, key), row] }));
  const setChildField = (key: string, id: string, field: string, v: unknown) =>
    setWork((w) => ({ ...w, [key]: childRows(w, key).map((r) => (r.id === id ? { ...r, [field]: v } : r)) }));
  const removeChild = (key: string, id: string) =>
    setWork((w) => ({ ...w, [key]: childRows(w, key).filter((r) => r.id !== id) }));

  async function save() {
    setBusy(true);
    try {
      await saveDraftJson(collectionId, recordId, JSON.stringify(work));
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
    <EditCtx.Provider value={{ work, values, set, addChild, setChildField, removeChild, editing, setEditing, dirty, busy, save }}>
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
  const [discarding, setDiscarding] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-2">
      {dirty && (
        <Action variant="primary" onClick={save} disabled={busy}>
          {t('save')}
        </Action>
      )}
      {hasDraft && (
        <Action
          variant="secondary"
          disabled={busy || discarding}
          onClick={async () => {
            if (!window.confirm(t('discardDraftConfirm'))) return;
            setDiscarding(true);
            try {
              await discardDraftAction(collectionId, recordId);
            } finally {
              setDiscarding(false);
            }
          }}
        >
          <Trash2 className="size-4" />
          {t('discardDraft')}
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
    <div className="flex flex-col gap-3">
      {packFieldRows(fields).map((row, ri) => (
        <div key={ri} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {row.map((f) => {
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
                    className="group/edit -mx-2 mt-0.5 flex min-h-9 w-full items-center justify-between gap-2 rounded-sm px-2 text-left text-sm transition-colors hover:bg-surface-2"
                  >
                    <span className="break-words">{display(f, v)}</span>
                    <Pencil className="size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover/edit:opacity-100" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// 子コレクション（成果物・要望 等）を詳細ペインでインライン編集（行を開いて編集・追加・削除）。
// /edit に飛ばず文脈の中で編集できる。保存は親と同じ context の save（ヘッダの保存ボタン）に集約。
type ChildDescriptor = { key: string; label: string; fields: FieldDescriptor[] };
export function DetailChildren({ items }: { items: ChildDescriptor[] }) {
  const { work, addChild, setChildField, removeChild } = useRecordEdit();
  const [open, setOpen] = useState<string | null>(null);

  const refFor = (d: FieldDescriptor): RefOption[] | undefined =>
    d.refChild
      ? childRows(work, d.refChild).map((r) => ({ value: r.id as string, label: asText(r[d.refLabelField ?? 'name']) }))
      : undefined;

  const add = (c: ChildDescriptor) => {
    const row: Fields = { id: crypto.randomUUID() };
    for (const d of c.fields) row[d.key] = defaultFor(d);
    addChild(c.key, row);
    setOpen(row.id as string);
  };

  return (
    <div className="flex flex-col gap-5">
      {items.map((c) => (
        <section key={c.key} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="section-label text-xs">{c.label}</p>
            <button
              type="button"
              onClick={() => add(c)}
              className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent"
            >
              <Plus className="size-3.5" />
              {t('add')}
            </button>
          </div>
          {childRows(work, c.key).length > 0 && (
            <div className="flex flex-col gap-1">
              {childRows(work, c.key).map((row) => {
                const rid = row.id as string;
                const expanded = open === rid;
                const labelKey = c.fields[0]?.key ?? 'id';
                return (
                  <div key={rid} className="rounded-sm border border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : rid)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                    >
                      {expanded ? (
                        <ChevronDown className="size-3.5 shrink-0 text-muted" />
                      ) : (
                        <ChevronRight className="size-3.5 shrink-0 text-muted" />
                      )}
                      <span className="flex-1 truncate">{asText(row[labelKey]) || t('untitled')}</span>
                    </button>
                    {expanded && (
                      <div className="flex flex-col gap-3 border-t border-border-subtle p-3">
                        {c.fields.map((d) => (
                          <FieldInput
                            key={d.key}
                            d={d}
                            value={row[d.key]}
                            refOptions={refFor(d)}
                            onChange={(v) => setChildField(c.key, rid, d.key, v)}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            removeChild(c.key, rid);
                            setOpen(null);
                          }}
                          className="inline-flex items-center gap-1 self-start text-xs text-muted transition-colors hover:text-error"
                        >
                          <Trash2 className="size-3.5" />
                          {t('remove')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
