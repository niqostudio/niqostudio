-- migrate:up

-- product_name は表示用だが auth メールの件名・本文に出るため、クライアント値を素通しさせない。
-- マスタ解決に成功したときだけマスタ名を入れ、失敗時は product_name を**除去**する
-- （第三者メールでサインアップし任意文字列を product_name に入れて NIQO STUDIO 名義の正規メールへ
-- 載せるフィッシング増幅を塞ぐ）。挿入時に必ず通る正規化なので、これでクライアント値は信頼経路に乗らない。
CREATE OR REPLACE FUNCTION identity.normalize_signup_product_name() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
declare
  master_name text;
begin
  select p.name into master_name
  from identity.products p
  where p.code = new.raw_user_meta_data ->> 'product' and p.status = 'active';

  if master_name is not null then
    new.raw_user_meta_data =
      jsonb_set(coalesce(new.raw_user_meta_data, '{}'::jsonb), '{product_name}', to_jsonb(master_name));
  else
    -- 未知・停止中の製品コード、または product 未指定。クライアントの product_name は破棄する。
    new.raw_user_meta_data = (coalesce(new.raw_user_meta_data, '{}'::jsonb)) - 'product_name';
  end if;
  return new;
end$$;

-- migrate:down
