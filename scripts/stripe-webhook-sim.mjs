// Stripe CLI なしで webhook をローカル検証する。合成イベントを STRIPE_WEBHOOK_SECRET で署名して
// billing-webhook に POST する（Stripe の署名方式＝HMAC-SHA256(timestamp.payload, secret)）。
// 使い方: WEBHOOK_SECRET=whsec_localtest node scripts/stripe-webhook-sim.mjs [checkout|invoice|refund]
import { createHmac, randomUUID } from 'node:crypto';

const SECRET = process.env.WEBHOOK_SECRET ?? 'whsec_localtest';
const URL = process.env.WEBHOOK_URL ?? 'http://127.0.0.1:55321/functions/v1/billing-webhook';
const kind = process.argv[2] ?? 'checkout';
const email = process.env.EMAIL ?? 'e2e-buyer@example.com';
const md = { product: 'demo-app', offer: kind === 'invoice' ? 'pro_monthly' : 'launch_pass', scope: kind === 'invoice' ? '' : 'proj-e2e' };
const created = Math.floor(Date.now() / 1000);
const eid = `evt_${created}_${randomUUID().slice(0, 8)}`;

function event() {
  if (kind === 'checkout') {
    return { id: eid, type: 'checkout.session.completed', created,
      data: { object: { id: `cs_${created}`, mode: 'payment', amount_total: 900, currency: 'usd',
        customer: 'cus_e2e', customer_details: { email }, payment_intent: `pi_${created}`, metadata: md } } };
  }
  if (kind === 'invoice') {
    return { id: eid, type: 'invoice.paid', created,
      data: { object: { id: `in_${created}`, billing_reason: 'subscription_create', amount_paid: 1900, currency: 'usd',
        customer: 'cus_e2e', customer_email: email, payment_intent: `pi_${created}`,
        subscription_details: { metadata: md }, lines: { data: [{ period: { end: created + 2592000 } }] } } } };
  }
  if (kind === 'refund') {
    return { id: eid, type: 'charge.refunded', created,
      data: { object: { amount_refunded: 900, currency: 'usd', payment_intent: `pi_refund`,
        billing_details: { email }, metadata: md } } };
  }
  throw new Error(`unknown kind: ${kind}`);
}

const payload = JSON.stringify(event());
const t = Math.floor(Date.now() / 1000);
const sig = createHmac('sha256', SECRET).update(`${t}.${payload}`).digest('hex');

const res = await fetch(URL, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${sig}` },
  body: payload,
});
console.log(`${kind} → HTTP ${res.status}: ${await res.text()}`);
