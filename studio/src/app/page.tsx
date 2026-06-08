import Link from 'next/link';
import { NAV } from '@/composition/nav';
import { getCollection } from '@/composition/collections';
import { APP_NAME } from '@/composition/instance';
import { loadKpis } from '@/composition/dashboard';
import { Card, SectionLabel } from '@/shared/ui/primitives';
import { t } from '@/shared/i18n';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const kpis = await loadKpis();
  return (
    <div className="flex flex-col gap-8 p-5 md:p-10">
      <header>
        <SectionLabel>{t('dashboard')}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          {APP_NAME} {t('opsSystem')}
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group">
            <Card className="p-5 h-full hover:border-accent transition-colors">
              <p className="text-3xl font-semibold tabular-nums">{k.count}</p>
              <p className="mt-1 text-sm text-muted">{k.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>{t('collections')}</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.map((m) => (
            <Link key={m.id} href={m.href} className="group">
              <Card className="p-5 h-full hover:border-accent transition-colors">
                <p className="font-medium">{getCollection(m.id)?.meta.label ?? m.id}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
