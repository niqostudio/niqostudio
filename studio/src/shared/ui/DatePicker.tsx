'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

// 自前のフラットなカレンダー（標準 input[type=date] のポップアップを使わない）。
// 値は 'YYYY-MM-DD'（空＝未設定）。影は使わず罫線＋トーンで出す（UI と統一）。
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parse(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function DatePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => parse(value) ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setView(parse(value) ?? new Date());
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const today = fmt(new Date());
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const shiftMonth = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));
  const pick = (d: Date) => {
    onChange(fmt(d));
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={value ? '' : 'text-faint'}>{value || 'YYYY-MM-DD'}</span>
        <Calendar className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-64 rounded-sm border border-border bg-surface p-2">
          <div className="flex items-center justify-between pb-1">
            <button
              type="button"
              className="rounded-sm p-1 text-muted transition-colors hover:bg-surface-2 hover:text-accent"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium tabular-nums">
              {view.getFullYear()}年{view.getMonth() + 1}月
            </span>
            <button
              type="button"
              className="rounded-sm p-1 text-muted transition-colors hover:bg-surface-2 hover:text-accent"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WD.map((w) => (
              <span key={w} className="py-1 text-[10px] text-faint">
                {w}
              </span>
            ))}
            {days.map((d) => {
              const ymd = fmt(d);
              const inMonth = d.getMonth() === view.getMonth();
              const isSel = ymd === value;
              const isToday = ymd === today;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => pick(d)}
                  className={cn(
                    'aspect-square rounded-sm text-sm tabular-nums transition-colors',
                    isSel
                      ? 'bg-accent text-on-accent'
                      : cn(inMonth ? 'text-fg' : 'text-faint', 'hover:bg-surface-2', isToday && 'font-semibold text-accent'),
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between">
            <button
              type="button"
              className="text-xs text-muted transition-colors hover:text-accent"
              onClick={() => pick(new Date())}
            >
              今日
            </button>
            {value && (
              <button
                type="button"
                className="text-xs text-muted transition-colors hover:text-error"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                クリア
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
