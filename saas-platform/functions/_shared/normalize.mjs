// PSP イベント → 正規化イベントのマッピング（純粋関数・Stripe SDK 非依存）。
// Deno 関数（stripe.ts）と node テスト（normalize.test.mjs）の両方から import する＝
// フィールドパスの取り違え（金額ゼロ・期限欠落等）をテストで固定するため切り出した。

const PROVIDER = 'stripe';

function base(event) {
  return {
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
}

const str = (v) => (typeof v === 'string' ? v : null);
const nz = (v) => (v ? v : null); // 空文字 → null

export function normalizeStripeEvent(event) {
  const b = base(event);
  const o = event.data?.object ?? {};

  switch (event.type) {
    case 'checkout.session.completed': {
      const md = o.metadata ?? {};
      return {
        ...b,
        // サブスクの初回は invoice 側で確定。ここでは一回課金（mode=payment）のみ付与扱い。
        kind: o.mode === 'payment' ? 'purchase' : null,
        customerEmail: o.customer_details?.email ?? o.customer_email ?? null,
        externalCustomerId: str(o.customer),
        productCode: nz(md.product),
        offerKey: nz(md.offer),
        scope: nz(md.scope),
        amount: o.amount_total ?? null,
        currency: o.currency ?? null,
        externalCheckoutId: o.id ?? null,
        externalPaymentId: str(o.payment_intent),
      };
    }
    case 'invoice.paid': {
      const md = o.subscription_details?.metadata ?? o.metadata ?? {};
      const isFirst = o.billing_reason === 'subscription_create';
      const periodEnd = o.lines?.data?.[0]?.period?.end;
      return {
        ...b,
        kind: isFirst ? 'purchase' : 'renewal',
        customerEmail: o.customer_email ?? null,
        externalCustomerId: str(o.customer),
        productCode: nz(md.product),
        offerKey: nz(md.offer),
        scope: nz(md.scope),
        amount: o.amount_paid ?? null,
        currency: o.currency ?? null,
        externalInvoiceId: o.id ?? null,
        externalPaymentId: str(o.payment_intent),
        periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      };
    }
    case 'charge.refunded': {
      const md = o.metadata ?? {};
      return {
        ...b,
        kind: 'refund',
        customerEmail: o.billing_details?.email ?? null,
        productCode: nz(md.product),
        offerKey: nz(md.offer),
        scope: nz(md.scope),
        amount: o.amount_refunded ?? null,
        currency: o.currency ?? null,
        externalPaymentId: str(o.payment_intent),
      };
    }
    case 'charge.dispute.created': {
      return {
        ...b,
        kind: 'dispute',
        amount: o.amount ?? null,
        currency: o.currency ?? null,
        externalPaymentId: str(o.payment_intent),
      };
    }
    default:
      return b; // 未扱いは kind=null（記録のみ・付与しない）
  }
}
