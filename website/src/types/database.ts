// core（Supabase）の生成型（@niqostudio/db-types）を唯一の正にし、画面で使う別名・サブ型をここに集約する。
// 生成は core 側 `pnpm --filter @niqostudio/core run db:types`（スキーマ変更時）。
import type { Database, Tables } from '@niqostudio/db-types';

export type { Database };

export type Service = Tables<'services'>;
export type Profile = Tables<'profile'>;
// 公開 view `showcases`（内部 showcase_entries の投影）を website では Case として扱う（projection 境界での翻訳）。
// client は同意解決済み、deliverables / metrics は選択分の集約（Json）。
export type Case = Tables<'showcases'>;

// jsonb 列の意味づけ（生成型は Json 止まり）
export type SocialLink = { label: string; url: string };
