// Supabase import：migration SQL から CollectionSchema 下書きを起こす（import-schema スクリプト用）。
// live introspection は adapters/supabase（introspect/structure）が担う。
export { importSupabaseSchema, type ImportedCollection } from './import';
