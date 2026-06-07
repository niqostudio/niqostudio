import Link from 'next/link';
import { NAV } from '@/composition/nav';
import { APP_NAME } from '@/composition/instance';
import { Card, SectionLabel } from '@/shared/ui/primitives';
import { t, type MessageKey } from '@/shared/i18n';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 p-5 md:p-10">
      <header>
        <SectionLabel>{t('dashboard')}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">{APP_NAME} {t('opsSystem')}</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NAV.map((m) => (
          <Link key={m.id} href={m.href} className="group">
            <Card className="p-5 h-full hover:border-accent transition-colors">
              <p className="font-medium">{t(`nav.${m.id}` as MessageKey)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
