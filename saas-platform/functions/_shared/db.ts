// billing スキーマは Data API 非露出のため、PostgREST 経由（supabase-js）では届かない。
// Edge Function は SUPABASE_DB_URL で **DB に直結**して billing/identity を service 権限で触る。
import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

export function db() {
  if (_sql) return _sql;
  const url = Deno.env.get('SUPABASE_DB_URL');
  if (!url) throw new Error('SUPABASE_DB_URL is not set');
  // Edge Function は短命なので接続は最小・prepare 無効（pooler 互換）。
  _sql = postgres(url, { max: 1, prepare: false });
  return _sql;
}
