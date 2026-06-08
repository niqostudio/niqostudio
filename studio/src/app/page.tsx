import Link from 'next/link';
import { APP_NAME } from '@/composition/instance';
import {
  loadKpis,
  loadDeliveryHealth,
  loadPipeline,
  loadFunnel,
  loadTrend,
  loadPipelineHealth,
  PIPELINE_TITLE,
  IN_PROGRESS_STATUSES,
} from '@/composition/dashboard';
import { QUICK_LINKS } from '@/composition/links';
import { DEPLOY_TARGETS, getDeploy } from '@/composition/deploy';
import { DeployButton } from '@/features/deploy/DeployButton';
import { TrendChart, FunnelBar, PipelineBar } from '@/features/dashboard/Charts';
import { Card, SectionLabel, Placeholder } from '@/shared/ui/primitives';
import { t } from '@/shared/i18n';

export const dynamic = 'force-dynamic';

// 要対応カードの数値色（0 のときは無色＝騒がしくしない）。
function toneClass(tone?: string): string {
  return tone === 'error' ? 'text-error' : tone === 'warning' ? 'text-warning' : tone === 'info' ? 'text-info' : '';
}

export default async function DashboardPage() {
  const [kpis, delivery, pipeline, funnel, trend, health] = await Promise.all([
    loadKpis(),
    loadDeliveryHealth(),
    loadPipeline(),
    loadFunnel(),
    loadTrend(),
    loadPipelineHealth(),
  ]);
  const deployAvailable = getDeploy().available();
  const inProgress = new Set(IN_PROGRESS_STATUSES);
  const forecast = pipeline.filter((s) => inProgress.has(s.status)).reduce((a, s) => a + s.value, 0);
  // 要対応＝動くべき件数を1グリッドに集約（散らばった行をやめる）。
  const attention = [
    ...kpis,
    { label: t('dueRisk'), count: health.dueSoon, href: health.href, tone: 'warning' as const },
    { label: t('stuck'), count: health.stuck, href: health.href, tone: 'warning' as const },
    { label: t('deliveryFailed'), count: delivery.failed, href: delivery.href, tone: 'error' as const },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 p-5 md:p-10">
      <header>
        <SectionLabel>{t('dashboard')}</SectionLabel>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {APP_NAME} {t('opsSystem')}
        </h1>
      </header>

      {/* 要対応：今あなたが動くべき件数を1グリッドに */}
      <section className="flex flex-col gap-3">
        <SectionLabel>{t('attention')}</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attention.map((k) => (
            <Link key={k.label} href={k.href} className="group">
              <Card className="h-full p-4 transition-colors hover:border-accent">
                <p className={`text-2xl font-semibold tabular-nums ${k.count > 0 ? toneClass(k.tone) : ''}`}>{k.count}</p>
                <p className="mt-1 text-sm text-muted">{k.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 可視化：受注ファネル ＋ 月次推移 */}
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionLabel>{t('salesFunnel')}</SectionLabel>
          <Card className="p-4">
            <FunnelBar data={funnel} />
          </Card>
        </section>
        <section className="flex flex-col gap-3">
          <SectionLabel>{t('monthlyTrend')}</SectionLabel>
          <Card className="p-4">
            <TrendChart data={trend} />
          </Card>
        </section>
      </div>

      {/* 案件パイプライン（受注額・バーをクリックで絞り込み一覧へ） */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel>{PIPELINE_TITLE}</SectionLabel>
          <span className="text-sm text-muted">
            {t('salesForecast')} <span className="font-semibold tabular-nums text-success">¥{forecast.toLocaleString()}</span>
          </span>
        </div>
        <Card className="p-4">
          <PipelineBar data={pipeline} />
        </Card>
      </section>

      {/* 公開操作 ＋ 外部コンソール */}
      <div className="grid gap-10 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionLabel>{t('deploy')}</SectionLabel>
          {deployAvailable ? (
            <div className="flex flex-wrap gap-2">
              {DEPLOY_TARGETS.map((d) => (
                <DeployButton key={d.id} id={d.id} label={d.label} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              GitHub 連携が未設定。設定すると公開サイトのデプロイをここから要求できます。
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
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
        </section>
      </div>

      {/* 運用・財務：あるべき場所だけ先に置く（接続/テーブル整備後に実データ） */}
      <div className="grid gap-10 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionLabel>{t('ops')}</SectionLabel>
          <Placeholder>Supabase / Cloudflare / メール送達の状態・quota</Placeholder>
        </section>
        <section className="flex flex-col gap-3">
          <SectionLabel>{t('finance')}</SectionLabel>
          <Placeholder>売上 / 入金 / ランウェイ</Placeholder>
        </section>
      </div>
    </div>
  );
}
