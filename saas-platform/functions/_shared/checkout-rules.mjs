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
