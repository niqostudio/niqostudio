# ADR 0006: 公開面を SECURITY DEFINER view に集約する

- ステータス: 採用
- 決定日: 2026-06-07

## 背景
公開サイト（`anon`）が読む core のデータは、公開してよい列・行だけに絞る必要がある（内部列 `real_name` / `internal_notes`、未公開 showcase、NDA で伏せる項目を出さない）。Supabase の Security Advisor は、公開 view が **SECURITY DEFINER**（Postgres 既定）であることを警告する（view が owner 権限で実行され、下テーブルの RLS をバイパスするため）。これを `security_invoker` へ変えるべきか判断する必要があった。

現状（検証済み）:

- `anon` の権限は **`core` への USAGE ＋ 3 つの view（`public_services` / `public_profile` / `public_showcases`）への SELECT のみ**。**素テーブルへの GRANT は一切ない**（公開面堅牢化で `services_anon_select` / `profile_anon_select` policy も撤去済み）。
- 3 つの view は **公開ポリシーを定義に内包**している：`is_active` / `status = 'published'` フィルタ、NDA フラグ（`publish_problems` / `publish_deliverables` / `publish_metrics` / `publish_testimonial`）、`client_display`、`is_public_name_allowed`（出すのは `public_name` のみ・`real_name` は決して出さない）。

## 決定
公開 view は **SECURITY DEFINER のまま**とし、**view を唯一の公開境界**にする（素テーブルは `anon` から完全遮断）。Supabase Advisor の本指摘は **by-design として了承**する。

## 根拠
- **境界が 1 か所**：`anon` が触れるのは 3 view だけ。素テーブルへ GRANT が無いので、view の列挙とフィルタが公開範囲を一意に決める＝監査対象が小さい。
- **公開ポリシーが非自明で条件的**：`public_showcases` は showcase_entries / projects / products / ndas / clients / problems / deliverables / metrics を結合し、NDA・`client_display`・`public_name` 等で項目ごとに出し分ける。この判定を **1 つの view にまとめる**方が、同じロジックを ~9 テーブルの RLS に分散実装するより安全で読める。
- **`security_invoker`（代替案）は面を広げる**：invoker 化すると `anon` が下テーブルを直接読める必要があり、各テーブルに列単位 GRANT ＋ view の CASE と等価な RLS を撒くことになる。`anon` の到達面が拡大し、ポリシーの重複と取りこぼし（例：`real_name` 露出・未公開 showcase の漏れ）リスクが増える。本ケースでは **invoker の方が締まりが悪い**。
- **DEFINER の昇格リスクが無い**：3 view は副作用のない純 SELECT 射影で、動的 SQL も関数副作用も持たない。`anon` が得るのは射影結果だけで、owner 権限を利用する経路がない。
- データは非機密の公開情報（サービス内容・プロフィール・公開済み事例）。gate により内部列・未公開・NDA 項目は構造的に出ない。

## 影響 / 留意
- **view が安全境界そのもの**になる。公開 view の列追加・`WHERE` / `CASE` 変更は公開範囲の変更と等価なので **レビュー必須**（列挙リストと gate が契約）。
- Advisor の `security_definer_view` 指摘は了承（acknowledge）する。将来データが機密化する／view が複雑化して定義だけでは守り切れなくなった場合は、`security_invoker` ＋ 下テーブル RLS への移行を再検討する。
- `anon` に残る trigger 関数 GRANT（`set_updated_at` 等）は pg_dump 由来で、trigger 専用＝`anon` から有用に呼べずデータ露出はない（必要なら別途 REVOKE で整理可）。
