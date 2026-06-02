# ADR 0002: config.<env>.json（domain-centric・env ごとのファイル・直読）

- ステータス: 採用
- 決定日: 2026-06-03

## 背景
公開定数の正本を「どう構造化し・どこに置き・誰が読むか」を決める必要があった。

- **構造**：リソース種別（`email` / `pages` / `redirects`）で区切ると、その値がどのドメインに属すかが暗黙になり、ドメインやサブドメインを足すと各種別がドメインキーを繰り返す。一方 Terraform stack は **1 stack = 1 ドメイン/ゾーン**で、種別軸とは軸がズレる。
- **環境切替**：production / staging で変わる公開定数（ドメイン等）を切り替える必要がある。1ファイルに env を入れ子にする案もあるが、どの環境の値かがキーに埋もれる。
- **配布**：当初は infra が config を読んで website 向けに GitHub Variable へ注入していたが、注入用 stack（github provider）と GitHub App 資格情報が増え、跨ぎの結合も生んだ。

## 決定
- **構造は domain-centric**（種別軸を転置）。`primary` を主ドメインのポインタにし、各ドメインが自分の `email` / `pages` / `redirect` を自己完結で持つ。
- **env ごとに1ファイル** `config.<env>.json` を **root に committed** で置く（公開定数のみ）。
- infra（各 stack が `var.env` で選択）と website（`DEPLOY_ENV` で選択・既定 production）が**直読**する。注入機構は持たない。

```jsonc
{ "primary": "niqostudio.com",
  "domains": {
    "niqostudio.com": { "email": {…}, "pages": { "website": {…} } },
    "niqo.studio":    { "redirect_to": "niqostudio.com", "placeholder_ip": "…" } } }
```

## 影響
- Terraform stack と **1:1** で対応（各 stack は `config.<env>.json` の `domains[自ドメイン]` を読む）。
- 環境追加は `config.staging.json` を additive に足すだけ。ドメイン/サブドメイン追加も additive（自己完結ブロック or `pages.<role>.subdomain`）で破壊的 rename が起きない。
- 注入用 stack（github provider）と GitHub App 資格情報が不要になり、結合とトークンが減る。
- 公開定数は単一正本（root の committed ファイル）を両モジュールが直読＝重複・ドリフトが無い。
- `zone_id` / `account_id` は各ドメイン名から data source で導出（書かない）。
