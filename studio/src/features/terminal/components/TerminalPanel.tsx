'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { subscribeTerminal, isTerminalOpen, toggleTerminal, getActiveRunId } from '@/features/terminal/panel';
import { listRuns } from '@/features/terminal/actions';
import type { CommandRun, RunStatus } from '@/adapters/studio-store/run-store';
import { t } from '@/shared/i18n';

// 開いている間だけ実行履歴をポーリングする間隔。実行＝daemon なので更新ボタンは持たず自動反映する。
const POLL_MS = 2500;

const DOT: Record<RunStatus, string> = { running: 'bg-muted', ok: 'bg-success', error: 'bg-error' };

// メイン列の底に常駐する dock。閉じている時は頭（Terminal ラベル）だけ覗き、ラベルのクリックで
// 下から伸びる（上のコンテンツが flex で縮む）。close ボタンは持たず、ラベルでトグルする。
export function TerminalPanel() {
  const open = useSyncExternalStore(subscribeTerminal, isTerminalOpen, () => false);
  const activeId = useSyncExternalStore(subscribeTerminal, getActiveRunId, () => null);
  const [runs, setRuns] = useState<CommandRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const activeRef = useRef<HTMLDetailsElement>(null);

  // 開いている間だけ自動でポーリング（閉じれば停止）。in-flight 完了後の setState は active で握り潰す。
  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      const next = await listRuns();
      if (active) {
        setRuns(next);
        setLoaded(true);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [open]);
  useEffect(() => {
    if (activeId) activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId, runs]);

  return (
    <div
      className={`flex shrink-0 flex-col overflow-hidden border-t border-border-subtle bg-surface transition-[height] duration-200 ease-out ${open ? 'h-[40vh]' : 'h-9'}`}
    >
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <button
          onClick={toggleTerminal}
          className={`text-xs transition-colors hover:text-accent ${open ? 'text-accent' : 'text-muted'}`}
        >
          {t('terminal')}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-auto px-3 pb-3">
        {runs.length === 0 && <p className="text-sm text-muted">{loaded ? t('noRuns') : '…'}</p>}
        {runs.map((r) => (
          <details
            key={r.id}
            ref={r.id === activeId ? activeRef : undefined}
            open={r.id === activeId}
            className={`card p-2 ${r.id === activeId ? 'border-accent' : ''}`}
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className={`inline-block size-2 shrink-0 rounded-full ${DOT[r.status]}`} />
                <span className="truncate font-mono text-sm">{r.command}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{r.createdAt.slice(5, 16).replace('T', ' ')}</span>
            </summary>
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-sm bg-bg p-2 text-xs">{r.output || '—'}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}
