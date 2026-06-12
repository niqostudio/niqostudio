// identity スキーマの RLS / GRANT 不変条件のテスト（node:test ＋ pg・ゼロ依存）。
// ローカル saas スタックに対して実行する：`pnpm saas:start` → `pnpm saas:reset` → `pnpm saas:test`。
//
// 各テストはトランザクション内で auth.users に直接 INSERT（＝provisioning トリガを発火）し、
// `set local role authenticated` ＋ request.jwt.claims でユーザーを偽装して、anon / 別ユーザーの
// 視点で SELECT / INSERT / UPDATE / DELETE の可否を確認する。最後に必ず ROLLBACK（DB を汚さない）。
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
after(async () => {
  await c.end();
});
beforeEach(() => c.query('begin'));
afterEach(() => c.query('rollback'));

// auth.users へ INSERT（トリガが users/org/membership/grant を作る）→ uid と org を返す。
async function signup(email, product) {
  const meta = product ? `'{"product":"${product}"}'` : `'{}'`;
  const {
    rows: [u],
  } = await c.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values (gen_random_uuid(), $1, ${meta}) returning id`,
    [email],
  );
  const {
    rows: [m],
  } = await c.query('select organization_id from identity.memberships where user_id = $1', [u.id]);
  return { uid: u.id, orgId: m.organization_id };
}

// authenticated ロール＋JWT claims でユーザーを偽装して関数を実行する。
// ロール/claims はトランザクションローカル（set local / set_config is_local=true）なので、
// 後始末は reset role ＋ claims クリアのみ。データ書き込みは巻き戻さない（検証に使うため）。
async function asUser(uid, fn) {
  await c.query(
    `select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`,
    [uid],
  );
  await c.query('set local role authenticated');
  try {
    return await fn();
  } finally {
    await c.query('reset role');
    await c.query(`select set_config('request.jwt.claims', '', true)`);
  }
}

async function asAnon(fn) {
  await c.query('set local role anon');
  try {
    return await fn();
  } finally {
    await c.query('reset role');
  }
}

const count = async (sql, params) => Number((await c.query(sql, params)).rows[0].n);
// 失敗時は PG トランザクションが中断するため、セーブポイントで包んで巻き戻す。
async function denied(sql, params, code) {
  await c.query('savepoint probe');
  try {
    await c.query(sql, params);
    await c.query('release savepoint probe');
    return false;
  } catch (e) {
    await c.query('rollback to savepoint probe');
    return code ? e.code === code : true;
  }
}

test('provisioning: signup でプロフィール・個人 org・owner membership が作られる', async () => {
  const { uid, orgId } = await signup('prov@example.com');
  assert.equal(await count('select count(*)::int n from identity.users where id=$1', [uid]), 1);
  const {
    rows: [org],
  } = await c.query('select is_personal from identity.organizations where id=$1', [orgId]);
  assert.equal(org.is_personal, true);
  assert.equal(
    await count(`select count(*)::int n from identity.memberships where user_id=$1 and role='owner'`, [uid]),
    1,
  );
});

test('anon: active な products は見え inactive は隠れる・他テーブルは全拒否', async () => {
  await c.query(`insert into identity.products (code, name) values ('p-active','A')`);
  await c.query(`insert into identity.products (code, name, status) values ('p-inactive','B','inactive')`);
  await asAnon(async () => {
    // seed 件数に依存せず「active は見える / inactive は見えない」という性質で検証する。
    assert.equal(await count(`select count(*)::int n from identity.products where code='p-active'`), 1, 'active は可視');
    assert.equal(
      await count(`select count(*)::int n from identity.products where code='p-inactive'`),
      0,
      'inactive は不可視',
    );
    assert.equal(await count(`select count(*)::int n from identity.products where status<>'active'`), 0, '非 active は0件');
    for (const t of ['users', 'organizations', 'memberships', 'product_grants']) {
      assert.ok(await denied(`select * from identity.${t}`, [], '42501'), `${t} は anon 拒否`);
    }
  });
});

test('RLS: authenticated は自分の行のみ（別ユーザーは不可視）', async () => {
  const a = await signup('a@example.com');
  const b = await signup('b@example.com');
  await asUser(a.uid, async () => {
    assert.equal(await count('select count(*)::int n from identity.users'), 1, 'users=自分のみ');
    assert.equal(await count('select count(*)::int n from identity.organizations'), 1, 'org=所属のみ');
    assert.equal(await count('select count(*)::int n from identity.memberships'), 1, 'membership=所属のみ');
    // 別ユーザー B の id を指定しても見えない
    assert.equal(await count('select count(*)::int n from identity.users where id=$1', [b.uid]), 0);
    assert.equal(
      await count('select count(*)::int n from identity.organizations where id=$1', [b.orgId]),
      0,
      'B の org は不可視',
    );
  });
});

test('RLS: grants は自分の org のぶんだけ・他 org の grant は不可視', async () => {
  await c.query(`insert into identity.products (code, name) values ('demo','Demo')`);
  const a = await signup('ga@example.com', 'demo');
  const b = await signup('gb@example.com', 'demo');
  await asUser(a.uid, async () => {
    assert.equal(await count('select count(*)::int n from identity.product_grants'), 1, '自分の grant のみ');
    assert.equal(
      await count('select count(*)::int n from identity.product_grants where organization_id=$1', [b.orgId]),
      0,
      'B の grant は不可視',
    );
  });
});

test('GRANT: 自分の users.display_name / org.name は更新でき、実際に反映される', async () => {
  const a = await signup('upd@example.com');
  await asUser(a.uid, async () => {
    const u = await c.query(`update identity.users set display_name='X' where id=$1`, [a.uid]);
    assert.equal(u.rowCount, 1, 'users 自行 UPDATE は1行');
    const o = await c.query(`update identity.organizations set name='Y' where id=$1`, [a.orgId]);
    assert.equal(o.rowCount, 1, 'org（owner）UPDATE は1行');
  });
  // 反映確認（definer 視点・asUser はデータを巻き戻さない）
  assert.equal(
    (await c.query('select display_name from identity.users where id=$1', [a.uid])).rows[0].display_name,
    'X',
  );
  assert.equal((await c.query('select name from identity.organizations where id=$1', [a.orgId])).rows[0].name, 'Y');
});

test('RLS: 別ユーザーの行は UPDATE できない（0行・サイレント）', async () => {
  const a = await signup('victim@example.com');
  const b = await signup('attacker@example.com');
  await asUser(b.uid, async () => {
    // 列の GRANT はあるが RLS USING で対象行が見えない＝0行更新（エラーでなく無効果）。
    const u = await c.query(`update identity.users set display_name='HACKED' where id=$1`, [a.uid]);
    assert.equal(u.rowCount, 0, '他人の users は更新されない');
    const o = await c.query(`update identity.organizations set name='HACKED' where id=$1`, [a.orgId]);
    assert.equal(o.rowCount, 0, '他人の org は更新されない');
  });
  assert.notEqual(
    (await c.query('select display_name from identity.users where id=$1', [a.uid])).rows[0].display_name,
    'HACKED',
  );
});

test('権限昇格不可: membership 作成・role 変更・grant 書き込みは全拒否', async () => {
  await c.query(`insert into identity.products (code, name) values ('demo','Demo')`);
  const a = await signup('esc-a@example.com', 'demo');
  const b = await signup('esc-b@example.com', 'demo');
  await asUser(a.uid, async () => {
    // 自分を別 org に追加（テナント侵入）
    assert.ok(
      await denied(
        `insert into identity.memberships (organization_id, user_id, role) values ($1,$2,'owner')`,
        [b.orgId, a.uid],
        '42501',
      ),
      'membership INSERT 拒否',
    );
    // 自分の grant を勝手に作る
    assert.ok(
      await denied(
        `insert into identity.product_grants (organization_id, product_id)
         select $1, id from identity.products limit 1`,
        [a.orgId],
        '42501',
      ),
      'grant INSERT 拒否',
    );
    // 自分の行を削除
    assert.ok(await denied(`delete from identity.users where id=$1`, [a.uid], '42501'), 'users DELETE 拒否');
    // org 名以外（is_personal）を変える
    assert.ok(
      await denied(`update identity.organizations set is_personal=false where id=$1`, [a.orgId], '42501'),
      'org 非許可列 UPDATE 拒否',
    );
  });
});

test('境界: 新規テーブルは authenticated に既定で deny-all（default privileges）', async () => {
  await c.query('savepoint nt');
  await c.query('create table identity.__probe (id int)');
  await c.query('alter table identity.__probe enable row level security');
  const a = await signup('nt@example.com');
  await asUser(a.uid, async () => {
    assert.ok(await denied('select * from identity.__probe', [], '42501'), '新規テーブルは authenticated 拒否');
  });
  await c.query('rollback to savepoint nt');
});
