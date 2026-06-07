-- projects を「有期の取り組み」として締める。product（継続）との関係を1方向で張る：
-- product に有期 project がぶら下がる（自社製品開発の発足など）＝projects.product_id。
-- client 案件は product_id null・client_id 有り。両者は排他にしない（緩く保つ）。

ALTER TABLE core.projects
  ADD COLUMN product_id uuid REFERENCES core.products(id) ON DELETE SET NULL,
  ADD COLUMN due_on date,  -- 計画上の終了（有期性の明示）。実終了は ended_on。
  ADD CONSTRAINT projects_date_order_check
    CHECK (ended_on IS NULL OR started_on IS NULL OR ended_on >= started_on);
CREATE INDEX idx_projects_product ON core.projects(product_id);
