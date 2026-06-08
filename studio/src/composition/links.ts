// この instance（テナント）の外部コンソール/クイックリンク。
// 取得元は接続先や repo の実装に依存させず、ここ（composition＝テナント設定）で受ける。
export interface QuickLink {
  label: string;
  href: string;
}

export const QUICK_LINKS: QuickLink[] = [
  { label: '公開サイト', href: 'https://niqostudio.com' },
  { label: 'GitHub', href: 'https://github.com/niqostudio/niqostudio' },
  { label: 'Supabase', href: 'https://supabase.com/dashboard' },
  { label: 'Cloudflare', href: 'https://dash.cloudflare.com' },
  { label: 'Resend', href: 'https://resend.com/overview' },
];
