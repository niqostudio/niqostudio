// ダッシュボードのチャートが受け取るデータ契約（presentation 専用・直列化可能）。
// 値は composition（loadTrend/loadFunnel 等）が供給し、Charts は描くだけ。
export interface TrendPoint {
  month: string;
  inquiries: number;
  projects: number;
}

export interface FunnelStep {
  label: string;
  count: number;
}

export interface PipelineDatum {
  label: string;
  count: number;
  href: string;
}
