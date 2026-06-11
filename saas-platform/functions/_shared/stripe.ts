// Stripe adapter（PaymentProvider port の実装）。Stripe 固有はこのファイルに閉じる。
import Stripe from 'stripe';
import type {
  CheckoutParams,
  CheckoutResult,
  CheckoutStatus,
  NormalizedEvent,
  PaymentProvider,
} from './provider.ts';

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
    const metadata = { product: p.productCode, offer: p.offerKey, scope: p.scope ?? '' };
    const session = await stripe.checkout.sessions.create({
      mode: p.isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      locale: (p.locale as Stripe.Checkout.SessionCreateParams.Locale) ?? 'auto',
      metadata,
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
    return normalize(event);
  },
};

// Stripe event → PSP 非依存の正規化イベント。扱うイベントだけ kind を埋める。
function normalize(event: Stripe.Event): NormalizedEvent {
  const base: NormalizedEvent = {
    provider: PROVIDER,
    eventId: event.id,
    type: event.type,
    eventAt: new Date(event.created * 1000).toISOString(),
    kind: null,
    customerEmail: null,
    externalCustomerId: null,
    productCode: null,
    offerKey: null,
    scope: null,
    amount: null,
    currency: null,
    externalCheckoutId: null,
    externalPaymentId: null,
    externalInvoiceId: null,
    periodEnd: null,
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      // サブスクの初回は invoice 側で確定するため、ここでは payment（一回課金）のみ付与扱い。
      const md = s.metadata ?? {};
      return {
        ...base,
        kind: s.mode === 'payment' ? 'purchase' : null,
        customerEmail: s.customer_details?.email ?? s.customer_email ?? null,
        externalCustomerId: typeof s.customer === 'string' ? s.customer : null,
        productCode: md.product ?? null,
        offerKey: md.offer ?? null,
        scope: md.scope ? md.scope : null,
        amount: s.amount_total,
        currency: s.currency,
        externalCheckoutId: s.id,
        externalPaymentId: typeof s.payment_intent === 'string' ? s.payment_intent : null,
      };
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      const md = (inv.subscription_details?.metadata ?? inv.metadata ?? {}) as Record<string, string>;
      const isFirst = inv.billing_reason === 'subscription_create';
      return {
        ...base,
        kind: isFirst ? 'purchase' : 'renewal',
        customerEmail: inv.customer_email,
        externalCustomerId: typeof inv.customer === 'string' ? inv.customer : null,
        productCode: md.product ?? null,
        offerKey: md.offer ?? null,
        scope: md.scope ? md.scope : null,
        amount: inv.amount_paid,
        currency: inv.currency,
        externalInvoiceId: inv.id,
        externalPaymentId: typeof inv.payment_intent === 'string' ? inv.payment_intent : null,
        periodEnd: inv.lines.data[0]?.period?.end
          ? new Date(inv.lines.data[0].period.end * 1000).toISOString()
          : null,
      };
    }
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge;
      const md = (ch.metadata ?? {}) as Record<string, string>;
      return {
        ...base,
        kind: 'refund',
        customerEmail: ch.billing_details?.email ?? null,
        productCode: md.product ?? null,
        offerKey: md.offer ?? null,
        scope: md.scope ? md.scope : null,
        amount: ch.amount_refunded,
        currency: ch.currency,
        externalPaymentId: typeof ch.payment_intent === 'string' ? ch.payment_intent : null,
      };
    }
    case 'charge.dispute.created': {
      const d = event.data.object as Stripe.Dispute;
      return {
        ...base,
        kind: 'dispute',
        amount: d.amount,
        currency: d.currency,
        externalPaymentId: typeof d.payment_intent === 'string' ? d.payment_intent : null,
      };
    }
    default:
      return base; // 未扱いイベントは kind=null（記録だけして付与はしない）
  }
}
