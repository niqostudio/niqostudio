-- 自動返信（顧客宛）の到達状況を Resend webhook で追跡する。CRM 用の status（new/responded…）とは
-- 別概念のため delivery_status を分けて持つ。auto_reply_id は webhook イベントと行を相関させる Resend の email id。
ALTER TABLE public.inquiries
  ADD COLUMN auto_reply_id text,
  ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending'
    CONSTRAINT inquiries_delivery_status_check CHECK (delivery_status IN ('pending', 'delivered', 'bounced'));

-- 自動返信を先に送って得た email id を INSERT 時に格納するため、inquiry_writer に列を追加付与する。
GRANT INSERT (auto_reply_id) ON public.inquiries TO inquiry_writer;

-- webhook 用の最小権限ロール: 通知に要る列の SELECT と delivery_status の UPDATE のみ。
-- 漏洩時の影響は inquiries の閲覧と到達状況の書換えに限定（INSERT も他テーブルも不可）。
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inquiry_reader') THEN
    CREATE ROLE inquiry_reader NOLOGIN NOINHERIT;
  END IF;
END $$;

GRANT inquiry_reader TO authenticator;
GRANT USAGE ON SCHEMA public TO inquiry_reader;
-- internal_notes / converted_client_id は通知に不要なので渡さない（列単位 SELECT）。
GRANT SELECT (id, name, company, email, subject, message, auto_reply_id, delivery_status)
  ON public.inquiries TO inquiry_reader;
GRANT UPDATE (delivery_status) ON public.inquiries TO inquiry_reader;

CREATE POLICY inquiries_reader_select ON public.inquiries
  FOR SELECT TO inquiry_reader USING (true);

CREATE POLICY inquiries_reader_update ON public.inquiries
  FOR UPDATE TO inquiry_reader USING (true)
  WITH CHECK (delivery_status IN ('pending', 'delivered', 'bounced'));
