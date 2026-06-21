'use server';

import { redirect } from 'next/navigation';
import type { Fields } from '@/features/collections/collection';
import { CoreCollectionStore } from '@/adapters/domain-store/supabase/collection-store';
import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';
import { capturePsi } from './metrics-catalog';

const today = () => new Date().toISOString().slice(0, 10);
const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

type Subject = 'projects' | 'products';

function measurementStore() {
  return new CoreCollectionStore('metric_measurements', async () => []);
}
async function logMeasurement(input: {
  subject: Subject;
  subjectId: string;
  deliverableId: string | null;
  metricKey: string;
  phase: 'before' | 'after';
  value: string;
  url: string | null;
}): Promise<void> {
  await measurementStore().upsert({
    id: crypto.randomUUID(),
    fields: {
      project_id: input.subject === 'projects' ? input.subjectId : null,
      product_id: input.subject === 'products' ? input.subjectId : null,
      deliverable_id: input.deliverableId,
      metric_key: input.metricKey,
      phase: input.phase,
      value: input.value,
      url: input.url,
    },
    draftState: 'published',
    sourceId: null,
    updatedAt: today(),
  });
}

// 測定（PSI）＋ログ記録。auto 指標の値を key→数値で返す（クライアントが列を埋める）。
export async function measureUrlAction(input: {
  subject: Subject;
  subjectId: string;
  deliverableId: string | null;
  phase: 'before' | 'after';
  url: string;
  strategy: 'mobile' | 'desktop';
}): Promise<Record<string, number | null>> {
  if (!input.url.trim()) throw new Error('URL を入力してください');
  const captured = await capturePsi(input.url.trim(), input.strategy);
  await Promise.all(
    Object.entries(captured)
      .filter(([, v]) => v != null)
      .map(([key, value]) =>
        logMeasurement({
          subject: input.subject,
          subjectId: input.subjectId,
          deliverableId: input.deliverableId,
          metricKey: key,
          phase: input.phase,
          value: String(value),
          url: input.url.trim(),
        }),
      ),
  );
  return captured;
}

export interface StageItem {
  key: string;
  label: string;
  unit: string;
  kind: 'technical' | 'business';
  deliverableId: string | null;
  before: string;
  target: string;
  after: string;
}

// 反映：3カラム（旧環境=previous / target=goal / after=achieved）を core.metrics の下書きに upsert。
// 成果物＋指標（label）で突き合わせて更新（重複しない）。achieved 必須なので after の無い行は対象外。
// business（手動）の after は推移用に metric_measurements へも記録（technical は measure 済み）。
export async function stageMetricsAction(subject: Subject, subjectId: string, items: StageItem[]): Promise<void> {
  // achieved は nullable。before / target / after のいずれかが入っていれば反映する（事前設計＝before＋goal も保存）。
  const valid = items.filter((m) => m.after.trim() !== '' || m.before.trim() !== '' || m.target.trim() !== '');
  if (valid.length === 0) return;
  const { getCollection } = await import('./collections');
  const binding = getCollection(subject);
  if (!binding) return;
  const working = (await binding.drafts.get(subjectId).catch(() => null)) ?? (await binding.store.get(subjectId));
  if (!working) throw new Error('対象が見つかりません');
  const fields = { ...(working.fields as Fields) };
  const rows = Array.isArray(fields.metrics) ? [...(fields.metrics as Record<string, unknown>[])] : [];

  for (const m of valid) {
    const idx = rows.findIndex(
      (r) => asStr(r.label) === m.label && asStr(r.deliverable_id) === (m.deliverableId ?? ''),
    );
    const row = {
      id: idx >= 0 ? rows[idx].id : crypto.randomUUID(),
      label: m.label,
      achieved: m.after.trim() || null,
      previous: m.before.trim() || null,
      goal: m.target.trim() || null,
      unit: m.unit,
      kind: m.kind,
      deliverable_id: m.deliverableId,
    };
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
  }
  fields.metrics = rows;
  // 被写体の反映モデルに従う（direct＝即 core / staged＝下書き）。
  if (binding.meta.mode === 'direct') {
    await binding.store.upsert({ id: subjectId, fields, draftState: 'published', sourceId: working.sourceId, updatedAt: today() });
  } else {
    await binding.drafts.save({ id: subjectId, fields, draftState: 'draft', sourceId: working.sourceId, updatedAt: today() });
  }
  await binding.versions?.append(subjectId, fields, 'manual');

  await Promise.all(
    valid
      .filter((m) => m.kind === 'business' && m.after.trim() !== '')
      .map((m) =>
        logMeasurement({ subject, subjectId, deliverableId: m.deliverableId, metricKey: m.key, phase: 'after', value: m.after.trim(), url: null }),
      ),
  );
}

export interface DeliverableData {
  metrics: { label: string; previous: string; goal: string; achieved: string }[];
  measurements: { metricKey: string; phase: string; value: string; at: string }[];
}

// 成果物の既存メトリクス（列プリフィル）＋計測ログ（推移・before 履歴）を取得。
// 成果物紐付け（technical）＋被写体直下（deliverable なし＝business）の両方を対象に。
export async function loadDeliverableData(subject: Subject, subjectId: string, deliverableId: string): Promise<DeliverableData> {
  const m = new CoreMetricsProvider();
  const subjCol = subject === 'projects' ? 'project_id' : 'product_id';
  const [allMetrics, allMeas] = await Promise.all([
    m.rows('metrics', ['label', 'previous', 'goal', 'achieved', 'deliverable_id', 'project_id', 'product_id']).catch(() => []),
    m
      .rows('metric_measurements', ['metric_key', 'phase', 'value', 'measured_at', 'deliverable_id', 'project_id', 'product_id'])
      .catch(() => []),
  ]);
  // deliverableId 指定時＝その成果物＋被写体直下（business）。未指定（案件全体）＝被写体直下のみ。
  const match = (r: Record<string, unknown>) =>
    (deliverableId !== '' && asStr(r.deliverable_id) === deliverableId) ||
    (asStr(r.deliverable_id) === '' && asStr(r[subjCol]) === subjectId);
  return {
    metrics: allMetrics
      .filter(match)
      .map((r) => ({ label: asStr(r.label), previous: asStr(r.previous), goal: asStr(r.goal), achieved: asStr(r.achieved) })),
    measurements: allMeas
      .filter(match)
      .map((r) => ({ metricKey: asStr(r.metric_key), phase: asStr(r.phase), value: asStr(r.value), at: asStr(r.measured_at) }))
      .sort((a, b) => a.at.localeCompare(b.at)),
  };
}

// 案件/プロダクト詳細から計測画面へ（その被写体の成果物を初期選択）。
export async function openMetricsForProject(id: string): Promise<void> {
  redirect(`/metrics?project=${id}`);
}
export async function openMetricsForProduct(id: string): Promise<void> {
  redirect(`/metrics?product=${id}`);
}
