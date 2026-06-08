import type { ReactNode } from 'react';
import Link from 'next/link';
import { NAV } from '@/composition/nav';
import { getCollection } from '@/composition/collections';
import { APP_NAME } from '@/composition/instance';
import { TerminalPanel } from '@/features/terminal';
import { getOperator } from '@/adapters/session/supabase/session';
import { SignOutButton } from './SignOutButton';

// shell：左のグローバルサイドバー（nav）＋ メイン列（コンテンツ＋下から伸びる terminal パネル）。
// terminal はサイドバーに被らず、メイン列の中で in-flow に開閉し、上のコンテンツがその分縮む。
// 未認証（ログイン画面等）は shell の枠を出さず children だけ描く（認証ゲートは middleware）。
export async function AppShell({ children }: { children: ReactNode }) {
  const operator = await getOperator();
  if (!operator) return <>{children}</>;

  return (
    <div className="md:grid md:h-dvh md:grid-cols-[15rem_1fr] md:overflow-hidden">
      <aside className="bg-surface border-b border-border md:flex md:h-dvh md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="px-5 py-4 border-b border-border-subtle">
          <Link href="/" className="font-semibold tracking-tight">
            {APP_NAME}
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5">studio</p>
        </div>
        <nav className="p-3 flex md:flex-col gap-1 md:flex-1">
          {NAV.map((m) => (
            <Link key={m.id} href={m.href} className="rounded-sm px-3 py-2 text-sm hover:bg-bg transition-colors">
              {getCollection(m.id)?.meta.label ?? m.id}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-border-subtle">
          <p className="text-xs text-muted truncate" title={operator.email ?? ''}>
            {operator.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-col md:h-dvh md:overflow-hidden">
        <main className="flex-1 md:min-h-0 md:overflow-auto">{children}</main>
        <TerminalPanel />
      </div>
    </div>
  );
}
