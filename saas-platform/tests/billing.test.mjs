// billing.record_event（webhook の決済反映の核）の不変条件テスト。
// 冪等・順序ガード・一回課金の期限・サブスク・返金の失効を、トランザクション内で検証しロールバックする。
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';

const DB_URL =
  process.env.SAAS_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:55322/postgres?sslmode=disable';

let c;
before(async () => {
  c = new Client({ connectionString: DB_URL });
  await c.connect();
});
after(() => c.end());
beforeEach(() => c.query('begin'));
afterEach(() => c.query('rollback'));

// テスト用の org と製品・offer を用意する。
async function fixtures() {
  const {
    rows: [u],
  } = await c.query(
    `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'buyer@example.com', '{}') returning id`,
  );
  const {
    rows: [m],
  } = await c.query('select organization_id from identity.memberships where user_id = $1', [u.id]);
  const {
    rows: [p],
  } = await c.query(`insert into identity.products (code, name) values ('demo','Demo') returning id`);
  await c.query(
    `insert into billing.product_offers (product_id, key, currency, unit_amount, access_period_days)
     values ($1,'launch_pass','usd',900,30)`,
    [p.id],
  );
  await c.query(
    `insert into billing.product_offers (product_id, key, currency, unit_amount, billing_interval)
     values ($1,'pro_monthly','usd',1900,'month')`,
    [p.id],
  );
  return { orgId: m.organization_id, productId: p.id };
}

// record_event を名前付き引数で呼ぶ薄いラッパ。
async function record(args) {
  const d = {
    p_provider: 'stripe',
    p_event_at: new Date('2026-06-13T00:00:00Z').toISOString(),
    p_org_id: null,
    p_customer_email: 'buyer@example.com',
    p_scope: null,
    p_amount: 900,
    p_currency: 'usd',
    p_external_checkout_id: null,
    p_external_payment_id: null,
    p_external_invoice_id: null,
    p_period_end: null,
    p_parent_id: null,
    ...args,
  };
  const { rows } = await c.query(
    `select billing.record_event(
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) as result`,
    [
      d.p_provider, d.p_event_id, d.p_event_type, d.p_event_at, d.p_org_id, d.p_customer_email,
      d.p_product_code, d.p_offer_key, d.p_scope, d.p_kind, d.p_amount, d.p_currency,
      d.p_external_checkout_id, d.p_external_payment_id, d.p_external_invoice_id, d.p_period_end, d.p_parent_id,
    ],
  );
  return rows[0].result;
}
const grant = async (orgId, scope) =>
  (
    await c.query(
      `select status, expires_at, plan, provider_synced_at from identity.product_grants
       where organization_id=$1 and scope is not distinct from $2`,
      [orgId, scope],
    )
  ).rows[0];

test('一回課金: scoped grant が active・期限は event_at + access_period_days（値をピン留め）', async () => {
  const { orgId } = await fixtures();
  const r = await record({
    p_event_id: 'evt_1', p_event_type: 'checkout.completed', p_event_at: '2026-06-13T00:00:00Z', p_org_id: orgId,
    p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-a', p_kind: 'purchase',
    p_external_checkout_id: 'cs_1',
  });
  assert.equal(r, 'applied');
  const g = await grant(orgId, 'proj-a');
  assert.equal(g.status, 'active');
  assert.equal(g.plan, 'launch_pass');
  // access_period_days=30 → event_at + 30日 を厳密に検証（30 を別値に変えれば落ちる）。
  assert.equal(new Date(g.expires_at).toISOString(), '2026-07-13T00:00:00.000Z');
  assert.equal(await count(`select count(*)::int n from billing.purchases where source_event_id='evt_1'`), 1);
});

