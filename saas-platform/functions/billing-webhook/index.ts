// PSP webhook 受信。署名検証→正規化→（匿名なら get-or-create user で org 確定）→record_event。
// 冪等・順序ガード・台帳 append・grants 再計算は record_event（SQL）が担う＝ここは薄いアダプタ。
import { db } from '../_shared/db.ts';
import { stripeProvider } from '../_shared/stripe.ts';

const provider = stripeProvider;

// email から既存ユーザーの org を引く。無ければ Supabase Admin API で user を作る
// （サインアップトリガが個人 org/grant を生成）→ その org を返す。匿名 checkout の provisioning。
async function resolveOrgId(email: string | null, productCode: string | null): Promise<string | null> {
  if (!email) return null;
  const sql = db();
  const existing = await sql`
    select m.organization_id
    from auth.users u
    join identity.memberships m on m.user_id = u.id
    join identity.organizations o on o.id = m.organization_id and o.is_personal
    where lower(u.email) = lower(${email})
    order by m.created_at
    limit 1`;
  if (existing[0]) return existing[0].organization_id;

  // 未登録 email → Admin API で作成（トリガが provisioning）。
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      email_confirm: true, // 決済済み＝メール到達は確認済みとみなす
      user_metadata: productCode ? { product: productCode } : {},
    }),
  });
  if (!res.ok) {
    console.error('admin createUser failed', res.status, await res.text());
    return null;
  }
  // 作成直後の org を引く（トリガ後）。
  const created = await sql`
    select m.organization_id
    from auth.users u
    join identity.memberships m on m.user_id = u.id
    where lower(u.email) = lower(${email})
    order by m.created_at
    limit 1`;
  return created[0]?.organization_id ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const sig = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();

  let ev;
  try {
    ev = await provider.parseWebhook(raw, sig);
  } catch (e) {
    console.error('signature verification failed', e);
    return new Response('invalid signature', { status: 400 });
  }

  // 扱わないイベント（kind=null）は 200 で受けて終わり（Stripe の再送を止める）。
  if (!ev.kind) return new Response('ignored', { status: 200 });

  const orgId = await resolveOrgId(ev.customerEmail, ev.productCode);
  const sql = db();
  try {
    const [{ record_event: result }] = await sql`
      select billing.record_event(
        ${ev.provider}, ${ev.eventId}, ${ev.type}, ${ev.eventAt},
        ${orgId}, ${ev.customerEmail}, ${ev.productCode}, ${ev.offerKey}, ${ev.scope},
        ${ev.kind}, ${ev.amount}, ${ev.currency},
        ${ev.externalCheckoutId}, ${ev.externalPaymentId}, ${ev.externalInvoiceId}, ${ev.periodEnd}, null)`;
    // customer link（サブスク用）を保存。
    if (orgId && ev.externalCustomerId) {
      await sql`
        insert into billing.customer_links (provider, organization_id, external_customer_id)
        values (${ev.provider}, ${orgId}, ${ev.externalCustomerId})
        on conflict (provider, external_customer_id) do nothing`;
    }
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('record_event failed', e);
    // 500 を返すと Stripe が再送する（冪等なので安全）。
    return new Response('processing error', { status: 500 });
  }
});
