import 'server-only';
import type { Operator, SessionPort } from '@/ports/session';
import { authConfigured, createAuthServerClient } from './client';

// SessionPort 実装。Supabase user を domain 中立な Operator へ写す（UI は supabase の型に依存しない）。
export async function getOperator(): Promise<Operator | null> {
  if (!authConfigured()) return null;
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

export const supabaseSsrSession: SessionPort = { getOperator };
