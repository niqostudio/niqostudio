'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// ライト/ダーク切替。html.dark を付け外しして localStorage に保存する。
// 初期適用は layout の inline script（描画前に実行＝FOUC 回避）。
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* localStorage 不可でも切替自体は効く */
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? 'ライトに切替' : 'ダークに切替'}
      className="text-muted transition-colors hover:text-accent"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
