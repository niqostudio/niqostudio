import type { ReactNode } from 'react';
import Link from 'next/link';
import { NAV_GROUPS, loadNavCounts } from '@/composition/nav';
import { getCollection } from '@/composition/collections';
import { APP_NAME } from '@/composition/instance';
import { SectionLabel } from '@/shared/ui/primitives';
import { t } from '@/shared/i18n';
import { TerminalPanel } from '@/features/terminal';
import { getOperator } from '@/adapters/session/supabase/session';
import { UnsavedProvider } from '@/shared/unsaved';
import { SignOutButton } from './SignOutButton';

// shell：左のグローバルサイドバー（nav）＋ メイン列（コンテンツ＋下から伸びる terminal パネル）。
// terminal はサイドバーに被らず、メイン列の中で in-flow に開閉し、上のコンテンツがその分縮む。
// 未認証（ログイン画面等）は shell の枠を出さず children だけ描く（認証ゲートは middleware）。
export async function AppShell({ children }: { children: ReactNode }) {
  const operator = await getOperator();
  if (!operator) return <>{children}</>;
  const counts = await loadNavCounts();

  return (
    <UnsavedProvider>
      <div className="md:grid md:h-dvh md:grid-cols-[15rem_1fr] md:overflow-hidden print:block">
      <aside className="bg-surface border-b border-border md:flex md:h-dvh md:flex-col md:overflow-y-auto md:border-b-0 md:border-r print:hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <Link href="/" className="font-semibold tracking-tight">
            {APP_NAME}
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">studio</p>
        </div>
        <nav className="flex flex-col gap-4 p-3 md:flex-1">
          {NAV_GROUPS.map((g) => (
            <div key={g.labelKey} className="flex flex-col gap-0.5">
              <SectionLabel className="px-3 pb-1">{t(g.labelKey)}</SectionLabel>
              {g.ids.map((id) => (
                <Link
                  key={id}
                  href={`/${id}`}
                  className="flex items-center justify-between rounded-sm px-3 py-1.5 text-sm transition-colors hover:bg-bg"
                >
                  <span>{getCollection(id)?.meta.label ?? id}</span>
                  {counts[id] !== undefined && (
                    <span className="text-xs tabular-nums text-muted">{counts[id]}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-border-subtle">
          <p className="text-xs text-muted truncate" title={operator.email ?? ''}>
            {operator.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-col md:h-dvh md:overflow-hidden print:h-auto print:overflow-visible">
        <main className="flex-1 md:min-h-0 md:overflow-auto print:overflow-visible">{children}</main>
        <div className="print:hidden">
          <TerminalPanel />
        </div>
      </div>
      </div>
    </UnsavedProvider>
  );
}
