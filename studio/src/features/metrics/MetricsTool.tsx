'use client';

import { useEffect, useState } from 'react';
import { measureUrlAction, stageMetricsAction, loadDeliverableData, type StageItem } from '@/composition/metrics-actions';
import { MetricsTrend } from './MetricsTrend';
import { Card, SectionLabel } from '@/shared/ui/primitives';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

type Deliverable = { value: string; label: string; url: string };
type Subject = { type: 'projects' | 'products'; id: string; label: string };
type Def = { key: string; label: string; unit: string; kind: 'technical' | 'business'; auto: boolean; howto: string };
type Meas = { metricKey: string; phase: string; value: string; at: string };

// 被写体（案件/プロダクト）起点のメトリクス計測。成果物は任意＝既定は「案件全体（成果物なし）」。
// before は旧環境 URL、after は納品物 URL。各「測定」で PSI。値は被写体（＋任意で成果物）に紐づく。
export function MetricsTool({
  subject,
  deliverables,
  definitions,
}: {
  subject: Subject | null;
  deliverables: Deliverable[];
  definitions: Def[];
}) {
  // 既定は成果物なし（案件全体）。別プロダクトの成果物へ流用しない。
  const [deliverableId, setDeliverableId] = useState('');
  const selectedDeliverable = deliverables.find((d) => d.value === deliverableId);
  const [oldUrl, setOldUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [before, setBefore] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<Record<string, string>>({});
  const [after, setAfter] = useState<Record<string, string>>({});
  const [measurements, setMeasurements] = useState<Meas[]>([]);
  const [trendKey, setTrendKey] = useState(definitions[0]?.key ?? '');
  const [busyBefore, setBusyBefore] = useState(false);
  const [busyAfter, setBusyAfter] = useState(false);
  const [saving, setSaving] = useState(false);

  // 成果物（または案件全体）選択時：既存メトリクス＋計測ログを読み、列をプリフィル。
  useEffect(() => {
    if (!subject) return;
    setNewUrl(selectedDeliverable?.url ?? '');
    let cancelled = false;
    loadDeliverableData(subject.type, subject.id, deliverableId)
      .then((data) => {
        if (cancelled) return;
        const latest = (key: string, phase: string) => {
          const f = data.measurements.filter((m) => m.metricKey === key && m.phase === phase);
          return f.length ? f[f.length - 1].value : '';
        };
        const byLabel = new Map(data.metrics.map((m) => [m.label, m]));
        const b: Record<string, string> = {};
        const g: Record<string, string> = {};
        const a: Record<string, string> = {};
        for (const def of definitions) {
          const metric = byLabel.get(def.label);
          b[def.key] = metric?.previous || latest(def.key, 'before') || '';
          g[def.key] = metric?.goal || '';
          a[def.key] = metric?.achieved || latest(def.key, 'after') || '';
        }
        setBefore(b);
        setTarget(g);
        setAfter(a);
        setMeasurements(data.measurements);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId, subject?.id]);

  const reloadMeasurements = async () => {
    if (!subject) return;
    const data = await loadDeliverableData(subject.type, subject.id, deliverableId);
    setMeasurements(data.measurements);
  };

  const measure = async (phase: 'before' | 'after') => {
    if (!subject) return;
    const url = phase === 'before' ? oldUrl : newUrl;
    if (!url.trim()) {
      toast.error('URL を入力してください');
      return;
    }
    const setBusy = phase === 'before' ? setBusyBefore : setBusyAfter;
    setBusy(true);
    try {
      const r = await measureUrlAction({
        subject: subject.type,
        subjectId: subject.id,
        deliverableId: deliverableId || null,
        phase,
        url,
        strategy,
      });
      const fill = phase === 'before' ? setBefore : setAfter;
      fill((prev) => {
        const next = { ...prev };
        for (const d of definitions) if (d.auto && r[d.key] != null) next[d.key] = String(r[d.key]);
        return next;
      });
      await reloadMeasurements();
      toast.success('測定しました');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!subject) {
      toast.error('被写体がありません');
      return;
    }
    const items: StageItem[] = definitions.map((d) => ({
      key: d.key,
      label: d.label,
      unit: d.unit,
      kind: d.kind,
      // technical は選択した成果物（なければ案件レベル＝null）、business は常に案件レベル。
      deliverableId: d.kind === 'technical' ? deliverableId || null : null,
      before: before[d.key] ?? '',
      target: target[d.key] ?? '',
      after: after[d.key] ?? '',
    }));
    if (!items.some((i) => i.before.trim() || i.target.trim() || i.after.trim())) {
      toast.error('入力された値がありません');
      return;
    }
    setSaving(true);
    try {
      await stageMetricsAction(subject.type, subject.id, items);
      await reloadMeasurements();
      toast.success('保存しました');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const cell = (map: Record<string, string>, set: (u: (p: Record<string, string>) => Record<string, string>) => void, key: string) => (
    <input
      className="field w-24 text-right tabular-nums"
      value={map[key] ?? ''}
      onChange={(e) => set((p) => ({ ...p, [key]: e.target.value }))}
      placeholder="—"
    />
  );

  // before の計測ログから 最新/平均/回数（goal 調整の材料）。
  const beforeStats = (key: string) => {
    const vals = measurements
      .filter((m) => m.metricKey === key && m.phase === 'before')
      .map((m) => Number(m.value))
      .filter((n) => Number.isFinite(n));
    if (vals.length === 0) return null;
    const avg = Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100;
    return { latest: vals[vals.length - 1], avg, n: vals.length };
  };

  const afterPoints = measurements
    .filter((m) => m.metricKey === trendKey && m.phase === 'after')
    .map((m) => ({ at: m.at.slice(0, 10), value: Number(m.value) }))
    .filter((p) => Number.isFinite(p.value));
  const beforeMeas = measurements.filter((m) => m.metricKey === trendKey && m.phase === 'before');
  const baseline = beforeMeas.length
    ? Number(beforeMeas[beforeMeas.length - 1].value)
    : before[trendKey]
      ? Number(before[trendKey])
      : undefined;
  const targetVal = target[trendKey] ? Number(target[trendKey]) : undefined;

  if (!subject) {
    return <Card className="p-6 text-sm text-muted">案件またはプロダクトの詳細から「メトリクスを計測」で開いてください。</Card>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 対象＋成果物（任意）＋2つの URL */}
      <div className="card flex flex-col gap-3 p-4">
        <p className="text-sm">
          対象：<span className="font-medium">{subject.label}</span>
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">成果物（任意・既定は案件全体）</span>
          <select className="field" value={deliverableId} onChange={(e) => setDeliverableId(e.target.value)}>
            <option value="">（案件全体・成果物なし）</option>
            {deliverables.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted">旧環境 URL（事前設計の計測）</span>
            <input className="field" value={oldUrl} onChange={(e) => setOldUrl(e.target.value)} placeholder="https://（旧サイト）" />
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => measure('before')} disabled={busyBefore}>
            {busyBefore ? '測定中…' : '旧環境を測定'}
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted">納品物 URL</span>
            <input className="field" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://（納品物）" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">端末</span>
            <select className="field" value={strategy} onChange={(e) => setStrategy(e.target.value as 'mobile' | 'desktop')}>
              <option value="mobile">モバイル</option>
              <option value="desktop">デスクトップ</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={() => measure('after')} disabled={busyAfter}>
            {busyAfter ? '測定中…' : '納品物を測定'}
          </button>
        </div>
        <p className="text-xs text-muted">PageSpeed Insights（Lighthouse）。429 のとき PSI_API_KEY を設定。旧環境は公開前に（after が無くても計測・記録されます）。</p>
      </div>

      {/* 3カラム：旧環境 / 目標 / after */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">指標</th>
              <th className="px-3 py-2 text-right font-medium">旧環境</th>
              <th className="px-3 py-2 text-right font-medium">目標</th>
              <th className="px-3 py-2 text-right font-medium">after</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {definitions.map((d) => {
              const s = beforeStats(d.key);
              return (
                <tr key={d.key} className="border-b border-border-subtle align-top last:border-0">
                  <td className="px-3 py-2">
                    <span className="text-sm">{d.label}</span>
                    {d.auto && <span className="ml-1 text-[10px] text-muted">auto</span>}
                    {d.howto && <p className="mt-0.5 text-xs text-muted">{d.howto}</p>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {cell(before, setBefore, d.key)}
                    {s && <p className="mt-0.5 text-[10px] text-muted">最新 {s.latest}・平均 {s.avg}（{s.n}回）</p>}
                  </td>
                  <td className="px-3 py-2 text-right">{cell(target, setTarget, d.key)}</td>
                  <td className="px-3 py-2 text-right">{cell(after, setAfter, d.key)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{d.unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="flex justify-end">
        <button type="button" className="btn btn-primary" onClick={apply} disabled={saving}>
          メトリクスを保存
        </button>
      </div>

      {/* 推移（after の時系列・旧環境/目標を参照線） */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>推移（after）</SectionLabel>
          <select className="field" value={trendKey} onChange={(e) => setTrendKey(e.target.value)}>
            {definitions.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <Card className="p-4">
          {afterPoints.length > 0 ? (
            <MetricsTrend points={afterPoints} baseline={baseline} target={targetVal} />
          ) : (
            <p className="text-sm text-muted">この指標の after 計測履歴はまだありません。</p>
          )}
        </Card>
      </section>
    </div>
  );
}
