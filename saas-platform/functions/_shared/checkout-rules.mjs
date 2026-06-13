// checkout のバリデーション（純粋関数・env 非依存）。Deno 関数とテストで共有する。

// success/cancel URL の origin が製品の允許リストに入っているか。
export function originAllowed(allowMap, productCode, url) {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return false;
  }
  const list = allowMap?.[productCode] ?? [];
  return list.includes(origin);
}

// offer 種別と scope の整合。NG なら error コード、OK なら null を返す。
// サブスク（interval あり）に scope 付き、対象束縛（一回課金）に scope 欠落、は不正。
export function checkScopeOffer(isSubscription, scope) {
  if (isSubscription && scope !== null) return 'scope_not_allowed_for_subscription';
  if (!isSubscription && scope === null) return 'scope_required_for_one_shot';
  return null;
}

// Authorization の Bearer トークンの分類。'none' | 'apikey' | 'user' を返す。
// supabase-js の functions.invoke はセッションが無くても publishable / anon キーを Bearer に載せるため、
// 「ヘッダあり＝identity の主張」とは限らない。api キー形状（sb_* / role が anon・service_role の JWT）は
// 匿名扱い、それ以外は user JWT の主張として検証対象（検証失敗は 401＝黙って匿名に落とさない）。
export function classifyAuthToken(token) {
  if (!token) return 'none';
  if (token.startsWith('sb_')) return 'apikey';
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'anon' || payload.role === 'service_role') return 'apikey';
    } catch {
      // payload が読めない＝user 主張として検証に回す（そこで 401 になる）
    }
  }
  return 'user';
}
