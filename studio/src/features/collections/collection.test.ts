import { describe, it, expect } from 'vitest';
import { asString, asChildren } from '@/features/collections/collection';

describe('asString', () => {
  it('文字列はそのまま', () => expect(asString('x')).toBe('x'));
  it('null/undefined は空文字', () => {
    expect(asString(null)).toBe('');
    expect(asString(undefined)).toBe('');
  });
  it('その他は String 化', () => {
    expect(asString(42)).toBe('42');
    expect(asString(true)).toBe('true');
  });
});

describe('asChildren', () => {
  it('配列はそのまま返す', () => expect(asChildren([{ a: 1 }])).toEqual([{ a: 1 }]));
  it('配列でなければ空配列', () => {
    expect(asChildren(null)).toEqual([]);
    expect(asChildren('x')).toEqual([]);
    expect(asChildren({})).toEqual([]);
  });
});
