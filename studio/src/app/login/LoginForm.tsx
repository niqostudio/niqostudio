'use client';
import { useActionState } from 'react';
import { signIn, type AuthState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="メールアドレス"
        className="rounded-sm border border-border bg-bg px-3 py-2 text-sm"
      />
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="パスワード"
        className="rounded-sm border border-border bg-bg px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-fg px-3 py-2 text-sm text-bg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  );
}
