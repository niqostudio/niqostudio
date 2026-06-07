'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { advanceStatusAction } from '../actions';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

// 状態機械の「次状態へ進める」操作（詳細側）。許容遷移は server から渡る（core 準拠）。
export function WorkflowActions({
  collectionId,
  recordId,
  nextStates,
}: {
  collectionId: string;
  recordId: string;
  nextStates: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (nextStates.length === 0) return <p className="text-xs text-muted">{t('noNextStates')}</p>;

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
    <div className="flex flex-wrap gap-2">
      {nextStates.map((s) => (
        <button key={s.value} disabled={busy} onClick={() => advance(s.value)} className="btn btn-secondary inline-flex items-center gap-1">
          <span aria-hidden="true">→</span> {s.label}
        </button>
      ))}
    </div>
  );
}
