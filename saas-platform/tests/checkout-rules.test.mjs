// checkout バリデーション（origin 允許・scope×offer 整合・Authorization 分類）のテスト。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originAllowed, checkScopeOffer, classifyAuthToken } from '../functions/_shared/checkout-rules.mjs';

const allow = { 'demo-app': ['https://demo-app.example', 'http://localhost:3000'] };

test('origin 允許: 登録済みは true・パスやクエリ違いでも origin 一致なら通す', () => {
  assert.equal(originAllowed(allow, 'demo-app', 'https://demo-app.example/success?x=1'), true);
  assert.equal(originAllowed(allow, 'demo-app', 'http://localhost:3000/return'), true);
});

test('origin 允許: 未登録 origin / 別製品 / 不正 URL は拒否', () => {
  assert.equal(originAllowed(allow, 'demo-app', 'https://evil.example/success'), false, '未登録');
  assert.equal(originAllowed(allow, 'other', 'https://demo-app.example/s'), false, '別製品');
  assert.equal(originAllowed(allow, 'demo-app', 'not-a-url'), false, '不正 URL');
  assert.equal(originAllowed({}, 'demo-app', 'https://demo-app.example/s'), false, 'マップ空');
  // http/https・サブドメイン違いは別 origin
  assert.equal(originAllowed(allow, 'demo-app', 'http://demo-app.example/s'), false, 'scheme 違い');
  assert.equal(originAllowed(allow, 'demo-app', 'https://sub.demo-app.example/s'), false, 'サブドメイン違い');
});

test('scope×offer 整合: サブスクに scope 付きは拒否', () => {
  assert.equal(checkScopeOffer(true, 'proj-a'), 'scope_not_allowed_for_subscription');
  assert.equal(checkScopeOffer(true, null), null, 'サブスク＋scope無 は OK');
});

test('scope×offer 整合: 一回課金に scope 欠落は拒否', () => {
  assert.equal(checkScopeOffer(false, null), 'scope_required_for_one_shot');
  assert.equal(checkScopeOffer(false, 'proj-a'), null, '一回課金＋scope有 は OK');
});

// JWT 形状のテストトークン（署名はダミー。分類は payload の role だけを見る）。
const jwt = (payload) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;

test('Authorization 分類: 無し→none / api キー形状→apikey（匿名扱い）', () => {
  assert.equal(classifyAuthToken(null), 'none');
  assert.equal(classifyAuthToken(''), 'none');
  assert.equal(classifyAuthToken('sb_publishable_abc123'), 'apikey', '新形式 publishable キー');
  assert.equal(classifyAuthToken('sb_secret_abc123'), 'apikey');
  assert.equal(classifyAuthToken(jwt({ role: 'anon' })), 'apikey', 'legacy anon キー（JWT）');
  assert.equal(classifyAuthToken(jwt({ role: 'service_role' })), 'apikey');
});

test('Authorization 分類: user JWT・不明形状→user（検証対象＝失敗は 401 に到達させる）', () => {
  assert.equal(classifyAuthToken(jwt({ role: 'authenticated', sub: 'u1' })), 'user');
  assert.equal(classifyAuthToken('garbage-token'), 'user', '不明形状は匿名に落とさず検証で 401');
  assert.equal(classifyAuthToken('a.broken.jwt'), 'user', 'payload 不読も検証に回す');
});
