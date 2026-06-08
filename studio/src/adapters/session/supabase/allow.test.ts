import { describe, it, expect, vi, afterEach } from 'vitest';
import { allowedEmails, isAllowed } from '@/adapters/session/supabase/allow';

afterEach(() => vi.unstubAllEnvs());

describe('allowedEmails', () => {
  it('空なら空配列', () => {
    vi.stubEnv('STUDIO_ALLOWED_EMAILS', '');
    expect(allowedEmails()).toEqual([]);
  });

  it('カンマ分割し trim・小文字化・空要素除去', () => {
    vi.stubEnv('STUDIO_ALLOWED_EMAILS', ' A@x.com , b@x.com ,, ');
    expect(allowedEmails()).toEqual(['a@x.com', 'b@x.com']);
  });
});

describe('isAllowed', () => {
  it('未設定なら全拒否（安全側）', () => {
    vi.stubEnv('STUDIO_ALLOWED_EMAILS', '');
    expect(isAllowed('a@x.com')).toBe(false);
  });

  it('大文字小文字を無視して一致を判定', () => {
    vi.stubEnv('STUDIO_ALLOWED_EMAILS', 'dev@niqostudio.local');
    expect(isAllowed('DEV@niqostudio.local')).toBe(true);
    expect(isAllowed('other@x.com')).toBe(false);
  });

  it('null/undefined/空は false', () => {
    vi.stubEnv('STUDIO_ALLOWED_EMAILS', 'a@x.com');
    expect(isAllowed(null)).toBe(false);
    expect(isAllowed(undefined)).toBe(false);
    expect(isAllowed('')).toBe(false);
  });
});
