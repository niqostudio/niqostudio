// 成功リダイレクトの中継。Stripe の success_url をここに向け、session を検証してレシートを発行し、
// 製品の最終 dest へ #receipt=<JWT> を付けて 302 する。一回課金の即解錠（往復ゼロ）の要。
// GET /billing-return?session_id=..&product=..&offer=..&scope=..&dest=..
import { db } from '../_shared/db.ts';
import { issuer, originAllowed } from '../_shared/config.ts';
import { issueReceipt } from '../_shared/receipt.ts';
import { stripeProvider } from '../_shared/stripe.ts';

const provider = stripeProvider;

function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { location: to, 'referrer-policy': 'no-referrer' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('method not allowed', { status: 405 });
  const q = new URL(req.url).searchParams;
  const sessionId = q.get('session_id');
  const product = q.get('product');
  const offer = q.get('offer');
  const scope = q.get('scope'); // null=サブスク
  const dest = q.get('dest');

  if (!sessionId || !product || !offer || !dest) return new Response('bad request', { status: 400 });
  // dest も改めて允許リストで縛る（オープンリダイレクト防止）。
  if (!originAllowed(product, dest)) return new Response('forbidden', { status: 403 });

  try {
    const status = await provider.retrieveCheckout(sessionId);
    if (!status.paid) {
      // 未決済なら dest にだけ戻す（レシートは出さない）。
      return redirect(dest);
    }
    // 台帳に customer_email スナップショットを補完（webhook が先着していれば no-op）。
    if (status.customerEmail) {
      const sql = db();
      await sql`
        update billing.purchases set customer_email = ${status.customerEmail}
        where provider = ${provider.code} and external_checkout_id = ${status.externalCheckoutId}
          and customer_email is null`;
    }
    // 即解錠レシート（恒久の正本は grants・これは短 TTL の購入直後の証明）。
    const receipt = await issueReceipt(issuer(), product, offer, scope);
    const url = `${dest}#receipt=${encodeURIComponent(receipt)}`;
    return redirect(url);
  } catch (e) {
    console.error('return failed', e);
    // 失敗時もユーザーは製品へ戻す（解錠はされない＝grants/webhook で後追い）。
    return redirect(dest);
  }
});
