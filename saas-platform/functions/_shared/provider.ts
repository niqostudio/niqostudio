// PSP（決済代行）の port。billing は PSP 固有 API をこの interface 越しにだけ触る。
// adapter（stripe.ts）を差し替えれば Paddle / LemonSqueezy 等へ移れる（ADR 0008）。

export interface CheckoutParams {
  productCode: string;
  offerKey: string;
  scope: string | null;
  // PSP に渡す価格の lookup key（<code>_<key>）。billing が販売中 offer から解決して渡す。
  priceLookupKey: string;
  isSubscription: boolean;
  successUrl: string; // billing-return の URL（最終 dest はクエリで運ぶ）
  cancelUrl: string;
  locale?: string;
  // identity 付き checkout（任意）。orgId は metadata に焼かれ webhook の着地先を確定する。
  // customerEmail は決済メールの固定（アカウントと別メールで決済→別 org 着地の事故を防ぐ）。
  orgId?: string | null;
  customerEmail?: string | null;
  // 一回課金の付与窓（checkout 時点の販売条件を metadata に焼き込む）。null=無期限 or サブスク。
  accessPeriodDays?: number | null;
}

// PSP 非依存の正規化済みイベント（webhook が record_event に渡せる形）。
export interface NormalizedEvent {
  provider: string;
  eventId: string;
  type: string;
  eventAt: string; // ISO
  // 以下は決済 reducer 用（イベント種別で埋まる範囲が違う）
  kind: 'purchase' | 'renewal' | 'refund' | 'chargeback' | 'dispute' | 'cancellation' | null;
  customerEmail: string | null;
  externalCustomerId: string | null;
  productCode: string | null; // metadata から
  offerKey: string | null;
  scope: string | null;
  amount: number | null;
  currency: string | null;
  externalCheckoutId: string | null;
  externalPaymentId: string | null;
  externalInvoiceId: string | null;
  periodEnd: string | null; // サブスクの期末（ISO）
  orgId: string | null; // metadata から（identity 付き checkout のみ）
  accessPeriodDays: number | null; // metadata から（checkout 時点の付与窓スナップショット）
}

export interface CheckoutResult {
  url: string;
}

export interface CheckoutStatus {
  paid: boolean;
  customerEmail: string | null;
  externalCheckoutId: string;
}

export interface PaymentProvider {
  readonly code: string;
  createCheckout(p: CheckoutParams): Promise<CheckoutResult>;
  // billing-return が成功 session を検証してレシート発行に使う。
  retrieveCheckout(checkoutId: string): Promise<CheckoutStatus>;
  // webhook の署名検証＋正規化。
  parseWebhook(rawBody: string, signature: string): Promise<NormalizedEvent>;
  // 支払い管理・解約のセルフサービス画面（billing-portal が customer 単位で発行する）。
  createPortalSession(externalCustomerId: string, returnUrl: string): Promise<{ url: string }>;
}
