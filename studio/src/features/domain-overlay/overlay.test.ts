import { describe, it, expect } from 'vitest';
import { buildSchema, structureFor } from '@/features/domain-overlay/overlay';
import type { StructuralCollection, StructuralField } from '@/features/domain-overlay/overlay';

const sf = (name: string, over: Partial<StructuralField> = {}): StructuralField => ({
  name,
  baseKind: 'text',
  refTable: null,
  refColumn: null,
  required: false,
  ...over,
});

describe('buildSchema — fields overlay', () => {
  it('hidden を除外し order で並べ label/kind を被せる', () => {
    const structure: StructuralCollection = {
      table: 'projects',
      fields: [sf('name', { required: true }), sf('status'), sf('secret')],
      childTables: [],
    };
    const schema = buildSchema(structure, {
      fields: {
        name: { label: '名前', order: 1 },
        status: { kind: 'select', options: ['active', 'closed'], order: 2 },
        secret: { hidden: true },
      },
    });
    expect(schema.fields.map((f) => f.key)).toEqual(['name', 'status']);
    expect(schema.fields[0]).toMatchObject({ key: 'name', label: '名前', kind: 'text', required: true });
    expect(schema.fields[1]).toMatchObject({ key: 'status', kind: 'select', options: ['active', 'closed'] });
  });

  it('外向き FK は reference 化して参照先を持つ', () => {
    const structure: StructuralCollection = {
      table: 'projects',
      fields: [sf('title', { required: true }), sf('client_id', { refTable: 'clients', refColumn: 'id' })],
      childTables: [],
    };
    const schema = buildSchema(structure, { fields: { client_id: { label: '顧客' } } });
    const ref = schema.fields.find((f) => f.key === 'client_id');
    expect(ref).toMatchObject({ kind: 'reference', refTable: 'clients', refColumn: 'id', label: '顧客' });
  });
});

describe('buildSchema — core 変更耐性', () => {
  it('structure に無い field の overlay は無視（幻の列を作らない）', () => {
    const schema = buildSchema(
      { table: 't', fields: [sf('name')], childTables: [] },
      { fields: { name: { label: '名前' }, gone: { label: '消えた列' } } },
    );
    expect(schema.fields.map((f) => f.key)).toEqual(['name']);
  });

  it('overlay の無い新しい列は label=列名・kind=baseKind の素で出る', () => {
    const schema = buildSchema({
      table: 't',
      fields: [sf('title'), sf('new_col', { baseKind: 'date', required: true })],
      childTables: [],
    });
    const nc = schema.fields.find((f) => f.key === 'new_col');
    expect(nc).toMatchObject({ key: 'new_col', label: 'new_col', kind: 'date', required: true });
  });
});

describe('buildSchema — children allowlist', () => {
  it('overlay 宣言した子だけ取り込み、子の FK 列は落とす', () => {
    const structure: StructuralCollection = {
      table: 'projects',
      fields: [sf('title')],
      childTables: [
        {
          table: 'problems',
          fields: [sf('project_id', { refTable: 'projects', refColumn: 'id' }), sf('summary')],
          childTables: [],
        },
        {
          table: 'ndas',
          fields: [sf('project_id', { refTable: 'projects', refColumn: 'id' })],
          childTables: [],
        },
      ],
    };
    const schema = buildSchema(structure, { children: { problems: { label: '課題' } } });
    expect(schema.children.map((c) => c.key)).toEqual(['problems']);
    expect(schema.children[0].label).toBe('課題');
    expect(schema.children[0].fields.map((f) => f.key)).toEqual(['summary']);
  });
});

describe('buildSchema — title/status の決定', () => {
  it('title 列があれば titleField=title、status 列があれば statusField=status', () => {
    const schema = buildSchema({ table: 't', fields: [sf('title'), sf('status')], childTables: [] });
    expect(schema.titleField).toBe('title');
    expect(schema.statusField).toBe('status');
  });

  it('title が無ければ name、どちらも無ければ先頭、空なら id', () => {
    expect(buildSchema({ table: 't', fields: [sf('name'), sf('x')], childTables: [] }).titleField).toBe('name');
    expect(buildSchema({ table: 't', fields: [sf('headline'), sf('x')], childTables: [] }).titleField).toBe('headline');
    expect(buildSchema({ table: 't', fields: [], childTables: [] }).titleField).toBe('id');
  });

  it('semantics で明示すれば優先、status 列が無ければ statusField は無し', () => {
    const schema = buildSchema(
      { table: 't', fields: [sf('title'), sf('state')], childTables: [] },
      { titleField: 'state' },
    );
    expect(schema.titleField).toBe('state');
    expect(schema.statusField).toBeUndefined();
  });
});

describe('structureFor', () => {
  it('root へ FK を持つ表だけを子に畳む', () => {
    const tables = new Map<string, StructuralField[]>([
      ['projects', [sf('title')]],
      ['problems', [sf('project_id', { refTable: 'projects' }), sf('summary')]],
      ['clients', [sf('name')]],
    ]);
    const structure = structureFor('projects', tables);
    expect(structure.table).toBe('projects');
    expect(structure.fields.map((f) => f.name)).toEqual(['title']);
    expect(structure.childTables.map((c) => c.table)).toEqual(['problems']);
  });

  it('root が無ければ空', () => {
    const structure = structureFor('missing', new Map());
    expect(structure.fields).toEqual([]);
    expect(structure.childTables).toEqual([]);
  });
});
