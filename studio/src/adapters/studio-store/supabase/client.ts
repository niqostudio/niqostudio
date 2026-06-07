import 'server-only';
import { createClient } from '@supabase/supabase-js';

// studio 自前 store のスキーマ型。core（@niqostudio/db-types）とは独立に持つ＝接続を別 Supabase へ
// 差し替えられるようにするため。スキーマ定義は studio/migrations。
// supabase-js の型は public スキーマ前提が強く studio スキーマと噛み合わないため、ここでは
// クライアントを素のまま使い、行の形は RecordRow で adapter 境界に型を与える。
type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface RecordRow {
  id: string;
  tenant_id: string;
  collection: string;
  source_id: string | null;
  fields: Json;
  draft_state: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export type RecordInsert = Omit<RecordRow, 'id' | 'created_at' | 'updated_at'> &
  Partial<Pick<RecordRow, 'id'>>;

export interface StudioStoreConfig {
  url: string;
  key: string;
}

// 接続設定を解決する。studio store 専用 env を優先し、未指定なら core と同居（同一 Supabase の studio スキーマ）。
export function resolveStudioStoreConfig(config?: Partial<StudioStoreConfig>): StudioStoreConfig {
  const url = config?.url ?? process.env.STUDIO_STORE_URL ?? process.env.SUPABASE_URL;
  const key = config?.key ?? process.env.STUDIO_STORE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('studio store の接続情報が未設定です（STUDIO_STORE_URL / _SECRET_KEY か SUPABASE_*）。');
  }
  return { url, key };
}

// studio スキーマへの service_role クライアント。
export function createStudioStoreClient(config: StudioStoreConfig) {
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'studio' },
  });
}

// db.schema: 'studio' を反映した実体の型をそのまま使う（public 前提の素の型と噛み合わないため）。
export type StudioStoreClient = ReturnType<typeof createStudioStoreClient>;
