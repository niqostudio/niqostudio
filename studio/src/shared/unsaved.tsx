'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, type ReactNode } from 'react';

// 未保存の変更を横断で監視するガード（全データ共通）。各エディタが useUnsavedGuard(dirty) で登録し、
// dirty があれば「アプリ内リンク遷移」と「リロード/閉じる」を確認ダイアログで止める。
// ※ App Router にはソフト遷移の停止 API が無いため、内部リンク(<a href="/...">)のクリックを捕捉して防ぐ。
//   プログラム的 router.push とブラウザ戻る(popstate) は未カバー（必要なら後で追加）。
type Ctx = { setDirty: (id: string, dirty: boolean) => void };
const UnsavedCtx = createContext<Ctx | null>(null);

export function UnsavedProvider({ children }: { children: ReactNode }) {
  const dirtyIds = useRef<Set<string>>(new Set());

  const setDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyIds.current.add(id);
    else dirtyIds.current.delete(id);
  }, []);

  useEffect(() => {
    const anyDirty = () => dirtyIds.current.size > 0;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (anyDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!anyDirty() || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('/') || a.target === '_blank') return; // 内部遷移のみ対象
      if (!window.confirm('未保存の変更があります。移動して破棄しますか？')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true); // capture：Link 自身のハンドラより先に止める
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  const value = useMemo(() => ({ setDirty }), [setDirty]);
  return <UnsavedCtx.Provider value={value}>{children}</UnsavedCtx.Provider>;
}

// エディタの未保存状態を登録する。dirty が変わるたび反映、アンマウントで解除。
export function useUnsavedGuard(dirty: boolean) {
  const ctx = useContext(UnsavedCtx);
  const id = useId();
  useEffect(() => {
    ctx?.setDirty(id, dirty);
    return () => ctx?.setDirty(id, false);
  }, [ctx, id, dirty]);
}
