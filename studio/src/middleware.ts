import type { NextRequest } from 'next/server';
import { updateSession } from '@/adapters/session/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// 静的アセット以外の全ルートでセッション検証/ゲートを走らせる。
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'],
};
