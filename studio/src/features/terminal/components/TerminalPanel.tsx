'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp } from 'lucide-react';
import { subscribeTerminal, isTerminalOpen, toggleTerminal, getActiveRunId } from '@/features/terminal/panel';
import { listRuns, listActivity } from '@/features/terminal/actions';
import type { ActivityRow } from '@/features/terminal/types';
import type { CommandRun, RunStatus } from '@/adapters/studio-store/supabase/run-store';
import { t, type MessageKey } from '@/shared/i18n';

// 開いている間だけ実行履歴/活動をポーリングする間隔。実行＝daemon なので更新ボタンは持たず自動反映する。
const POLL_MS = 2500;

const DOT: Record<RunStatus, string> = { running: 'bg-muted', ok: 'bg-success', error: 'bg-error' };

// メイン列の底に常駐する bottom panel（容器）。中に ターミナル（実行履歴｜出力）と 履歴（collection 横断の版イベント）を並置。
// 横長なので開くと常時 split（タブにしない）。上のバーで開閉する。
export function TerminalPanel() {
  const open = useSyncExternalStore(subscribeTerminal, isTerminalOpen, () => false);
  const activeId = useSyncExternalStore(subscribeTerminal, getActiveRunId, () => null);
  const router = useRouter();
  const [runs, setRuns] = useState<CommandRun[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // 開いている間だけ自動でポーリング（実行＋活動・閉じれば停止）。in-flight 完了後の setState は active で握り潰す。
  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      const [r, a] = await Promise.all([listRuns(), listActivity()]);
      if (active) {
        setRuns(r);
        setActivity(a);
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

  // 通知トーストから実行が来たらその行を選択。
  useEffect(() => {
    if (activeId) setSelectedId(activeId);
  }, [activeId]);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, runs]);

  const selected = selectedId ?? runs[0]?.id ?? null;
  const selectedRun = runs.find((r) => r.id === selected);

  return (
    <div
      className={`flex shrink-0 flex-col overflow-hidden border-t border-border-subtle bg-surface transition-[height] duration-200 ease-out ${open ? 'h-[40vh]' : 'h-9'}`}
    >
      {/* 開閉バー（bottom panel 自体。ターミナル/履歴 はこの中の領域） */}
      <button
        onClick={toggleTerminal}
        className="flex h-9 w-full shrink-0 items-center gap-3 px-3 text-xs text-muted transition-colors hover:text-accent"
      >
        <ChevronUp className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {!open && (
          <span className="flex items-center gap-3">
            <span>
              {t('terminal')} <span className="tabular-nums">{runs.length}</span>
            </span>
            <span>
              {t('history')} <span className="tabular-nums">{activity.length}</span>
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="flex min-h-0 flex-1">
          {/* ターミナル：実行履歴 ｜ 出力 */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border">
            <ColTitle label={t('terminal')} count={runs.length} />
            <div className="flex min-h-0 flex-1">
              <div className="w-52 shrink-0 overflow-auto border-r border-border-subtle">
                {runs.length === 0 && <p className="px-3 py-2 text-xs text-muted">{loaded ? t('noRuns') : '…'}</p>}
                {runs.map((r) => (
                  <button
                    key={r.id}
                    ref={r.id === selected ? selectedRef : undefined}
                    onClick={() => setSelectedId(r.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${r.id === selected ? 'bg-bg' : 'hover:bg-bg'}`}
                  >
                    <span className={`inline-block size-1.5 shrink-0 rounded-full ${DOT[r.status]}`} />
                    <span className="truncate font-mono text-xs">{r.command}</span>
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {selectedRun ? (
                  <>
                    <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-1 text-xs">
                      <span className={`inline-block size-1.5 shrink-0 rounded-full ${DOT[selectedRun.status]}`} />
                      <span className="truncate font-mono">{selectedRun.command}</span>
                      <span className="ml-auto shrink-0 tabular-nums text-muted">
                        {fmtTime(selectedRun.createdAt)} · {fmtDuration(selectedRun)}
                      </span>
                    </div>
                    <pre className="flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs">{selectedRun.output || '—'}</pre>
                  </>
                ) : (
                  <p className="px-3 py-2 text-xs text-muted">{loaded ? '' : '…'}</p>
                )}
              </div>
            </div>
          </div>

          {/* 履歴：collection 横断の版イベント */}
          <div className="flex w-72 shrink-0 flex-col overflow-hidden">
            <ColTitle label={t('history')} count={activity.length} />
            <div className="flex-1 overflow-auto">
              {activity.length === 0 && <p className="px-3 py-2 text-xs text-muted">{loaded ? t('noActivity') : '…'}</p>}
              {activity.map((a, i) => (
                <button
                  key={`${a.recordId}-${a.at}-${i}`}
                  onClick={() => router.push(`/${a.collection}?sel=${a.recordId}`)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg"
                >
                  <span className="truncate">
                    {a.label} を {t(`origin.${a.origin}` as MessageKey)}
                  </span>
                  <span className="ml-auto shrink-0 tabular-nums text-[10px] text-muted">{fmtTime(a.at)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 領域（ターミナル／履歴）の見出し（ラベル＋件数）。
function ColTitle({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-border-subtle px-3 py-1">
      <span className="section-label text-[10px]">{label}</span>
      <span className="text-[10px] tabular-nums text-muted">{count}</span>
    </div>
  );
}

function fmtTime(iso: string): string {
  return iso.slice(5, 16).replace('T', ' ');
}

// 実行時間（finished_at − created_at）。実行中は「実行中」。
function fmtDuration(r: CommandRun): string {
  if (!r.finishedAt) return '実行中';
  const s = Math.max(0, Math.round((new Date(r.finishedAt).getTime() - new Date(r.createdAt).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;
}
