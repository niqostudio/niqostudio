'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FieldControl, asText, type RefOption } from '@/shared/ui/fields';
import type { FieldDescriptor } from '@/features/domain-overlay/schema';
import { setFieldsAction } from '../actions';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

type Fields = Record<string, unknown>;
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// 詳細ペインの項目編集（一括保存モデル）。
// - boolean は直接トグル、その他はクリックでインライン編集。
// - 変更は印（dot）だけ付け、保存は右上の「保存」1つで一括（下書きへ）。
// - 未保存のまま離脱しようとしたら警告（beforeunload）。
// - 読み/編集で行高を固定し、他項目のレイアウトを動かさない。
export function RecordDetailFields({
  collectionId,
  recordId,
  fields,
  values,
  refOptions,
}: {
  collectionId: string;
  recordId: string;
  fields: FieldDescriptor[];
  values: Fields;
  refOptions: Record<string, RefOption[]>;
}) {
  const router = useRouter();
  const [work, setWork] = useState<Fields>(values);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dirtyKeys = fields.filter((f) => !eq(work[f.key], values[f.key])).map((f) => f.key);
  const dirty = dirtyKeys.length > 0;

  // 未保存のまま離脱（リロード/閉じる/外部遷移）したら確認。
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

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

  function display(f: FieldDescriptor, v: unknown): string {
    if (v == null || v === '') return '—';
    if (f.kind === 'list') return Array.isArray(v) ? (v as unknown[]).join('、') || '—' : '—';
    if (f.kind === 'reference') return refOptions[f.key]?.find((o) => o.value === asText(v))?.label ?? asText(v);
    if (f.kind === 'select') return f.optionLabels?.[asText(v)] ?? asText(v);
    return asText(v);
  }

  return (
    <section className="flex flex-col gap-3">
      {dirty && (
        <div className="flex justify-end">
          <button onClick={save} disabled={busy} className="btn btn-primary inline-flex items-center gap-1.5">
            {t('save')}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const v = work[f.key];
          const changed = !eq(v, values[f.key]);
          const wide = f.kind === 'textarea' || f.kind === 'list';
          return (
            <div key={f.key} className={wide ? 'sm:col-span-2' : undefined}>
              <span className="flex items-center gap-1 text-xs text-muted">
                {f.label}
                {changed && <span className="inline-block size-1.5 rounded-full bg-accent" title={t('unsaved')} />}
              </span>
              <div className="mt-0.5 flex min-h-9 items-center">
                {f.kind === 'boolean' ? (
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
                ) : editing === f.key ? (
                  <div className="w-full">
                    <FieldControl d={f} value={v} refOptions={refOptions[f.key]} onChange={(nv) => set(f.key, nv)} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(f.key)}
                    className="w-full break-words text-left text-sm transition-colors hover:text-accent"
                  >
                    {display(f, v)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
