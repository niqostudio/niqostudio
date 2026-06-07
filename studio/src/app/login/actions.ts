'use server';
import { redirect } from 'next/navigation';
import { authConfigured, createAuthServerClient } from '@/adapters/session/supabase/client';
import { isAllowed } from '@/adapters/session/supabase/allow';

export type AuthState = { error: string } | null;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!authConfigured()) return { error: '認証 env 未設定（studio/.env.local の NEXT_PUBLIC_SUPABASE_*）。' };
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'メールとパスワードを入力してください。' };
  if (!isAllowed(email)) return { error: 'このメールはアクセスを許可されていません。' };

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'メールまたはパスワードが違います。' };
  redirect('/');
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
