// Session（認証された operator）の port。adapters/session/<tech> が実装する。
// domain（純ビジネス）でも adapters（実装）でもない、独立した契約層。
export interface Operator {
  id: string;
  email: string | null;
}

export interface SessionPort {
  getOperator(): Promise<Operator | null>;
}
