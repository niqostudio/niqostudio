-- 問い合わせ INSERT 専用の最小権限ロール（Worker 経由のみ書き込ませる B 方式）。
-- Worker は role: inquiry_writer を名乗る JWT を Bearer に載せて INSERT する。漏洩時の影響は
-- 「inquiries への INSERT のみ」に限定される（service_role/secret key の全 DB アクセスと異なる）。
-- このファイルは anon を一切触らない＝適用してもフォームは無停止（anon も従来どおり INSERT 可）。
-- anon の剥奪は website が JWT 経路に切替わった後、別マイグレーション(phase 2)で行う。

-- ロールは cluster 全体に残るため db reset の再適用で二重作成しないよう存在チェックする。
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inquiry_writer') THEN
    CREATE ROLE inquiry_writer NOLOGIN NOINHERIT;
  END IF;
END $$;

-- PostgREST(authenticator) が JWT の role クレームへ SET ROLE できるようにする。
GRANT inquiry_writer TO authenticator;
GRANT USAGE ON SCHEMA public TO inquiry_writer;
-- 公開フィールドのみ INSERT 可（status / internal_notes / converted_client_id は付与しない）。
GRANT INSERT (name, company, email, subject, message) ON public.inquiries TO inquiry_writer;

-- DB 層の不変条件。旧 inquiries_anon_insert の WITH CHECK(true) 指摘も、この経路では解消する。
CREATE POLICY inquiries_writer_insert ON public.inquiries
  FOR INSERT TO inquiry_writer WITH CHECK (
    char_length(name) BETWEEN 1 AND 100
    AND char_length(email) <= 254 AND position('@' IN email) > 1
    AND char_length(message) BETWEEN 1 AND 5000
    AND (company IS NULL OR char_length(company) <= 100)
    AND (subject IS NULL OR char_length(subject) <= 200)
  );
