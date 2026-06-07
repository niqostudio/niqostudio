// 最小トースト通知。client component から toast.success(...) 等で push、Toaster が購読して描く。
export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  // クリック時の動作（例：terminal を開く）。
  onClick?: () => void;
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeToasts(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getToasts(): Toast[] {
  return toasts;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function pushToast(kind: ToastKind, message: string, onClick?: () => void): void {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, kind, message, onClick }];
  emit();
  setTimeout(() => dismissToast(id), 3500);
}

export const toast = {
  success: (m: string, onClick?: () => void) => pushToast('success', m, onClick),
  error: (m: string, onClick?: () => void) => pushToast('error', m, onClick),
  info: (m: string, onClick?: () => void) => pushToast('info', m, onClick),
  warning: (m: string, onClick?: () => void) => pushToast('warning', m, onClick),
};
