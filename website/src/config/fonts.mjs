// フォント定義の正本。family / weight / subset をここに集約し、site（astro.config）・メール（lib/email.ts）・
// プリビルド画像（scripts/og.mjs・email-logo.mjs）が全てここから導出する＝family 名や weight を各所に直書きしない。
//
// 棲み分け:
// - site は astro:fonts で self-host し、到着までのズレを抑える metric 最適化フォールバック
//   （"Inter Fallback" 等＝global.css の @font-face）を別途使う（レンダリング最適化で別管理）。
// - メールは self-host 不可なので web フォントを <head> の Google Fonts で読み、未対応メーラーは
//   下の system フォールバックへ落とす。
// .mjs にしているのは node 実行のプリビルドスクリプトからも import するため（TS 側は allowJs で型推論）。

// weights / subsets は astro:fonts の型（非空タプル）に合わせて JSDoc で明示する。
export const INTER = {
  family: 'Inter',
  cssVariable: '--font-inter',
  weights: /** @type {[number, ...number[]]} */ ([400, 500, 600]),
  subsets: /** @type {[string, ...string[]]} */ (['latin']),
};
export const NOTO_SANS_JP = {
  family: 'Noto Sans JP',
  cssVariable: '--font-noto-jp',
  weights: /** @type {[number, ...number[]]} */ ([400, 500, 600]),
};
export const JETBRAINS_MONO = {
  family: 'JetBrains Mono',
  cssVariable: '--font-jetbrains-mono',
  weights: /** @type {[number, ...number[]]} */ ([400, 600]),
  subsets: /** @type {[string, ...string[]]} */ (['latin']),
};

// メール本文の system フォールバック（<head> の web フォントを剥がすメーラー向け＝Times 化を防ぐ）。
export const MAIL_SANS_FALLBACK = ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Hiragino Sans', 'Meiryo', 'sans-serif'];

// 空白を含む family のみクォートして CSS の font-family 値に連結する。
export const cssFontFamily = (families) => families.map((f) => (/\s/.test(f) ? `'${f}'` : f)).join(',');

// Google Fonts css2 の URL（メール <head> の <link>）。family と weights から組む。
export const googleFontsCss2 = (fonts) =>
  'https://fonts.googleapis.com/css2?' +
  fonts.map((f) => `family=${f.family.replace(/ /g, '+')}:wght@${f.weights.join(';')}`).join('&') +
  '&display=swap';
