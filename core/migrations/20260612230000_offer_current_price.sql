-- migrate:up

-- 商品（offer）を「現行価格」モデルに畳む。改定履歴は反映先の Stripe（アーカイブ済み Price）が保持し、
-- 販売の事実は saas 側台帳（billing.purchases）が金額スナップショットで持つため、core に版を持つ実益がない。
-- version 列と不変トリガを廃止し、改定は行の直接 UPDATE（sync が Stripe へ新 Price として反映・
-- lookup key <slug>_<key> は transfer_lookup_key で引き継ぐ）。

drop trigger enforce_product_offer_immutability on core.product_offers;
drop function core.enforce_product_offer_immutability();

-- version 列の削除で (product_id, key, version) UNIQUE も連動して落ちる。
alter table core.product_offers drop column version;

-- offer は (product, key) で常に1行（is_active は販売停止フラグとして残す）。
drop index core.product_offers_active_key;
alter table core.product_offers add unique (product_id, key);

-- migrate:down
