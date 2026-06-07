// git 取り込み：リポジトリ読取（SourceAccess）と射影 engine を提供する。
// 射影先（ProjectionTarget）や下書き保存は利用側（composition）が持つ。
export { GitCliSourceAccess } from './source-access';
export { GitRepositoryProjectionEngine } from './projection';
