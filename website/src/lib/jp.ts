import { loadDefaultJapaneseParser } from 'budoux';

const parser = loadDefaultJapaneseParser();

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 日本語を文節に分かち書きし、境界へ <wbr>（改行可能点）を挿入した HTML を返す。
// ビルド時に静的 HTML へ焼き込むためクライアント JS は不要。
// word-break: keep-all と併用し、<wbr> の位置だけで折り返す。
export function jpHtml(text: string): string {
  return parser.parse(text).map(escapeHtml).join('<wbr>');
}

// 句点（。）ごとに改行する版。各文は分かち書きしたうえで <br> で区切る。
export function jpHtmlByPeriod(text: string): string {
  const sentences = text.match(/[^。]+。?/g) ?? [text];
  return sentences.map((s) => parser.parse(s).map(escapeHtml).join('<wbr>')).join('<br>');
}
