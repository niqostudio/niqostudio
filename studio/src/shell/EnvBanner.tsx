// 接続先が本番（リモート）のとき全画面共通で出す警告バナー。
// studio は service_role で接続先に全書き込みできるため、ローカル以外＝全て本番扱いで警告する（fail-safe）。
function remoteHost(): string | null {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' ? null : host;
  } catch {
    return null;
  }
}

export function EnvBanner() {
  const host = remoteHost();
  if (!host) return null;
  return (
    <div className="border-b border-error bg-error-soft px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-error print:hidden">
      本番に接続中（{host}）— 書き込みは本番データに反映されます
    </div>
  );
}
