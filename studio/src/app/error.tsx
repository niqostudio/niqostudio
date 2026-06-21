'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// サーバアクション/ページの未捕捉エラーの受け皿。ブラウザバックに頼らず再試行・ホームへ戻れる。
// AppShell（nav）の内側にレンダーされるので、nav からの遷移も併せて残る。
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-lg font-semibold">エラーが発生しました</p>
        <p className="max-w-xl whitespace-pre-wrap break-words text-sm text-muted">
          {error.message || '処理中に問題が発生しました。'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => reset()}>
          再試行
        </button>
        <Link href="/" className="btn btn-primary">
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}
