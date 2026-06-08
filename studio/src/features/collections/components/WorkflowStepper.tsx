'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { advanceStatusAction } from '../actions';
import { StatusChip } from '@/shared/ui/primitives';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

// 状態機械のマスタ（全状態＝順序つき）をそのままインタラクティブに。
// 現在＝塗り／完了＝緑／未来＝淡。許容遷移（次に選べる状態）はどこにあってもクリック可＝分岐もそのまま出る。
export function WorkflowStepper({
  collectionId,
  recordId,
  steps,
  current,
  nextValues,
}: {
  collectionId: string;
  recordId: string;
  steps: { value: string; label: string }[];
  current: string;
  nextValues: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const nextSet = new Set(nextValues);
  const idx = steps.findIndex((s) => s.value === current);

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
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((s, i) => {
        const isCurrent = s.value === current;
        const isNext = nextSet.has(s.value);
        const done = idx >= 0 && i < idx;
        return (
          <span key={s.value} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-muted" aria-hidden="true">
                →
              </span>
            )}
            {isNext ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => advance(s.value)}
                title={`${s.label} に進める`}
                className="chip inline-flex items-center px-2 py-0.5 border-accent text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-50"
              >
                {s.label}
              </button>
            ) : (
              <StatusChip tone={isCurrent ? 'current' : done ? 'done' : 'upcoming'}>{s.label}</StatusChip>
            )}
          </span>
        );
      })}
    </div>
  );
}
