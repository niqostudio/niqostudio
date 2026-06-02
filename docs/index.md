# NIQO STUDIO docs

NIQO STUDIO のシステム（website / core / infra）のドキュメント。1つの monorepo で公開サイト・
データ層・インフラを管理する。

## どこから読むか
- **全体像をつかむ** → [アーキテクチャ](architecture.md)（図でモジュールと値の流れ）
- **値の置き場・命名・配置の原則** → [変数の配置](variables.md)（config.\<env\>.json / Secret / Variable のどこに何を置くか＋原則）
- **用語が不安** → [用語集](infra/glossary.md)
- **データ層** → [スキーマ](core/schema.md) / [運用](core/operations.md)
- **インフラを構築する** → [セットアップ](infra/setup.md)
- **メールを設定する** → [メール設計](infra/email.md)（Resend × Cloudflare の混ぜ方）
- **障害から戻す** → [復旧手順](infra/recovery.md)

命名・配置の原則（公開/秘密・命名規約）は [変数の配置](variables.md)、環境モデルは [ADR 0003](adr/0003-environment-per-module.md) を参照。

!!! note "このサイトについて"
    リポジトリ `docs/` の Markdown を MkDocs (Material) で公開している。
    ソースは [GitHub: niqostudio/niqostudio](https://github.com/niqostudio/niqostudio) を参照。
