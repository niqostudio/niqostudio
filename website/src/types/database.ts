// core（Supabase）の生成型（@niqostudio/db-types）を唯一の正にし、画面で使う別名・サブ型をここに集約する。
// 生成型は db-types で `pnpm --filter @niqostudio/db-types gen`（スキーマ変更時に更新）。
import type { Database, Tables } from '@niqostudio/db-types';

export type { Database };

export type Client = Tables<'clients'>;
export type Work = Tables<'works'>;
export type Case = Tables<'cases'>;
export type Service = Tables<'services'>;
export type Profile = Tables<'profile'>;

// jsonb 列の意味づけ（生成型は Json 止まり）
export type CaseMetric = { label: string; before: string; after: string };
export type SocialLink = { label: string; url: string };

// anon が読む clients の公開サブセット。real_name / internal_notes は列権限で取得不可。
export type PublicClient = Pick<Client, 'public_name' | 'industry'>;