test('冪等: 同一イベントの再処理は duplicate・台帳/grant が二重化も変化もしない', async () => {
  const { orgId } = await fixtures();
  const a = await record({ p_event_id: 'evt_2', p_event_type: 'x', p_org_id: orgId, p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-a', p_kind: 'purchase', p_external_checkout_id: 'cs_2' });
  const before = await grant(orgId, 'proj-a');
  const b = await record({ p_event_id: 'evt_2', p_event_type: 'x', p_org_id: orgId, p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-a', p_kind: 'purchase', p_external_checkout_id: 'cs_2' });
  const after = await grant(orgId, 'proj-a');
  assert.equal(a, 'applied');
  assert.equal(b, 'duplicate');
  assert.equal(await count(`select count(*)::int n from billing.purchases where source_event_id='evt_2'`), 1, '台帳1件');
  assert.equal(await count(`select count(*)::int n from identity.product_grants where organization_id='${orgId}' and scope='proj-a'`), 1, 'grant1件');
  // duplicate 処理で grant の中身（status/expires/plan/provider_synced_at）が変化しないこと。
  assert.deepEqual(after, before, 'duplicate で grant の中身は不変');
});

test('順序ガード: 古いイベントは新しい状態を上書きしない', async () => {
  const { orgId } = await fixtures();
  // 新しいイベント（refund・suspended）を先に適用
  await record({ p_event_id: 'evt_new', p_event_type: 'refund', p_event_at: '2026-06-13T10:00:00Z', p_org_id: orgId, p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'refund', p_external_invoice_id: 'in_new' });
  assert.equal((await grant(orgId, null)).status, 'suspended');
  // 古いイベント（purchase・active）が遅れて到着 → 上書きしてはいけない
  await record({ p_event_id: 'evt_old', p_event_type: 'purchase', p_event_at: '2026-06-13T09:00:00Z', p_org_id: orgId, p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'purchase', p_period_end: '2026-07-13T00:00:00Z', p_external_invoice_id: 'in_old' });
  assert.equal((await grant(orgId, null)).status, 'suspended', '古い purchase で active に戻らない');
});

test('サブスク: period_end が期限になる', async () => {
  const { orgId } = await fixtures();
  await record({ p_event_id: 'evt_sub', p_event_type: 'invoice.paid', p_org_id: orgId, p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'purchase', p_amount: 1900, p_period_end: '2026-07-13T00:00:00Z', p_external_invoice_id: 'in_sub' });
  const g = await grant(orgId, null);
  assert.equal(g.status, 'active');
  assert.equal(new Date(g.expires_at).toISOString(), '2026-07-13T00:00:00.000Z');
});

test('返金: refund で grant が suspended', async () => {
  const { orgId } = await fixtures();
  await record({ p_event_id: 'evt_p', p_event_type: 'purchase', p_event_at: '2026-06-13T01:00:00Z', p_org_id: orgId, p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-x', p_kind: 'purchase', p_external_checkout_id: 'cs_x' });
  assert.equal((await grant(orgId, 'proj-x')).status, 'active');
  await record({ p_event_id: 'evt_r', p_event_type: 'refund', p_event_at: '2026-06-13T02:00:00Z', p_org_id: orgId, p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-x', p_kind: 'refund', p_external_payment_id: 'pi_x' });
  assert.equal((await grant(orgId, 'proj-x')).status, 'suspended');
  assert.equal(await count(`select count(*)::int n from billing.purchases where organization_id='${orgId}'`), 2, '台帳は2行（購入＋返金）');
});

test('匿名: org 未確定（NULL）なら grants を触らず台帳のみ', async () => {
  await fixtures();
  const r = await record({ p_event_id: 'evt_anon', p_event_type: 'purchase', p_org_id: null, p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-z', p_kind: 'purchase', p_external_checkout_id: 'cs_z' });
  assert.equal(r, 'applied');
  assert.equal(await count(`select count(*)::int n from billing.purchases where source_event_id='evt_anon'`), 1, '台帳に残る');
  assert.equal(await count(`select count(*)::int n from identity.product_grants`), 0, 'grants は作られない');
});

test('未知製品: unknown_product・台帳/grants は作らないが provider_events は記録（再送で無限リトライしない）', async () => {
  const { orgId } = await fixtures();
  const r = await record({ p_event_id: 'evt_u', p_event_type: 'purchase', p_org_id: orgId, p_product_code: 'nope', p_offer_key: 'launch_pass', p_scope: 'p', p_kind: 'purchase', p_external_checkout_id: 'cs_u' });
  assert.equal(r, 'unknown_product');
  assert.equal(await count(`select count(*)::int n from billing.purchases where source_event_id='evt_u'`), 0, '台帳なし');
  // 未知でもイベントは記録され processed_at が埋まる＝再送が冪等に消化される（無限リトライ防止）。
  assert.equal(await count(`select count(*)::int n from billing.provider_events where event_id='evt_u' and processed_at is not null`), 1, 'イベントは処理済み記録');
  // 再送は duplicate
  const r2 = await record({ p_event_id: 'evt_u', p_event_type: 'purchase', p_org_id: orgId, p_product_code: 'nope', p_offer_key: 'launch_pass', p_scope: 'p', p_kind: 'purchase', p_external_checkout_id: 'cs_u' });
  assert.equal(r2, 'duplicate');
});

test('再購入: 同一 (org,product,scope) を upsert し expires_at が実際に延長される', async () => {
  const { orgId } = await fixtures();
  // 期限は event_at 基準なので、別 event_at の2回で期限が動く（now 固定トランザクションでも観測可能）。
  await record({ p_event_id: 'evt_buy1', p_event_at: '2026-06-13T00:00:00Z', p_org_id: orgId, p_event_type: 'purchase', p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-a', p_kind: 'purchase', p_external_checkout_id: 'cs_b1' });
  assert.equal(new Date((await grant(orgId, 'proj-a')).expires_at).toISOString(), '2026-07-13T00:00:00.000Z', '1回目: 6/13+30');
  await record({ p_event_id: 'evt_buy2', p_event_at: '2026-06-14T00:00:00Z', p_org_id: orgId, p_event_type: 'purchase', p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-a', p_kind: 'purchase', p_external_checkout_id: 'cs_b2' });
  assert.equal(await count(`select count(*)::int n from identity.product_grants where organization_id='${orgId}' and scope='proj-a'`), 1, 'grant は1行のまま');
  assert.equal(await count(`select count(*)::int n from billing.purchases where organization_id='${orgId}'`), 2, '台帳は2件');
  // 厳密大なり：2回目（6/14+30）が1回目（6/13+30）より後＝延長。
  assert.equal(new Date((await grant(orgId, 'proj-a')).expires_at).toISOString(), '2026-07-14T00:00:00.000Z', '2回目: 6/14+30 へ延長');
});

test('順序ガード（順方向）: より新しいイベントは状態を上書きする', async () => {
  const { orgId } = await fixtures();
  await record({ p_event_id: 'evt_o1', p_event_at: '2026-06-13T01:00:00Z', p_org_id: orgId, p_event_type: 'purchase', p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'purchase', p_period_end: '2026-07-13T00:00:00Z', p_external_invoice_id: 'in_o1' });
  assert.equal((await grant(orgId, null)).status, 'active');
  await record({ p_event_id: 'evt_o2', p_event_at: '2026-06-13T05:00:00Z', p_org_id: orgId, p_event_type: 'refund', p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'refund', p_external_invoice_id: 'in_o2' });
  assert.equal((await grant(orgId, null)).status, 'suspended', 'より新しい refund で suspended に進む');
});

test('順序ガード（等値）: 同一 timestamp の後続イベントは上書きしない（< の境界）', async () => {
  const { orgId } = await fixtures();
  const t = '2026-06-13T03:00:00Z';
  await record({ p_event_id: 'evt_e1', p_event_at: t, p_org_id: orgId, p_event_type: 'purchase', p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'purchase', p_period_end: '2026-07-13T00:00:00Z', p_external_invoice_id: 'in_e1' });
  assert.equal((await grant(orgId, null)).status, 'active');
  await record({ p_event_id: 'evt_e2', p_event_at: t, p_org_id: orgId, p_event_type: 'refund', p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'refund', p_external_invoice_id: 'in_e2' });
  assert.equal((await grant(orgId, null)).status, 'active', '同一時刻では上書きしない（provider_synced_at < の仕様）');
});

test('サブスク更新: kind=renewal も active・period_end で更新される（DB 経路）', async () => {
  const { orgId } = await fixtures();
  await record({ p_event_id: 'evt_rn1', p_event_at: '2026-06-13T00:00:00Z', p_org_id: orgId, p_event_type: 'invoice.paid', p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'purchase', p_amount: 1900, p_period_end: '2026-07-13T00:00:00Z', p_external_invoice_id: 'in_rn1' });
  await record({ p_event_id: 'evt_rn2', p_event_at: '2026-07-13T00:00:00Z', p_org_id: orgId, p_event_type: 'invoice.paid', p_product_code: 'demo', p_offer_key: 'pro_monthly', p_scope: null, p_kind: 'renewal', p_amount: 1900, p_period_end: '2026-08-13T00:00:00Z', p_external_invoice_id: 'in_rn2' });
  const g = await grant(orgId, null);
  assert.equal(g.status, 'active');
  assert.equal(new Date(g.expires_at).toISOString(), '2026-08-13T00:00:00.000Z', '更新で期末が進む');
});

test('chargeback / dispute: grant が suspended になる', async () => {
  const { orgId } = await fixtures();
  await record({ p_event_id: 'evt_cp', p_event_at: '2026-06-13T00:00:00Z', p_org_id: orgId, p_event_type: 'purchase', p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-c', p_kind: 'purchase', p_external_checkout_id: 'cs_c' });
  await record({ p_event_id: 'evt_cb', p_event_at: '2026-06-13T05:00:00Z', p_org_id: orgId, p_event_type: 'dispute', p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-c', p_kind: 'chargeback', p_external_payment_id: 'pi_c' });
  assert.equal((await grant(orgId, 'proj-c')).status, 'suspended');
});

test('無期限の一回課金: access_period_days NULL の offer は expires_at NULL', async () => {
  const { orgId, productId } = await fixtures();
  await c.query(`insert into billing.product_offers (product_id, key, currency, unit_amount) values ($1,'lifetime','usd',5000)`, [productId]);
  await record({ p_event_id: 'evt_life', p_org_id: orgId, p_event_type: 'purchase', p_product_code: 'demo', p_offer_key: 'lifetime', p_scope: 'proj-l', p_kind: 'purchase', p_amount: 5000, p_external_checkout_id: 'cs_l' });
  const g = await grant(orgId, 'proj-l');
  assert.equal(g.status, 'active');
  assert.equal(g.expires_at, null, '無期限は expires_at NULL');
});

test('通貨: 大文字や3字以外は CHECK で拒否される（台帳の通貨健全性）', async () => {
  const { orgId } = await fixtures();
  await c.query('savepoint sp');
  let rejected = false;
  try {
    await record({ p_event_id: 'evt_cur', p_org_id: orgId, p_event_type: 'purchase', p_product_code: 'demo', p_offer_key: 'launch_pass', p_scope: 'proj-cur', p_kind: 'purchase', p_currency: 'USD', p_external_checkout_id: 'cs_cur' });
  } catch (e) {
    rejected = e.code === '23514';
    await c.query('rollback to savepoint sp');
  }
  assert.ok(rejected, '大文字通貨は CHECK 違反');
});

const count = async (sql) => Number((await c.query(sql)).rows[0].n);
