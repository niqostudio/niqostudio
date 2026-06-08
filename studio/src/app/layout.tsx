import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import { AppShell } from '@/shell/AppShell';
import { Toaster } from '@/features/feedback';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// CJK は unicode-range 分割が無く preload に不向きなので preload:false。
const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-jp',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'ダッシュボード - NIQO STUDIO',
  description: 'NIQO STUDIO の業務システム',
};

// 描画前にテーマを適用して FOUC を防ぐ（保存値→無ければ OS 設定）。
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="neutral" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
