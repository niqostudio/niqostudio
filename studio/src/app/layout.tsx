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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
