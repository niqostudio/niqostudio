// checkout バリデーション（origin 允許・scope×offer 整合）のテスト。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originAllowed, checkScopeOffer } from '../functions/_shared/checkout-rules.mjs';

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
