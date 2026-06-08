import Link from 'next/link';
import { NAV } from '@/composition/nav';
import { getCollection } from '@/composition/collections';
import { APP_NAME } from '@/composition/instance';
import { loadKpis, loadDeliveryHealth, loadPipeline, loadActivity, PIPELINE_TITLE } from '@/composition/dashboard';
import { QUICK_LINKS } from '@/composition/links';
import { DEPLOY_TARGETS, getDeploy } from '@/composition/deploy';
import { DeployButton } from '@/features/deploy/DeployButton';
import { Card, SectionLabel } from '@/shared/ui/primitives';
import { t, type MessageKey } from '@/shared/i18n';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [kpis, delivery, pipeline, activity] = await Promise.all([
    loadKpis(),
    loadDeliveryHealth(),
    loadPipeline(),
    loadActivity(),
  ]);
  const deployAvailable = getDeploy().available();
  return (
    <div className="flex flex-col gap-8 p-5 md:p-10">
      <header>
        <SectionLabel>{t('dashboard')}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          {APP_NAME} {t('opsSystem')}
        </h1>
      </header>

      <div className="flex flex-col gap-2">
        <div className="grid gap-4 sm:grid-cols-3">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className="group">
              <Card className="p-5 h-full hover:border-accent transition-colors">
                <p className="text-3xl font-semibold tabular-nums">{k.count}</p>
                <p className="mt-1 text-sm text-muted">{k.label}</p>
              </Card>
            </Link>
          ))}
        </div>
        <Link
          href={delivery.href}
          className={`text-sm hover:underline ${delivery.failed > 0 ? 'text-accent' : 'text-muted'}`}
        >
          {t('deliveryFailed')}：{delivery.failed}
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>{t('deploy')}</SectionLabel>
        {deployAvailable ? (
          <div className="flex flex-wrap gap-2">
            {DEPLOY_TARGETS.map((d) => (
              <DeployButton key={d.id} id={d.id} label={d.label} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            GitHub 連携が未設定（GITHUB_TOKEN か GitHub App）。設定すると公開サイトのデプロイをここから要求できます。
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>{PIPELINE_TITLE}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {pipeline.map((s) => (
            <Link key={s.status} href={s.href} className="group">
              <Card className="px-4 py-3 hover:border-accent transition-colors">
                <span className="text-xs text-muted">{s.label}</span>
                <span className="ml-2 text-lg font-semibold tabular-nums">{s.count}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>{t('recentActivity')}</SectionLabel>
        {activity.length > 0 ? (
          <div className="flex flex-col">
            {activity.map((a, i) => (
              <Link
                key={`${a.recordId}-${a.at}-${i}`}
                href={`/${a.collection}?sel=${a.recordId}`}
                className="flex items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-bg transition-colors"
              >
                <span>
                  {getCollection(a.collection)?.meta.label ?? a.collection} を {t(`origin.${a.origin}` as MessageKey)}
                </span>
                <span className="text-xs text-muted tabular-nums">{a.at.slice(0, 10)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t('noActivity')}</p>
        )}
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

      <div className="flex flex-col gap-3">
        <SectionLabel>{t('consoles')}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="chip chip-mono inline-flex items-center px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
