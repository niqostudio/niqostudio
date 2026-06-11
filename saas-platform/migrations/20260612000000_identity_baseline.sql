-- migrate:up

CREATE SCHEMA IF NOT EXISTS identity;


-- Name: set_updated_at(); Type: FUNCTION; Schema: identity

CREATE FUNCTION identity.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
begin
  new.updated_at = now();
  return new;
end$$;


-- auth.users と 1:1 のプロフィール。auth スキーマを他テーブルから直接参照させない緩衝層。

CREATE TABLE identity.users (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON identity.users
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();


-- テナントの単位。製品側は常に organization_id をテナントキーとして扱う
-- （個人利用はサインアップ時に自動作成される個人 org＝is_personal で表現し、個人/チームの分岐を製品に持ち込まない）。

CREATE TABLE identity.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_personal boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON identity.organizations
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();


CREATE TABLE identity.memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES identity.organizations (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES identity.users (id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX memberships_user_id_idx ON identity.memberships (user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON identity.memberships
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();


-- 製品マスタ。grants の参照先・サインアップ時の製品コード解決・studio 表示に使う。
-- 行の管理は service_role（studio / コンソール）。

CREATE TABLE identity.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON identity.products
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();


-- 利用権：org がその製品をどの範囲・期限で使えるか。書き込みは service_role のみ（課金・管理側の操作）。
-- サブスクも一回課金も同じ行で表す（scope=NULL は org 全体／値ありは対象束縛、expires_at=NULL は無期限）。
-- 有効判定は「status=active かつ 未失効 かつ scope が対象を覆う」。

CREATE TABLE identity.product_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES identity.organizations (id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES identity.products (id),
    plan text NOT NULL DEFAULT 'free',
    scope text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- org 全体の grant は製品ごとに1行。scope 付きは対象ごとに1行（再購入は upsert で expires_at を延長し、
-- 行を増やさない＝grants は現在の authz 状態。購入履歴は課金側の ledger に持たせ、ここに積まない）。
CREATE UNIQUE INDEX product_grants_org_wide_key ON identity.product_grants (organization_id, product_id)
    WHERE scope IS NULL;
CREATE UNIQUE INDEX product_grants_scoped_key ON identity.product_grants (organization_id, product_id, scope)
    WHERE scope IS NOT NULL;
-- partial unique は scope 条件を含まないクエリ（RLS の org 絞り込み・一覧）に使えないため汎用 index も持つ。
CREATE INDEX product_grants_org_product_idx ON identity.product_grants (organization_id, product_id);
CREATE INDEX product_grants_product_id_idx ON identity.product_grants (product_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON identity.product_grants
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();


-- RLS の policy が memberships を自己参照すると無限再帰になるため、所属 org は definer 関数で引く。

CREATE FUNCTION identity.member_org_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
    AS $$
  select organization_id from identity.memberships where user_id = (select auth.uid())
$$;

CREATE FUNCTION identity.owner_org_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
    AS $$
  select organization_id from identity.memberships where user_id = (select auth.uid()) and role = 'owner'
$$;

REVOKE ALL ON FUNCTION identity.member_org_ids() FROM public;
REVOKE ALL ON FUNCTION identity.owner_org_ids() FROM public;
GRANT EXECUTE ON FUNCTION identity.member_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION identity.owner_org_ids() TO authenticated;


-- サインアップ provisioning。製品フォームは signUp の metadata（product / display_name）を渡すだけで、
-- プロフィール・個人 org・membership・利用権までを DB 側で作る＝製品に secret を持たせないための要。

CREATE FUNCTION identity.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
declare
  org_id uuid;
  signup_name text;
begin
  signup_name := nullif(new.raw_user_meta_data ->> 'display_name', '');

  insert into identity.users (id, display_name) values (new.id, signup_name);

  insert into identity.organizations (name, is_personal)
  values (coalesce(signup_name, split_part(new.email, '@', 1)), true)
  returning id into org_id;

  insert into identity.memberships (organization_id, user_id, role)
  values (org_id, new.id, 'owner');

  -- 未知・停止中の製品コードは黙って無視する（provisioning の都合でサインアップ自体を落とさない）。
  insert into identity.product_grants (organization_id, product_id)
  select org_id, p.id
  from identity.products p
  where p.code = new.raw_user_meta_data ->> 'product' and p.status = 'active';

  return new;
end$$;

REVOKE ALL ON FUNCTION identity.handle_new_user() FROM public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION identity.handle_new_user();


-- GRANT / RLS。deny-all 既定の上で、authenticated は「自分の行」だけを明示的に開く。
-- authenticated への GRANT を identity スキーマに閉じることが、このプロジェクト全体の境界規約。

ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.product_grants ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA identity TO anon, authenticated, service_role;

-- 管理面（studio バックオフィス・課金処理）は service_role。新テーブルにも既定で付与する。
GRANT ALL ON ALL TABLES IN SCHEMA identity TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT ALL ON TABLES TO service_role;

GRANT SELECT ON identity.users TO authenticated;
GRANT UPDATE (display_name) ON identity.users TO authenticated;
GRANT SELECT ON identity.organizations TO authenticated;
GRANT UPDATE (name) ON identity.organizations TO authenticated;
GRANT SELECT ON identity.memberships TO authenticated;
GRANT SELECT ON identity.product_grants TO authenticated;
-- products は無害な公開マスタ（code / name）。anon にも開き keep-alive の実 DB ping 先を兼ねる。
GRANT SELECT ON identity.products TO anon, authenticated;

CREATE POLICY users_self_select ON identity.users
    FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY users_self_update ON identity.users
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY organizations_member_select ON identity.organizations
    FOR SELECT TO authenticated USING (id IN (SELECT identity.member_org_ids()));
CREATE POLICY organizations_owner_update ON identity.organizations
    FOR UPDATE TO authenticated
    USING (id IN (SELECT identity.owner_org_ids()))
    WITH CHECK (id IN (SELECT identity.owner_org_ids()));

CREATE POLICY memberships_member_select ON identity.memberships
    FOR SELECT TO authenticated USING (organization_id IN (SELECT identity.member_org_ids()));

CREATE POLICY products_active_select ON identity.products
    FOR SELECT TO anon, authenticated USING (status = 'active');

CREATE POLICY product_grants_member_select ON identity.product_grants
    FOR SELECT TO authenticated USING (organization_id IN (SELECT identity.member_org_ids()));

-- migrate:down
