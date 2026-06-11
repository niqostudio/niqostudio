// 製品（別オリジン）から叩かれる公開エンドポイント用の CORS。
// 許可オリジンは呼び出し側で検証するため、ここは preflight を通すだけ（GET/POST のみ）。
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders, ...extra },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  return null;
}
