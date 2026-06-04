# niqostudio.com の合成: Web(Worker カスタムドメイン) + Email Routing(受信) + Resend(送信)用 DNS。
# 送受信を同一ルートに集約する前提（SPF は1本に統合する）。
# 定数は config.<env>.json（local.cfg）から、機微値は tfvars から取り、文字列のハードコードを避ける。

locals {
  # 受信ルール: 受信アドレス（contact / dmarc）の local part を config から取り、既定転送先へ。
  # noreply は送信専用で受信しない。inbound_forwards で追加/上書き可。
  inbound = merge({
    (split("@", local.dom.email.addresses.contact)[0]) = var.forward_to,
    (split("@", local.dom.email.addresses.dmarc)[0])   = var.forward_to,
  }, var.inbound_forwards)

  # 統合 SPF を include 群から組み立てる（受信 + 送信を1本に）。
  spf_record = "v=spf1 ${join(" ", [for i in local.dom.email.spf_includes : "include:${i}"])} ${local.dom.email.spf_all}"

  # DMARC: 集約レポート先（rua）は config の受信アドレス addresses.dmarc から組み立てる。
  dmarc_record = "v=DMARC1; p=${local.dom.email.dmarc_policy}; rua=mailto:${local.dom.email.addresses.dmarc};"
}

module "email_routing" {
  source                = "../../modules/cloudflare-email-routing"
  account_id            = local.account_id
  zone_id               = local.zone_id
  destination_addresses = distinct(values(local.inbound))
  rules = [
    for local_part, dest in local.inbound :
    { custom_address = "${local_part}@${local.domain}", forward_to = dest }
  ]
}

module "dns" {
  source  = "../../modules/cloudflare-dns-records"
  zone_id = local.zone_id

  records = concat(
    # Web の DNS は Worker のカスタムドメイン（workers.tf）が自動投入するため、ここでは持たない。

    # 送受信統合の SPF（Cloudflare 転送 + Amazon SES/Resend）。TXT は必ず1本に統合する。
    # 注: Email Routing 有効化時に CF が SPF/MX を自動投入する。apex に SPF が2本並ぶと
    #     RFC 7208 違反で無効化されるため、自動 SPF は削除し本レコードに一本化すること。
    [
      {
        name    = local.domain
        type    = "TXT"
        content = local.spf_record
        comment = "SPF (email routing + resend)"
      },
    ],

    # Resend 認証レコード（DKIM/MX 等。値は tfvars 経由でダッシュボード表示をそのまま渡す）
    var.resend_dns_records,

    # DMARC（まずは監視。dmarc_rua を設定してレポートを受ける。安定後に p=quarantine 等へ）
    [
      { name = "_dmarc.${local.domain}", type = "TXT", content = local.dmarc_record, comment = "DMARC" },
    ],
  )
}
