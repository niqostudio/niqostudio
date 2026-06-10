-- migrate:up
-- 公開事例の本文（Markdown）。一覧カードは summary（抜粋）、詳細ページは body_md（読み物）に役割分担。
alter table core.showcase_entries add column body_md text;

-- 公開 view に body_md を1列足して再作成（website 詳細ページが読む）。直近の定義に s.body_md を追加。
drop view if exists core.public_showcases;
create view core.public_showcases as
  select s.slug, s.title, s.summary, s.body_md, s.thumbnail_url, s.period, s.display_priority, s.project_id, s.product_id,
    case when s.product_id is not null then 'product'::text else 'project'::text end as subject_kind,
    coalesce(p.tech_stack, pr.tech_stack) as tech_stack,
    case when n.publish_testimonial then p.testimonial else null::jsonb end as testimonial,
    case when s.product_id is null and s.client_display = 'named'::text and c.is_public_name_allowed then c.public_name else null::text end as client_name,
    case when s.product_id is null and (s.client_display = any (array['named'::text, 'anonymized'::text])) then c.industry else null::text end as client_industry,
    case when s.product_id is not null or n.publish_problems then coalesce((
      select jsonb_agg(jsonb_build_object('problem', pr2.problem, 'solution', pr2.solution, 'outcome', pr2.outcome) order by sp.display_priority desc)
      from core.showcase_problems sp join core.problems pr2 on pr2.id = sp.problem_id
      where sp.showcase_id = s.id), '[]'::jsonb) else '[]'::jsonb end as problems,
    case when s.product_id is not null or n.publish_deliverables then coalesce((
      select jsonb_agg(jsonb_build_object('kind', d.kind, 'name', d.name, 'url', d.url, 'images', d.image_urls) order by sd.display_priority desc)
      from core.showcase_deliverables sd join core.deliverables d on d.id = sd.deliverable_id
      where sd.showcase_id = s.id), '[]'::jsonb) else '[]'::jsonb end as deliverables,
    case when s.product_id is not null or n.publish_metrics then coalesce((
      select jsonb_agg(jsonb_build_object('label', m.label, 'achieved', m.achieved, 'previous', m.previous, 'unit', m.unit, 'kind', m.kind) order by sm.display_priority desc)
      from core.showcase_metrics sm join core.metrics m on m.id = sm.metric_id
      where sm.showcase_id = s.id and m.achieved is not null), '[]'::jsonb) else '[]'::jsonb end as metrics
  from core.showcase_entries s
    left join core.projects p on p.id = s.project_id
    left join core.products pr on pr.id = s.product_id
    left join core.ndas n on n.project_id = p.id
    left join core.clients c on c.id = p.client_id
  where s.status = 'published'::text;
grant select on core.public_showcases to anon;
grant all on core.public_showcases to service_role;

-- migrate:down
drop view if exists core.public_showcases;
create view core.public_showcases as
  select s.slug, s.title, s.summary, s.thumbnail_url, s.period, s.display_priority, s.project_id, s.product_id,
    case when s.product_id is not null then 'product'::text else 'project'::text end as subject_kind,
    coalesce(p.tech_stack, pr.tech_stack) as tech_stack,
    case when n.publish_testimonial then p.testimonial else null::jsonb end as testimonial,
    case when s.product_id is null and s.client_display = 'named'::text and c.is_public_name_allowed then c.public_name else null::text end as client_name,
    case when s.product_id is null and (s.client_display = any (array['named'::text, 'anonymized'::text])) then c.industry else null::text end as client_industry,
    case when s.product_id is not null or n.publish_problems then coalesce((
      select jsonb_agg(jsonb_build_object('problem', pr2.problem, 'solution', pr2.solution, 'outcome', pr2.outcome) order by sp.display_priority desc)
      from core.showcase_problems sp join core.problems pr2 on pr2.id = sp.problem_id
      where sp.showcase_id = s.id), '[]'::jsonb) else '[]'::jsonb end as problems,
    case when s.product_id is not null or n.publish_deliverables then coalesce((
      select jsonb_agg(jsonb_build_object('kind', d.kind, 'name', d.name, 'url', d.url, 'images', d.image_urls) order by sd.display_priority desc)
      from core.showcase_deliverables sd join core.deliverables d on d.id = sd.deliverable_id
      where sd.showcase_id = s.id), '[]'::jsonb) else '[]'::jsonb end as deliverables,
    case when s.product_id is not null or n.publish_metrics then coalesce((
      select jsonb_agg(jsonb_build_object('label', m.label, 'achieved', m.achieved, 'previous', m.previous, 'unit', m.unit, 'kind', m.kind) order by sm.display_priority desc)
      from core.showcase_metrics sm join core.metrics m on m.id = sm.metric_id
      where sm.showcase_id = s.id and m.achieved is not null), '[]'::jsonb) else '[]'::jsonb end as metrics
  from core.showcase_entries s
    left join core.projects p on p.id = s.project_id
    left join core.products pr on pr.id = s.product_id
    left join core.ndas n on n.project_id = p.id
    left join core.clients c on c.id = p.client_id
  where s.status = 'published'::text;
grant select on core.public_showcases to anon;
grant all on core.public_showcases to service_role;
alter table core.showcase_entries drop column body_md;
