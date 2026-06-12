import type { ReactNode } from 'react';
import Link from 'next/link';
import { NAV_GROUPS, loadNavCounts } from '@/composition/nav';
import { getCollection } from '@/composition/collections';
import { APP_NAME } from '@/composition/instance';
import { TerminalPanel } from '@/features/terminal';
import { getOperator } from '@/adapters/session/supabase/session';
import { UnsavedProvider } from '@/shared/unsaved';
import { NavLinks } from './NavLinks';
import { SignOutButton } from './SignOutButton';
import { EnvBanner } from './EnvBanner';

// shell：左のグローバルサイドバー（nav）＋ メイン列（コンテンツ＋下から伸びる terminal パネル）。
// terminal はサイドバーに被らず、メイン列の中で in-flow に開閉し、上のコンテンツがその分縮む。
// 未認証（ログイン画面等）は shell の枠を出さず children だけ描く（認証ゲートは middleware）。
export async function AppShell({ children }: { children: ReactNode }) {
  const operator = await getOperator();
  if (!operator)
    return (
      <>
        <EnvBanner />
        {children}
      </>
    );
  const counts = await loadNavCounts();
  // ラベル/件数は server で解決して client の NavLinks へ渡す（active 判定だけ client）。
  const navGroups = NAV_GROUPS.map((g) => ({
    labelKey: g.labelKey,
    items: g.ids.map((id) => {
      const Icon = getCollection(id)?.meta.icon;
      return {
        id,
        label: getCollection(id)?.meta.label ?? id,
        count: counts[id],
        icon: Icon ? <Icon className="size-4 shrink-0" /> : null,
      };
    }),
  }));

  return (
    <UnsavedProvider>
      <div className="flex flex-col md:h-dvh print:block">
      <EnvBanner />
      <div className="md:grid md:min-h-0 md:flex-1 md:grid-cols-[15rem_1fr] md:overflow-hidden print:block">
      <aside className="bg-surface border-b border-border md:flex md:h-full md:flex-col md:overflow-y-auto md:border-b-0 md:border-r print:hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <Link href="/" className="font-semibold tracking-tight">
            {APP_NAME}
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">studio</p>
        </div>
        <NavLinks groups={navGroups} />
        <div className="flex flex-col gap-2 px-3 py-3 border-t border-border-subtle">
          <p className="text-xs text-muted truncate" title={operator.email ?? ''}>
            {operator.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-col md:h-full md:overflow-hidden print:h-auto print:overflow-visible">
        <main className="flex-1 md:min-h-0 md:overflow-auto print:overflow-visible">{children}</main>
        <div className="print:hidden">
          <TerminalPanel />
        </div>
      </div>
      </div>
      </div>
    </UnsavedProvider>
  );
}
