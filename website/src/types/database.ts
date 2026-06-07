// core（Supabase）の生成型（@niqostudio/db-types）を唯一の正にし、画面で使う別名・サブ型をここに集約する。
// 生成は root `pnpm db:types`（infra の local スキーマから・スキーマ変更時）。
import type { Database } from '@niqostudio/db-types';

export type { Database };

// core は専用スキーマ。db-types の Tables ヘルパは public 既定で空のため core を直接 index する。
// Service/Profile は table 型を使う（view は全列 nullable になり projection が壊れるため。実体は非 null・
// anon は public_* view 経由で同じ列を読む＝fetch 側でキャスト）。Case は元から view 投影。
type CoreTables = Database['core']['Tables'];
type CoreViews = Database['core']['Views'];

export type Service = CoreTables['services']['Row'];
export type Profile = CoreTables['profile']['Row'];
// 公開 view `public_showcases`（内部 showcase_entries の投影）を website では Case として扱う（projection 境界での翻訳）。
// client は同意解決済み、deliverables / metrics は選択分の集約（Json）。
export type Case = CoreViews['public_showcases']['Row'];

// jsonb 列の意味づけ（生成型は Json 止まり）
export type SocialLink = { label: string; url: string };
