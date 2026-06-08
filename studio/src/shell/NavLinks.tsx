'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SectionLabel } from '@/shared/ui/primitives';
import { t, type MessageKey } from '@/shared/i18n';

// nav の表示データ（ラベル・件数は server で解決して渡す）。active 判定だけ client（pathname）。
export interface NavGroupView {
  labelKey: MessageKey;
  items: { id: string; label: string; count?: number }[];
}

export function NavLinks({ groups }: { groups: NavGroupView[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-4 p-3 md:flex-1">
      {groups.map((g) => (
        <div key={g.labelKey} className="flex flex-col gap-0.5">
          <SectionLabel className="px-3 pb-1">{t(g.labelKey)}</SectionLabel>
          {g.items.map((it) => {
            const base = `/${it.id}`;
            const active = pathname === base || pathname.startsWith(`${base}/`);
            return (
              <Link
                key={it.id}
                href={base}
                className={`flex items-center justify-between rounded-sm px-3 py-1.5 text-sm transition-colors ${active ? 'bg-bg' : 'hover:bg-bg'}`}
              >
                <span>{it.label}</span>
                {it.count !== undefined && <span className="text-xs tabular-nums text-muted">{it.count}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
