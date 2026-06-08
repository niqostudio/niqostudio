'use client';

import { useEffect, useRef, useState } from 'react';
import { replyToInquiryAction } from '../inquiry-reply';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

type Item = { from: 'customer' | 'us'; body: string; at: string };

// 返信スレッド。上が古い・下が新しい。初期表示と返信後は最下部へスクロール。送信は server action（Resend）。
export function InquiryThread({
  inquiryId,
  to,
  enabled,
  items,
}: {
  inquiryId: string;
  to: string;
  enabled: boolean;
  items: Item[];
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  const send = async () => {
    if (!body.trim()) {
      toast.error('本文を入力してください');
      return;
    }
    setBusy(true);
    try {
      await replyToInquiryAction(inquiryId, body);
      toast.success('返信を送信しました');
      setBody('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={scrollRef} className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-sm border border-border bg-surface-2 p-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted">まだやり取りがありません。</p>
        ) : (
          items.map((m, i) => (
            <div key={i} className={`flex flex-col gap-0.5 ${m.from === 'us' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-sm px-3 py-2 text-sm ${
                  m.from === 'us' ? 'bg-accent text-on-accent' : 'border border-border bg-surface'
                }`}
              >
                {m.body || '—'}
              </div>
              <span className="text-[10px] text-faint">{m.at}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          className="field"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={to ? `${to} への返信` : '宛先メール未設定'}
        />
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={send} disabled={busy || !enabled || !to}>
            送信
          </button>
          {!enabled && <span className="text-xs text-warning">RESEND_API_KEY 未設定（studio/.env.local）</span>}
        </div>
      </div>
    </div>
  );
}
