'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { advanceStatusAction } from '../actions';
import { StatusChip } from '@/shared/ui/primitives';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

// 状態機械の操作（詳細側）。現在のステータス → 次に選べるステータス（許容遷移は server＝core 準拠）。
// 矢印は「現在」と「選択肢」の間に置く（ボタン内に入れない）。
export function WorkflowActions({
  collectionId,
  recordId,
  current,
  nextStates,
}: {
  collectionId: string;
  recordId: string;
  current: { value: string; label: string };
  nextStates: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function advance(to: string) {
    setBusy(true);
    try {
      await advanceStatusAction(collectionId, recordId, to);
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusChip tone="current">{current.label || current.value}</StatusChip>
      {nextStates.length > 0 ? (
        <>
          <span className="text-muted" aria-hidden="true">
            →
          </span>
          {nextStates.map((s) => (
            <button key={s.value} disabled={busy} onClick={() => advance(s.value)} className="btn btn-secondary">
              {s.label}
            </button>
          ))}
        </>
      ) : (
        <span className="text-xs text-muted">{t('noNextStates')}</span>
      )}
    </div>
  );
}
