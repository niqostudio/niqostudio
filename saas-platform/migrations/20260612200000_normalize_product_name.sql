-- migrate:up

-- メールの文面・件名に出す製品表示名はマスタ（identity.products.name＝core.products.name の射影）を正とする。
-- クライアントが signUp metadata で渡す product_name は信頼の根拠にせず、行の値は挿入時にマスタへ正規化する
-- （改竄と、製品の改名後に古いクライアントが旧名を書き続けるドリフトを防ぐ）。

CREATE FUNCTION identity.normalize_signup_product_name() RETURNS trigger
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
  end if;
  return new;
end$$;

REVOKE ALL ON FUNCTION identity.normalize_signup_product_name() FROM public;

CREATE TRIGGER normalize_signup_product_name BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION identity.normalize_signup_product_name();

-- migrate:down
