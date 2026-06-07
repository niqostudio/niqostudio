-- studio 自前 store の開発用シード（完全フィクション）。冪等（再適用で上書き）。
-- overlay（意味）と下書きのダミーを入れる。tenant は INSTANCE_ID（niqostudio）。
-- 構造は core から live なので、ここは「意味」だけ（ラベル・種別精緻化・子グルーピング・title/status）。

-- overlay は studio.records に予約 collection __semantics__ で相乗り。行 id は collection 名からの決定的 uuid
-- （adapters/studio-store/overlay-store.ts の nameUuid と一致：sha1 hex を version=5/variant=8 で uuid 体裁に整形）。
insert into studio.records (id, tenant_id, collection, source_id, fields, draft_state)
select
  (substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-5' || substr(h, 14, 3)
    || '-8' || substr(h, 18, 3) || '-' || substr(h, 21, 12))::uuid,
  'niqostudio', '__semantics__', null, c.fields, 'published'
from (
  values
    ('projects', '{
      "titleField": "title",
      "statusField": "status",
      "fields": {
        "title": {"label": "案件名"},
        "status": {"label": "ステータス", "optionLabels": {"consultation": "無料相談", "discovery": "事前設計", "active": "進行中", "delivered": "納品済", "closed": "クローズ"}},
        "client_id": {"label": "顧客", "hidden": true},
        "service_id": {"label": "提供サービス", "kind": "reference"},
        "started_on": {"label": "開始日", "kind": "date"},
        "ended_on": {"label": "終了日", "kind": "date"},
        "tech_stack": {"label": "技術スタック", "kind": "list"},
        "testimonial": {"label": "顧客の声"},
        "scope": {"label": "スコープ(旧)", "hidden": true},
        "internal_notes": {"label": "内部メモ", "kind": "textarea"}
      },
      "children": {
        "requirements": {"label": "要望", "fields": {"content": {"label": "内容"}, "note": {"label": "メモ"}}},
        "problems": {"label": "課題→対応→結果", "fields": {"problem": {"label": "課題", "kind": "textarea"}, "solution": {"label": "対応", "kind": "textarea"}, "outcome": {"label": "結果", "kind": "textarea"}}},
        "scope_items": {"label": "スコープ", "fields": {"item": {"label": "項目"}, "included": {"label": "含む", "kind": "boolean"}, "note": {"label": "メモ"}}},
        "project_decisions": {"label": "設計判断", "fields": {"topic": {"label": "論点"}, "decision": {"label": "決定"}, "rationale": {"label": "理由", "kind": "textarea"}}},
        "deliverables": {"label": "成果物", "fields": {"name": {"label": "名称"}, "description": {"label": "説明", "kind": "textarea"}, "url": {"label": "URL"}}},
        "metrics": {"label": "数値", "fields": {"label": {"label": "指標"}, "achieved": {"label": "実績"}, "previous": {"label": "以前"}, "unit": {"label": "単位"}}}
      }
    }'::jsonb),
    ('clients', '{
      "titleField": "public_name",
      "fields": {
        "slug": {"label": "slug"},
        "public_name": {"label": "公開名"},
        "real_name": {"label": "実名"},
        "is_public_name_allowed": {"label": "公開名の使用可", "kind": "boolean"},
        "industry": {"label": "業種"},
        "size": {"label": "規模"},
        "description": {"label": "説明", "kind": "textarea"},
        "logo_url": {"label": "ロゴ URL"},
        "website_url": {"label": "サイト URL"},
        "first_contact_date": {"label": "初回接触日", "kind": "date"},
        "internal_notes": {"label": "内部メモ", "kind": "textarea"}
      }
    }'::jsonb),
    ('inquiries', '{
      "titleField": "name",
      "statusField": "status",
      "fields": {
        "name": {"label": "名前"},
        "company": {"label": "会社"},
        "email": {"label": "メール"},
        "subject": {"label": "件名"},
        "message": {"label": "本文", "kind": "textarea"},
        "status": {"label": "ステータス"},
        "internal_notes": {"label": "内部メモ", "kind": "textarea"},
        "delivery_status": {"label": "配信状態"},
        "converted_client_id": {"label": "成約先（顧客）"},
        "auto_reply_id": {"label": "自動返信 ID", "hidden": true}
      }
    }'::jsonb)
) as c(collection, fields)
cross join lateral (
  select encode(extensions.digest('__semantics__:niqostudio:' || c.collection, 'sha1'), 'hex') as h
) d
on conflict (id) do update set fields = excluded.fields, draft_state = excluded.draft_state;

-- 下書きのダミー（core 未反映＝publish 前）。/projects の「新規下書き」に出る。
insert into studio.records (id, tenant_id, collection, source_id, fields, draft_state)
values (
  '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a01',
  'niqostudio', 'projects', null,
  '{"title": "無料相談から起票した案件", "internal_notes": "相談メモ。要件は未確定。", "tech_stack": []}'::jsonb,
  'draft'
)
on conflict (id) do update set fields = excluded.fields, draft_state = excluded.draft_state;
