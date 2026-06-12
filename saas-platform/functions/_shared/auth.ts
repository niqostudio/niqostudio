// checkout の任意 identity 解決。匿名が一級市民のため verify_jwt は OFF のまま、
// Authorization に user JWT が載っていれば検証して個人 org を確定する（無効は呼び出し側で 401）。
import { db } from './db.ts';
import { classifyAuthToken } from './checkout-rules.mjs';

export type CheckoutIdentity =
  | { kind: 'anonymous' }
  | { kind: 'invalid' }
  | { kind: 'user'; userId: string; email: string | null; orgId: string | null };

export async function resolveIdentity(req: Request): Promise<CheckoutIdentity> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (classifyAuthToken(token || null) !== 'user') return { kind: 'anonymous' };

  // 検証は auth サーバ照会（GET /auth/v1/user）。JWKS ローカル検証にしないのは、
  // ローカル（HS256）と本番（ES256）の署名方式差・失効（ログアウト/ban）を一括で吸収するため。
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return { kind: 'invalid' };
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { kind: 'invalid' };
  const user = await res.json();
  if (typeof user?.id !== 'string') return { kind: 'invalid' };

  // grant の着地先は個人 org（1 user = 1 personal org の現モデル）。チーム org への課金は
  // org 指定＋membership のサーバ検証を入れる将来拡張。provisioning 直後の遅延で org 不在は
  // ありうるため orgId null を許す（呼び出し側が匿名相当で進め、webhook の email 解決が拾う）。
  const sql = db();
  const rows = await sql`
    select m.organization_id
    from identity.memberships m
    join identity.organizations o on o.id = m.organization_id and o.is_personal
    where m.user_id = ${user.id}
    order by m.created_at
    limit 1`;
  return { kind: 'user', userId: user.id, email: user.email ?? null, orgId: rows[0]?.organization_id ?? null };
}
