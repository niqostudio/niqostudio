'use client';
import { signOut } from '@/app/login/actions';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="mt-1 text-xs text-muted hover:text-accent transition-colors">
        サインアウト
      </button>
    </form>
  );
}
