// supabase-js（PostgREST）のエラーは Error でなく {code, message, details, hint} の生 object で返り、
// そのまま throw すると画面にもログにも中身が出ない。操作の文脈を添えた Error に変換して投げる。
type QueryError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function throwQueryError(context: string, error: QueryError): never {
  const head = `${context}に失敗: ${error.message ?? '不明なエラー'}${error.code ? `（${error.code}）` : ''}`;
  const rest = [
    error.details ? `details: ${error.details}` : null,
    error.hint ? `hint: ${error.hint}` : null,
  ].filter(Boolean);
  throw new Error([head, ...rest].join('\n'));
}
