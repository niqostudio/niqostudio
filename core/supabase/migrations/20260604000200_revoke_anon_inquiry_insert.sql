-- website が inquiry_writer JWT 経路に切替わり、本番で動作確認済みの後に適用する。
-- anon の直 INSERT を封鎖し、Worker(inquiry_writer) のみが inquiries に書ける状態にする。
-- これで publishable key の直叩き（Worker / Turnstile / レート制限の迂回）も塞がる。
DROP POLICY IF EXISTS inquiries_anon_insert ON public.inquiries;
REVOKE INSERT ON public.inquiries FROM anon;
