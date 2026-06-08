import Link from 'next/link';
import { getCollection } from '@/composition/collections';
import { APP_NAME } from '@/composition/instance';
import {
  loadKpis,
  loadDeliveryHealth,
  loadPipeline,
  loadActivity,
  loadFunnel,
  loadTrend,
  PIPELINE_TITLE,
} from '@/composition/dashboard';
import { QUICK_LINKS } from '@/composition/links';
import { DEPLOY_TARGETS, getDeploy } from '@/composition/deploy';
import { DeployButton } from '@/features/deploy/DeployButton';
import { TrendChart, FunnelBar, PipelineBar } from '@/features/dashboard/Charts';
import { Card, SectionLabel, Placeholder } from '@/shared/ui/primitives';
import { t, type MessageKey } from '@/shared/i18n';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [kpis, delivery, pipeline, activity, funnel, trend] = await Promise.all([
    loadKpis(),
    loadDeliveryHealth(),
    loadPipeline(),
    loadActivity(),
    loadFunnel(),
    loadTrend(),
  ]);
  const deployAvailable = getDeploy().available();

  return (
    <div className="flex flex-col gap-10 p-5 md:p-10">
      <header>
        <SectionLabel>{t('dashboard')}</SectionLabel>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {APP_NAME} {t('opsSystem')}
        </h1>
      </header>

      {/* 要対応：今あなたが動くべきもの */}
      <section className="flex flex-col gap-3">
        <SectionLabel>{t('attention')}</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className="group">
              <Card className="h-full p-5 transition-colors hover:border-accent">
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

      {/* 案件パイプライン（バーをクリックで絞り込み一覧へ） */}
      <section className="flex flex-col gap-3">
        <SectionLabel>{PIPELINE_TITLE}</SectionLabel>
        <Card className="p-4">
          <PipelineBar data={pipeline} />
        </Card>
      </section>

      {/* 最近の活動 ＋ 操作/導線 */}
      <div className="grid gap-10 lg:grid-cols-3">
        <section className="flex flex-col gap-3 lg:col-span-2">
          <SectionLabel>{t('recentActivity')}</SectionLabel>
          {activity.length > 0 ? (
            <div className="flex flex-col">
              {activity.map((a, i) => (
                <Link
                  key={`${a.recordId}-${a.at}-${i}`}
                  href={`/${a.collection}?sel=${a.recordId}`}
                  className="flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors hover:bg-bg"
                >
                  <span>
                    {getCollection(a.collection)?.meta.label ?? a.collection} を {t(`origin.${a.origin}` as MessageKey)}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{a.at.slice(0, 10)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{t('noActivity')}</p>
          )}
        </section>

        <aside className="flex flex-col gap-8">
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

          <section className="flex flex-col gap-2">
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
        </aside>
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
