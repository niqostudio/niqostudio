// Stripe イベント → 正規化マッピングのテスト（フィールドパスの取り違え防止）。
// 実 Stripe イベントの形を模したフィクスチャで、金額・期限・metadata・id が正しい列に入るかを固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStripeEvent } from '../functions/_shared/normalize.mjs';

const at = 1_780_000_000; // 固定 epoch（秒）
const expectedAt = new Date(at * 1000).toISOString();

test('checkout.session.completed（一回課金）: 金額・metadata・checkout/payment id が正しく入る', () => {
  const n = normalizeStripeEvent({
    id: 'evt_1', type: 'checkout.session.completed', created: at,
    data: { object: {
      id: 'cs_123', mode: 'payment', amount_total: 900, currency: 'usd',
      customer: 'cus_1', customer_details: { email: 'a@x.com' },
      payment_intent: 'pi_1', metadata: { product: 'demo-app', offer: 'launch_pass', scope: 'proj-a' },
    } },
  });
  assert.equal(n.kind, 'purchase');
  assert.equal(n.amount, 900);
  assert.equal(n.currency, 'usd');
  assert.equal(n.customerEmail, 'a@x.com');
  assert.equal(n.externalCustomerId, 'cus_1');
  assert.equal(n.externalCheckoutId, 'cs_123');
  assert.equal(n.externalPaymentId, 'pi_1');
  assert.equal(n.productCode, 'demo-app');
  assert.equal(n.offerKey, 'launch_pass');
  assert.equal(n.scope, 'proj-a');
  assert.equal(n.eventAt, expectedAt);
});

test('checkout.session.completed（mode=subscription）: kind は付与しない（invoice で確定）', () => {
  const n = normalizeStripeEvent({
    id: 'evt_2', type: 'checkout.session.completed', created: at,
    data: { object: { id: 'cs_2', mode: 'subscription', amount_total: 1900, currency: 'usd', metadata: {} } },
  });
  assert.equal(n.kind, null);
});

test('invoice.paid（初回）: kind=purchase・period.end が期限になる', () => {
  const periodEnd = 1_782_592_000;
  const n = normalizeStripeEvent({
    id: 'evt_3', type: 'invoice.paid', created: at,
    data: { object: {
      id: 'in_1', billing_reason: 'subscription_create', amount_paid: 1900, currency: 'usd',
      customer: 'cus_2', customer_email: 'b@x.com', payment_intent: 'pi_2',
      subscription_details: { metadata: { product: 'demo-app', offer: 'pro_monthly', scope: '' } },
      lines: { data: [{ period: { end: periodEnd } }] },
    } },
  });
  assert.equal(n.kind, 'purchase');
  assert.equal(n.amount, 1900);
  assert.equal(n.externalInvoiceId, 'in_1');
  assert.equal(n.scope, null, '空 scope は null');
  assert.equal(n.periodEnd, new Date(periodEnd * 1000).toISOString());
});

test('invoice.paid（複数明細）: proration 行に惑わされず最大 period.end を採る', () => {
  const prorationEnd = 1_781_000_000; // 古い（proration 行）
  const coverageEnd = 1_782_592_000; // 新しい（本来の被覆終端）
  const n = normalizeStripeEvent({
    id: 'evt_ml', type: 'invoice.paid', created: at,
    data: { object: {
      id: 'in_ml', billing_reason: 'subscription_cycle', amount_paid: 1900, currency: 'usd',
      metadata: { product: 'demo-app', offer: 'pro_monthly' },
      lines: { data: [
        { period: { end: prorationEnd } },
        { period: { end: coverageEnd } },
      ] },
    } },
  });
  assert.equal(n.periodEnd, new Date(coverageEnd * 1000).toISOString(), '最大の period.end を期末にする');
});

test('invoice.paid（更新）: kind=renewal', () => {
  const n = normalizeStripeEvent({
    id: 'evt_4', type: 'invoice.paid', created: at,
    data: { object: { id: 'in_2', billing_reason: 'subscription_cycle', amount_paid: 1900, currency: 'usd', metadata: { product: 'demo-app', offer: 'pro_monthly' }, lines: { data: [] } } },
  });
  assert.equal(n.kind, 'renewal');
  assert.equal(n.periodEnd, null, 'period 不在なら null（落ちない）');
});

test('charge.refunded: kind=refund・amount_refunded を拾う', () => {
  const n = normalizeStripeEvent({
    id: 'evt_5', type: 'charge.refunded', created: at,
    data: { object: { amount_refunded: 900, currency: 'usd', payment_intent: 'pi_1', billing_details: { email: 'a@x.com' }, metadata: { product: 'demo-app', offer: 'launch_pass', scope: 'proj-a' } } },
  });
  assert.equal(n.kind, 'refund');
  assert.equal(n.amount, 900);
  assert.equal(n.externalPaymentId, 'pi_1');
  assert.equal(n.scope, 'proj-a');
});

test('charge.dispute.created: kind=dispute', () => {
  const n = normalizeStripeEvent({
    id: 'evt_6', type: 'charge.dispute.created', created: at,
    data: { object: { amount: 900, currency: 'usd', payment_intent: 'pi_1' } },
  });
  assert.equal(n.kind, 'dispute');
  assert.equal(n.amount, 900);
});

test('未扱いイベント: kind=null（記録のみ）', () => {
  const n = normalizeStripeEvent({ id: 'evt_7', type: 'customer.updated', created: at, data: { object: {} } });
  assert.equal(n.kind, null);
  assert.equal(n.eventId, 'evt_7');
});
