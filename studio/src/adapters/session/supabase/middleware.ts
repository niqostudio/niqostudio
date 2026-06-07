import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAllowed } from './allow';

const PUBLIC_PREFIXES = ['/login', '/auth'];
const isPublic = (path: string) => PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

// 全リクエストでセッションを検証/更新し、未認証・許可外を /login へ弾く。
// 注意: cookie は request→response へ橋渡しする（@supabase/ssr の作法）。getUser は毎回 auth サーバで検証（getSession より安全）。
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // env 未設定時もゲートは開けない（公開パスだけ通し、他は /login へ）。
  if (!url || !key) {
    if (isPublic(path)) return NextResponse.next({ request });
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    return NextResponse.redirect(redirect);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(path)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    return NextResponse.redirect(redirect);
  }

  // 認証済みだが許可リスト外＝サインアウトして弾く（多層防御）。
  if (user && !isAllowed(user.email)) {
    await supabase.auth.signOut();
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('error', 'not_allowed');
    return NextResponse.redirect(redirect);
  }

  // 認証済みで /login に来たらホームへ。
  if (user && path === '/login') {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    return NextResponse.redirect(home);
  }

  return response;
}
