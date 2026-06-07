import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 認証は anon/publishable キー＋cookie（@supabase/ssr）。データアクセスの service_role とは別系統。
// ブラウザにも出る公開値なので NEXT_PUBLIC_*。
export function authConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function authEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です（studio/.env.local）。');
  }
  return { url, key };
}

// RSC / server action / route handler 用。セッション更新は middleware が担うため RSC からの set 失敗は握りつぶす。
export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const { url, key } = authEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* RSC からは cookie を set できない。middleware が更新する。 */
        }
      },
    },
  });
}
