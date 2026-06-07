import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { importSupabaseSchema } from '@/features/supabase-import';

// 顧客 SoR＝core(Supabase) の migration から collection schema 下書きを起こす。
// 生成物は見直して採用する前提（status の選択肢・参照・ラベルは要調整）。生成物は gitignore。
const MIGRATIONS = '../core/supabase/migrations';
const OUT_DIR = 'src/composition/generated';

const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const sqls = files.map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'));
const collections = importSupabaseSchema(sqls);

console.log(`migrations: ${files.length} → collections: ${collections.length}`);
for (const c of collections) {
  const kids = c.schema.children.map((x) => x.key).join(', ');
  console.log(`- ${c.table}: ${c.schema.fields.length} fields, ${c.schema.children.length} children${kids ? ` (${kids})` : ''}`);
}

mkdirSync(OUT_DIR, { recursive: true });
const out = `// 自動生成（pnpm --filter @niqostudio/studio run import-schema）。
// core の migration から起こした collection schema の下書き。見直して採用する。
import type { CollectionSchema } from '@/shared/records/schema';

export const importedCollections: { table: string; schema: CollectionSchema }[] = ${JSON.stringify(collections, null, 2)};
`;
writeFileSync(join(OUT_DIR, 'core-schemas.ts'), out);
console.log(`→ ${OUT_DIR}/core-schemas.ts`);
