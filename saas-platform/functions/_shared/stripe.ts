// Stripe adapter（PaymentProvider port の実装）。Stripe 固有はこのファイルに閉じる。
import Stripe from 'stripe';
import type {
  CheckoutParams,
  CheckoutResult,
  CheckoutStatus,
  NormalizedEvent,
  PaymentProvider,
} from './provider.ts';
// イベント→正規化は純粋 JS に切り出してテストで固定（フィールドパスの取り違え防止）。
import { normalizeStripeEvent } from './normalize.mjs';

const PROVIDER = 'stripe';

function client(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  // Deno fetch ベースの HTTP クライアントを使う。
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), apiVersion: '2025-02-24.acacia' as never });
}

export const stripeProvider: PaymentProvider = {
  code: PROVIDER,

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const stripe = client();
    // 価格は lookup key で解決（price ID を billing に焼き込まない）。
    const prices = await stripe.prices.list({ lookup_keys: [p.priceLookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) throw new Error(`price not found for lookup_key=${p.priceLookupKey}`);

    // metadata に製品・offer・scope を載せ、webhook 側でそのまま正規化に使う。
    // identity 付きは org_id（grant の着地先の確定）、一回課金は access_period_days
    // （checkout 時点の販売条件の焼き込み）も載せる。値はサーバが作って Stripe 経由で戻る＝改竄不可。
    const metadata: Record<string, string> = { product: p.productCode, offer: p.offerKey, scope: p.scope ?? '' };
    if (p.orgId) metadata.org_id = p.orgId;
    if (p.accessPeriodDays != null) metadata.access_period_days = String(p.accessPeriodDays);
    const session = await stripe.checkout.sessions.create({
      mode: p.isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      locale: (p.locale as Stripe.Checkout.SessionCreateParams.Locale) ?? 'auto',
      // 価格マスタは usd 一本、購入者の地域通貨は Stripe が自動換算（Adaptive Pricing）。
      // ダッシュボード設定でなくセッション単位で宣言する＝コードが正本。
      // 決済は購入者の現地通貨になり、webhook / 台帳の amount・currency は実際の決済通貨が入る。
      adaptive_pricing: { enabled: true },
      metadata,
      // identity 付きは決済メールをアカウントのメールに固定（Checkout 上で編集不可になる）。
      // アカウントと別メールで決済→別 org に着地する事故を断つ。匿名は入力自由のまま。
      customer_email: p.customerEmail ?? undefined,
      // 一回課金でも email を必須にして匿名 provisioning の anchor にする。
      customer_creation: p.isSubscription ? undefined : 'always',
      ...(p.isSubscription ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    });
    if (!session.url) throw new Error('stripe did not return a checkout url');
    return { url: session.url };
  },

  async retrieveCheckout(checkoutId: string): Promise<CheckoutStatus> {
    const stripe = client();
    const s = await stripe.checkout.sessions.retrieve(checkoutId);
    return {
      paid: s.payment_status === 'paid' || s.status === 'complete',
      customerEmail: s.customer_details?.email ?? s.customer_email ?? null,
      externalCheckoutId: s.id,
    };
  },

  async parseWebhook(rawBody: string, signature: string): Promise<NormalizedEvent> {
    const stripe = client();
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    // Deno は同期 crypto 不可 → async 版で署名検証。
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
    return normalizeStripeEvent(event as unknown as Record<string, unknown>) as NormalizedEvent;
  },
};
