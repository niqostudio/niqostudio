'use client';

import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TrendPoint, FunnelStep, PipelineDatum } from './types';

// 色はトークン（CSS 変数）で SVG に渡す＝ハードコードしない。
const AXIS = { fontSize: 11, fill: 'var(--color-muted)' } as const;
const TOOLTIP = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 0,
  fontSize: 12,
  color: 'var(--color-fg)',
} as const;

// 月次推移：問い合わせ・案件の作成件数（薄くても推移を出す）。
export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="trend-inq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trend-prj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(m: string) => m.slice(5)} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
        <Tooltip contentStyle={TOOLTIP} labelStyle={{ color: 'var(--color-muted)' }} />
        <Area type="monotone" dataKey="inquiries" name="問い合わせ" stroke="var(--color-accent)" strokeWidth={2} fill="url(#trend-inq)" />
        <Area type="monotone" dataKey="projects" name="案件" stroke="var(--color-warning)" strokeWidth={2} fill="url(#trend-prj)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 受注ファネル：問い合わせ→顧客→案件（横バー）。少数でも転換の形が出る。
export function FunnelBar({ data }: { data: FunnelStep[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={72} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'var(--color-bg)' }} />
        <Bar dataKey="count" fill="var(--color-accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 案件パイプライン：status 別の受注額（¥）。バーをクリックで絞り込み一覧へドリルダウン。
export function PipelineBar({ data }: { data: PipelineDatum[] }) {
  const router = useRouter();
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={yen} />
        <Tooltip content={<PipelineTooltip />} cursor={{ fill: 'var(--color-bg)' }} />
        <Bar
          dataKey="value"
          fill="var(--color-accent)"
          cursor="pointer"
          onClick={(_: unknown, index: number) => {
            const href = data[index]?.href;
            if (href) router.push(href);
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ¥ 軸ラベル（万円表記）。
function yen(v: number): string {
  return v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`;
}

// パイプラインのツールチップ：受注額＋件数。
function PipelineTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PipelineDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 12 }} className="px-2 py-1">
      <div>{d.label}</div>
      <div className="text-muted">
        ¥{d.value.toLocaleString()} ・ {d.count}件
      </div>
    </div>
  );
}
