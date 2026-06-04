// 問い合わせ各フィールドの最大長。フォーム（maxlength）とサーバ検証（/api/contact）で共有する。
// DB の RLS CHECK（core の inquiry_writer migration）も同値だが、SQL は config を読めないため手動同期する。
export const INQUIRY_LIMITS = {
  name: 100,
  company: 100,
  email: 254,
  subject: 200,
  message: 5000,
} as const;

// フォーム文言（本文プレースホルダ・希望日程テンプレ）。正本は config.<env>.json（astro.config が inline 注入）。
export const INQUIRY_FORM = __INQUIRY_FORM__;
