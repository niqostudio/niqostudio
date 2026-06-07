import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// 新 API キー方式: publishable key（sb_publishable_…、anon の後継）。RLS を尊重し公開してよい。
// 秘密 key（service_role 後継）は website では使わない。
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// fallback は持たない。未設定ならビルド/起動を止める（生成物は本番相当である前提）。
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY が未設定です。website は実データ前提のため fallback せずに停止します。',
  );
}

// 業務データ層は core スキーマ。anon は core.public_* view だけ読める。
export const supabase: SupabaseClient<Database, 'core'> = createClient<Database, 'core'>(supabaseUrl, supabaseKey, {
  db: { schema: 'core' },
});

// 問い合わせ INSERT 専用クライアント。apikey は publishable のまま、Authorization に最小権限ロール
// inquiry_writer を名乗る JWT を載せる（JWT は実行時 secret＝公開値でない）。Worker からのみ使う。
export function inquiryClient(jwt: string): SupabaseClient<Database, 'core'> {
  return createClient<Database, 'core'>(supabaseUrl, supabaseKey, {
    db: { schema: 'core' },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
