-- migrate:up

-- 商品（offer）を「現行価格」モデルに畳む（core 側 offer_current_price と対）。
-- 版の概念を落とし、射影は (product, key) ごとに現行価格1行。台帳の価格事実は amount / currency が持つ。

-- version 列の削除で (product_id, key, version) UNIQUE も連動して落ちる。
alter table billing.product_offers drop column version;
drop index billing.product_offers_active_key;
alter table billing.product_offers add unique (product_id, key);

-- 台帳の版スナップショットを廃止（どの価格で買ったかは amount / currency で残る）。
alter table billing.purchases drop column offer_version;

-- record_event から p_offer_version を外す（引数構成が変わるため作り直し）。
DROP FUNCTION billing.record_event(
    text, text, text, timestamptz, uuid, text, text, text, integer, text, text,
    integer, text, text, text, text, timestamptz, uuid);

-- 決済イベントの反映（webhook の核）。冪等・原子・順序ガードを SQL 内で完結させ、Edge Function は
-- 署名検証とイベント正規化に徹する。1 イベント＝1 呼び出し＝（provider_events 記録 → purchases 台帳
-- append → grants 再計算）を1トランザクションで。同一イベント再処理は no-op を返す。
--
-- kind: purchase / renewal は付与（active・期限延長）、refund / chargeback / dispute は失効（suspend）。
-- 一回課金（p_scope 非 NULL かつ p_period_end NULL）は決済時刻+access_period_days を期限にする
-- （access_period_days NULL=無期限）。サブスク（p_scope NULL）は p_period_end を期限にする。
CREATE FUNCTION billing.record_event(
    p_provider text,
    p_event_id text,
    p_event_type text,
    p_event_at timestamptz,
    p_org_id uuid,
    p_customer_email text,
    p_product_code text,
    p_offer_key text,
    p_scope text,
    p_kind text,
    p_amount integer,
    p_currency text,
    p_external_checkout_id text DEFAULT NULL,
    p_external_payment_id text DEFAULT NULL,
    p_external_invoice_id text DEFAULT NULL,
    p_period_end timestamptz DEFAULT NULL,
    p_parent_id uuid DEFAULT NULL
) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
declare
  v_product_id uuid;
  v_access_days integer;
  v_expires_at timestamptz;
  v_new_status text;
  v_inserted integer;
begin
  -- 冪等：イベントを記録。既処理なら no-op で返す。
  insert into billing.provider_events (provider, event_id, type, provider_created_at)
  values (p_provider, p_event_id, p_event_type, p_event_at)
  on conflict (provider, event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    if exists (select 1 from billing.provider_events
               where provider = p_provider and event_id = p_event_id and processed_at is not null) then
      return 'duplicate';
    end if;
  end if;

  select id into v_product_id from identity.products where code = p_product_code;
  if v_product_id is null then
    update billing.provider_events set processed_at = now()
    where provider = p_provider and event_id = p_event_id;
    return 'unknown_product';
  end if;

  -- 台帳 append（冪等：同一イベントの再処理で二重計上しない）。
  insert into billing.purchases
    (organization_id, customer_email, product_id, offer_key, scope, kind, parent_id,
     provider, external_checkout_id, external_payment_id, external_invoice_id, source_event_id, amount, currency)
  values
    (p_org_id, p_customer_email, v_product_id, p_offer_key, p_scope, p_kind, p_parent_id,
     p_provider, p_external_checkout_id, p_external_payment_id, p_external_invoice_id, p_event_id, p_amount, p_currency)
  on conflict (provider, source_event_id) do nothing;

  -- grants 再計算（org 未確定＝匿名 claim 前は grants を触らない＝レシートで解錠）。
  if p_org_id is not null then
    if p_kind in ('purchase', 'renewal') then
      v_new_status := 'active';
      if p_scope is not null and p_period_end is null then
        select access_period_days into v_access_days
        from billing.product_offers
        where product_id = v_product_id and key = p_offer_key and is_active;
        -- 付与窓は「決済時刻（p_event_at）＋日数」。webhook 処理時刻（now）でなくイベント時刻基準にして、
        -- 処理遅延・リトライに左右されず決定的にする（再購入は新しい event_at で延長される）。
        v_expires_at := case when v_access_days is null then null else p_event_at + make_interval(days => v_access_days) end;
      else
        v_expires_at := p_period_end;
      end if;
    else
      v_new_status := 'suspended';
      v_expires_at := null;
    end if;

    -- scope の有無で対応する partial unique が違うため、分岐して単一 upsert にする。
    -- 順序ガード：自分より新しいイベントが既に反映済みなら上書きしない。
    if p_scope is null then
      insert into identity.product_grants
        (organization_id, product_id, plan, scope, status, expires_at, provider_synced_at)
      values (p_org_id, v_product_id, p_offer_key, null, v_new_status, v_expires_at, p_event_at)
      on conflict (organization_id, product_id) where scope is null
      do update set
        plan = excluded.plan, status = excluded.status, expires_at = excluded.expires_at,
        provider_synced_at = excluded.provider_synced_at
      where identity.product_grants.provider_synced_at is null
         or identity.product_grants.provider_synced_at < excluded.provider_synced_at;
    else
      insert into identity.product_grants
        (organization_id, product_id, plan, scope, status, expires_at, provider_synced_at)
      values (p_org_id, v_product_id, p_offer_key, p_scope, v_new_status, v_expires_at, p_event_at)
      on conflict (organization_id, product_id, scope) where scope is not null
      do update set
        plan = excluded.plan, status = excluded.status, expires_at = excluded.expires_at,
        provider_synced_at = excluded.provider_synced_at
      where identity.product_grants.provider_synced_at is null
         or identity.product_grants.provider_synced_at < excluded.provider_synced_at;
    end if;
  end if;

  update billing.provider_events set processed_at = now()
  where provider = p_provider and event_id = p_event_id;
  return 'applied';
end$$;

REVOKE ALL ON FUNCTION billing.record_event FROM public;
GRANT EXECUTE ON FUNCTION billing.record_event TO service_role;

-- migrate:down
