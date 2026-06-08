'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackLink, Input } from '@/shared/ui/primitives';
import { FieldInput, asText, defaultFor } from '@/shared/ui/fields';
import type { CollectionSchema, FieldDescriptor } from '@/features/domain-overlay/schema';
import { t, type MessageKey } from '@/shared/i18n';
import { toast } from '@/features/feedback/toast';
import { useUnsavedGuard } from '@/shared/unsaved';
import { openTerminal, openTerminalWithRun } from '@/features/terminal/panel';
import {
  saveDraftJson,
  deriveRecordAction,
  discardDraftAction,
  restoreVersionAction,
  addSourceAction,
  removeSourceAction,
} from '../actions';

type Row = Record<string, unknown>;
type Fields = Record<string, unknown>;
type Source = { id: string; ref: string; role: string | null; visibility: string };
type Version = { id: string; origin: string; createdAt: string };

function rows(fields: Fields, key: string): Row[] {
  return Array.isArray(fields[key]) ? (fields[key] as Row[]) : [];
}

export default function RecordPaneEditor(props: {
  collectionId: string;
  recordId: string;
  schema: CollectionSchema;
  initialFields: Fields;
  isDraft: boolean;
  updatedAt: string;
  referenceOptions?: Record<string, { value: string; label: string }[]>;
  // status 等のワークフロー項目は詳細側で操作するため編集フォームからは外す。
  workflowField?: string;
  sources: Source[];
  versions: Version[];
}) {
  const { collectionId, recordId, schema } = props;
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(props.initialFields);
  const [open, setOpen] = useState<{ childKey: string; id: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState({ ref: '', role: '', visibility: 'private' as 'private' | 'public' });

  const dirty = JSON.stringify(fields) !== JSON.stringify(props.initialFields);
  useUnsavedGuard(dirty);

  async function run(fn: () => Promise<void>, msg?: { pending?: string; success?: string; onClick?: () => void }) {
    setBusy(true);
    if (msg?.pending) toast.info(msg.pending, msg.onClick);
    try {
      await fn();
      if (msg?.success) toast.success(msg.success, msg.onClick);
    } catch {
      toast.error(t('error'), msg?.onClick);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  // 取り込みは run() と別に、対応 run を取得してトーストから terminal の行へ紐づける。
  async function runDerive() {
    setBusy(true);
    toast.info(t('importStarted'), openTerminal);
    try {
      const runId = await deriveRecordAction(collectionId, recordId);
      toast.success(t('importDone'), () => openTerminalWithRun(runId));
    } catch {
      toast.error(t('error'), openTerminal);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const setField = (key: string, v: unknown) => setFields((f) => ({ ...f, [key]: v }));
  const setChildField = (childKey: string, id: string, fk: string, v: unknown) =>
    setFields((f) => ({ ...f, [childKey]: rows(f, childKey).map((r) => (r.id === id ? { ...r, [fk]: v } : r)) }));
  function addChild(childKey: string) {
    const desc = schema.children.find((c) => c.key === childKey)!;
    const row: Row = { id: crypto.randomUUID() };
    for (const d of desc.fields) row[d.key] = defaultFor(d);
    setFields((f) => ({ ...f, [childKey]: [...rows(f, childKey), row] }));
    setOpen({ childKey, id: row.id as string });
  }
  const removeChild = (childKey: string, id: string) =>
    setFields((f) => ({ ...f, [childKey]: rows(f, childKey).filter((r) => r.id !== id) }));

  const childDesc = (key: string) => schema.children.find((c) => c.key === key)!;
  // 子フィールドの同一 record 内 reference（refChild）の選択肢。外向き FK は props.referenceOptions が持つ。
  const refOptionsFor = (d: FieldDescriptor) =>
    d.refChild ? rows(fields, d.refChild).map((r) => ({ value: r.id as string, label: asText(r[d.refLabelField ?? 'name']) })) : [];
  const pane = 'h-full shrink-0 overflow-y-auto border-r border-border-subtle';
  const openChild = open ? rows(fields, open.childKey).find((r) => r.id === open!.id) : undefined;

  return (
    <div className="flex h-full overflow-x-auto">
      {/* 親ペイン（本文＋メタ） */}
      <div className={`${pane} w-full max-w-xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border-subtle bg-bg px-5 py-3">
          <BackLink href={`/${collectionId}?sel=${recordId}`}>{t('toList')}</BackLink>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">{props.isDraft ? t('draft') : t('publishedState')}</span>
            {dirty ? (
              <>
                <span className="inline-flex items-center gap-1 text-xs text-accent">
                  <span className="inline-block size-1.5 rounded-full bg-accent" />{t('unsaved')}
                </span>
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => run(() => saveDraftJson(collectionId, recordId, JSON.stringify(fields)), { success: t('saved') })}
                >
                  {t('save')}
                </button>
              </>
            ) : (
              <span className="text-xs text-muted">{t('saved')}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* 対称な情報（開始/終了 等）が左右に並ぶよう2カラム。背の高い項目は全幅。 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {schema.fields
              .filter((d) => d.key !== props.workflowField)
              .map((d) => {
                const wide = d.kind === 'textarea' || d.kind === 'list';
                return (
                  <div key={d.key} className={wide ? 'sm:col-span-2' : undefined}>
                    <FieldInput
                      d={d}
                      value={fields[d.key]}
                      refOptions={props.referenceOptions?.[d.key]}
                      onChange={(v) => setField(d.key, v)}
                    />
                  </div>
                );
              })}
          </div>

          <div className="mt-2 flex flex-col gap-1">
            {schema.children.map((c) => {
              const n = rows(fields, c.key).length;
              const active = open?.childKey === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setOpen({ childKey: c.key, id: null })}
                  className={`flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors ${active ? 'bg-bg text-accent' : 'hover:bg-bg'}`}
                >
                  <span>{c.label}</span>
                  <span className="text-xs text-muted">{n} ›</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-6 border-t border-border-subtle pt-6">
            <section className="flex flex-col gap-2">
              <p className="section-label text-xs">{t('repositories')}</p>
              {props.sources.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{s.ref}</span>
                  <button className="text-xs text-muted hover:text-accent" disabled={busy} onClick={() => run(() => removeSourceAction(collectionId, recordId, s.id))}>{t('remove')}</button>
                </div>
              ))}
              <Input value={src.ref} placeholder={t('repoPlaceholder')} className="w-full" onChange={(e) => setSrc({ ...src, ref: e.target.value })} />
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary"
                  disabled={busy || !src.ref.trim()}
                  onClick={() => run(async () => { await addSourceAction(collectionId, recordId, { ref: src.ref, role: src.role || null, visibility: src.visibility }); setSrc({ ref: '', role: '', visibility: 'private' }); })}
                >
                  {t('addRepo')}
                </button>
                <button className="btn btn-primary grow" disabled={busy || props.sources.length === 0} onClick={runDerive}>{t('importFromGit')}</button>
              </div>
            </section>

            {props.versions.length > 0 && (
              <section className="flex flex-col gap-1">
                <p className="section-label text-xs">{t('history')}</p>
                {props.versions.map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className={i === 0 ? 'text-fg' : 'text-muted'}>
                      {t(`origin.${v.origin}` as MessageKey)}・{v.createdAt.slice(5, 16).replace('T', ' ')}
                    </span>
                    {i === 0 ? (
                      <span className="text-accent">{t('current')}</span>
                    ) : (
                      <button className="text-muted hover:text-accent" disabled={busy} onClick={() => run(() => restoreVersionAction(collectionId, recordId, v.id))}>{t('restore')}</button>
                    )}
                  </div>
                ))}
              </section>
            )}

            {props.isDraft && (
              <button className="self-start text-sm text-muted hover:text-accent" disabled={busy} onClick={() => run(() => discardDraftAction(collectionId, recordId))}>{t('discardDraft')}</button>
            )}
          </div>
        </div>
      </div>

      {/* 子コレクション一覧ペイン */}
      {open && (
        <div className={`${pane} w-full max-w-xs p-5`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">{childDesc(open.childKey).label}</p>
            <button className="text-xs text-muted hover:text-accent" onClick={() => setOpen(null)}>{t('close')}</button>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            {rows(fields, open.childKey).map((r) => {
              const labelField = childDesc(open!.childKey).fields[0].key;
              return (
                <button
                  key={r.id as string}
                  onClick={() => setOpen({ childKey: open!.childKey, id: r.id as string })}
                  className={`truncate rounded-sm px-3 py-2 text-left text-sm transition-colors ${open!.id === r.id ? 'bg-bg text-accent' : 'hover:bg-bg'}`}
                >
                  {asText(r[labelField]) || t('untitled')} ›
                </button>
              );
            })}
            <button className="btn btn-secondary mt-2" onClick={() => addChild(open!.childKey)}>＋ {t('add')}</button>
          </div>
        </div>
      )}

      {/* 子レコード編集ペイン */}
      {open && openChild && (
        <div className={`${pane} w-full max-w-md p-5`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">{childDesc(open.childKey).label}</p>
            <button className="text-xs text-muted hover:text-accent" onClick={() => { removeChild(open!.childKey, open!.id as string); setOpen({ childKey: open!.childKey, id: null }); }}>{t('remove')}</button>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {childDesc(open.childKey).fields.map((d) => (
              <FieldInput
                key={d.key}
                d={d}
                value={openChild[d.key]}
                refOptions={refOptionsFor(d)}
                onChange={(v) => setChildField(open!.childKey, open!.id as string, d.key, v)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
