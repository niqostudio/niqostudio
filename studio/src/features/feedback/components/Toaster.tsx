'use client';

import { useSyncExternalStore } from 'react';
import { subscribeToasts, getToasts, dismissToast, type ToastKind } from '@/features/feedback/toast';

// 種類で左罫の色だけ分ける（面は白＝業務システムの可読性優先）。onClick 付きはクリック可能。
const BORDER: Record<ToastKind, string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  info: 'border-l-info',
  warning: 'border-l-warning',
};

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={!t.onClick}
          onClick={() => { t.onClick?.(); dismissToast(t.id); }}
          className={`pointer-events-auto min-w-56 rounded-sm border border-border border-l-2 bg-surface px-4 py-2 text-left text-sm text-fg shadow-md ${BORDER[t.kind]} ${t.onClick ? 'cursor-pointer hover:border-accent' : ''}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
