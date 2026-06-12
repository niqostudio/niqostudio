// 製品サイトの og:image をビルド時に取得する（プロダクトカードのサムネ）。
// 対象は自社プロダクトのサイト＝画像参照は自前資産。取得失敗・未設定は null で続行する
// （サイトのビルドを製品サイトの稼働に結合させない。core データの fail-fast とは性質が違う外部依存）。
export async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'text/html' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!match) return null;
    return new URL(match[1], pageUrl).href; // 相対指定も絶対 URL へ解決
  } catch {
    return null;
  }
}
