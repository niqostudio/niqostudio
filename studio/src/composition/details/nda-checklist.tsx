'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Action, StatusBadge, Input, Textarea } from '@/shared/ui/primitives';
import { setFieldsAction, publishAction } from '@/features/collections/actions';
import { toast } from '@/features/feedback/toast';
import { useUnsavedGuard } from '@/shared/unsaved';
import { t } from '@/shared/i18n';

type Fields = Record<string, unknown>;
const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const j = (v: unknown) => JSON.stringify(v ?? null);

// 公開可否の読み合わせ項目（カテゴリ単位の公開ゲート＝ndas）。
const CATEGORIES = [
  { key: 'publish_problems', label: '課題・解決・成果を公開する' },
  { key: 'publish_deliverables', label: '成果物（スクショ・URL）を公開する' },
  { key: 'publish_metrics', label: '数値（Before / After）を公開する' },
  { key: 'publish_testimonial', label: '推薦文（お客様の声）を公開する' },
];
const STATUS_LABEL: Record<string, string> = { draft: '下書き', agreed: '合意済' };

// NDA 専用詳細：打ち合わせで画面共有しながら読み合わせ→チェック→反映。電子署名・PDF は後段。
export function NdaChecklist({
  recordId,
  fields,
  projectLabel,
  hasDraft,
  editHref,
  closeHref,
  updatedAt,
}: {
  recordId: string;
  fields: Fields;
  projectLabel: string;
  hasDraft: boolean;
  editHref: string;
  closeHref: string;
  updatedAt: string;
}) {
  const [work, setWork] = useState<Fields>(fields);
  const [busy, setBusy] = useState(false);

  const dirty = j(work) !== j(fields);
  useUnsavedGuard(dirty);

  const set = (k: string, v: unknown) => setWork((w) => ({ ...w, [k]: v }));

  async function persist(next: Fields) {
    setBusy(true);
    try {
      const patch: Fields = {};
      for (const k of Object.keys(next)) if (j(next[k]) !== j(fields[k])) patch[k] = next[k];
      await setFieldsAction('ndas', recordId, patch);
      toast.success(t('saved'));
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  }

  const status = asStr(work.status);
  // 合意済は編集不可（読み合わせ・チェック・項目を読み取り専用に）。
  const locked = status === 'agreed';
  const markAgreed = () => {
    const next = { ...work, status: 'agreed', agreed_on: new Date().toISOString().slice(0, 10) };
    setWork(next);
    persist(next);
  };

  return (
    <div className="h-full overflow-y-auto p-5 md:p-8 print:h-auto print:overflow-visible">
      <div className="mx-auto flex max-w-2xl flex-col gap-7">
        <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">NDA</h2>
            <StatusBadge status={status} label={STATUS_LABEL[status] ?? status} />
          </div>
          <p className="text-sm">{projectLabel || '（案件未設定）'}</p>
          <p className="text-xs text-muted">
            {t('updated')} {updatedAt}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 print:hidden">
          {!locked && dirty && (
            <Action variant="primary" onClick={() => persist(work)} disabled={busy}>
              {t('save')}
            </Action>
          )}
          {hasDraft && (
            <form action={publishAction.bind(null, 'ndas', recordId)}>
              <Action variant="primary" type="submit">
                {t('publish')}
              </Action>
            </form>
          )}
          <Action variant="secondary" onClick={() => window.print()}>
            PDFに保存
          </Action>
          {!locked && (
            <Action variant="secondary" href={editHref}>
              <Pencil className="size-4" />
              {t('edit')}
            </Action>
          )}
          <Action variant="secondary" href={closeHref} title="閉じる">
            <X className="size-4" />
          </Action>
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <p className="section-label text-xs">公開カテゴリ（読み合わせ）</p>
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((c) => {
            const on = work[c.key] === true;
            const inner = (
              <>
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-sm border ${on ? 'border-accent text-accent' : 'border-border text-transparent'}`}
                >
                  ✓
                </span>
                <span className={`text-base ${on ? '' : 'text-muted'}`}>{c.label}</span>
              </>
            );
            return locked ? (
              <div key={c.key} className="flex items-center gap-3 rounded-sm border border-border-subtle px-4 py-3">
                {inner}
              </div>
            ) : (
              <button
                key={c.key}
                type="button"
                onClick={() => set(c.key, !on)}
                className="flex items-center gap-3 rounded-sm border border-border-subtle px-4 py-3 text-left transition-colors hover:border-accent"
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted">NDA 文書</span>
          {locked ? (
            <p className="text-sm">{asStr(work.reference) || '—'}</p>
          ) : (
            <Input value={asStr(work.reference)} className="w-full" onChange={(e) => set('reference', e.target.value || null)} />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted">合意日</span>
          {locked ? (
            <p className="text-sm">{asStr(work.agreed_on) || '—'}</p>
          ) : (
            <Input
              type="date"
              value={asStr(work.agreed_on)}
              className="w-full"
              onChange={(e) => set('agreed_on', e.target.value || null)}
            />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted">メモ</span>
          {locked ? (
            <p className="whitespace-pre-wrap text-sm">{asStr(work.notes) || '—'}</p>
          ) : (
            <Textarea value={asStr(work.notes)} rows={2} className="w-full" onChange={(e) => set('notes', e.target.value || null)} />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted">PDF（保存した NDA の URL）</span>
          {locked ? (
            asStr(work.pdf_url) ? (
              <a href={asStr(work.pdf_url)} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
                PDF を開く
              </a>
            ) : (
              <p className="text-sm">—</p>
            )
          ) : (
            <>
              <Input
                value={asStr(work.pdf_url)}
                className="w-full"
                placeholder="https://（保存した PDF の URL）"
                onChange={(e) => set('pdf_url', e.target.value || null)}
              />
              {asStr(work.pdf_url) && (
                <a href={asStr(work.pdf_url)} target="_blank" rel="noreferrer" className="mt-0.5 text-xs text-accent hover:underline">
                  PDF を開く
                </a>
              )}
            </>
          )}
        </div>
      </section>

      {status !== 'agreed' && (
        <div>
          <Action variant="primary" onClick={markAgreed} disabled={busy}>
            合意済にする
          </Action>
        </div>
      )}
      </div>
    </div>
  );
}
