'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// 今月の工数（日別・棒）。1〜月末まで全日を出す。色はトークン＝テーマ追従。
const AXIS = { fontSize: 11, fill: 'var(--color-muted)' } as const;
const TOOLTIP = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  fontSize: 12,
  color: 'var(--color-fg)',
} as const;

export function WorklogDailyChart({ data }: { data: { day: string; hours: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={data.length > 15 ? 2 : 0} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'var(--color-bg)' }} />
        <Bar dataKey="hours" name="工数" fill="var(--color-accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
