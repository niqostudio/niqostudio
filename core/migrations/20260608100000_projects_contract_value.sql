-- migrate:up
-- 案件の受注額（見込み〜確定の金額）。内部情報＝公開 view には出さない（anon には漏れない）。
-- JPY 想定で integer（小数なし）。未確定の段階は NULL 可。
alter table core.projects
  add column contract_value integer,
  add constraint projects_contract_value_check check (contract_value >= 0);

-- migrate:down
alter table core.projects
  drop constraint projects_contract_value_check,
  drop column contract_value;
