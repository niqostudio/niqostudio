import type { Metadata } from 'next';
import { authConfigured } from '@/adapters/session/supabase/client';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'ログイン - NIQO STUDIO' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="min-h-dvh grid place-items-center bg-bg p-6">
      <div className="card w-full max-w-sm p-6">
        <h1 className="font-semibold tracking-tight">NIQO STUDIO</h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mt-0.5 mb-4">studio ログイン</p>
        {error === 'not_allowed' && (
          <p className="text-sm text-accent mb-3">このアカウントはアクセスを許可されていません。</p>
        )}
        {authConfigured() ? (
          <LoginForm />
        ) : (
          <p className="text-sm text-muted">
            認証が未設定です。studio/.env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
            STUDIO_ALLOWED_EMAILS を設定してください。
          </p>
        )}
      </div>
    </main>
  );
}
