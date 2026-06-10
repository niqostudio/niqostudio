'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

const AXIS = { fontSize: 11, fill: 'var(--color-muted)' } as const;
const TOOLTIP = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  fontSize: 12,
  color: 'var(--color-fg)',
} as const;

// 指標の after を時系列で（旧環境＝基準線・target＝目標線）。色はトークン＝テーマ追従。
export function MetricsTrend({
  points,
  baseline,
  target,
}: {
  points: { at: string; value: number }[];
  baseline?: number;
  target?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis dataKey="at" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(s: string) => s.slice(5)} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={TOOLTIP} />
        {baseline != null && Number.isFinite(baseline) && (
          <ReferenceLine y={baseline} stroke="var(--color-muted)" strokeDasharray="3 3" />
        )}
        {target != null && Number.isFinite(target) && (
          <ReferenceLine y={target} stroke="var(--color-success)" strokeDasharray="3 3" />
        )}
        <Line type="monotone" dataKey="value" name="after" stroke="var(--color-accent)" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
