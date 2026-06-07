import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@niqostudio/db-types';

export interface SupabaseConfig {
  url: string;
  key: string;
}

// 接続設定を解決する（未指定なら env から読む）。
export function resolveSupabaseConfig(config?: Partial<SupabaseConfig>): SupabaseConfig {
  const url = config?.url ?? process.env.SUPABASE_URL;
  const key = config?.key ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY が未設定です（studio/.env.local）。');
  }
  return { url, key };
}

// core(Supabase) への service_role クライアント（RLS バイパスで core スキーマの内部表を読む）。
export function createCoreClient(config: SupabaseConfig): SupabaseClient<Database, 'core'> {
  return createClient<Database, 'core'>(config.url, config.key, {
    db: { schema: 'core' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 動的テーブル名を扱う generic adapter 用の core クライアント（Database 型を持たず schema だけ core）。
export function createDynamicCoreClient(config: SupabaseConfig) {
  return createClient(config.url, config.key, {
    db: { schema: 'core' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export type CoreClient = ReturnType<typeof createDynamicCoreClient>;
