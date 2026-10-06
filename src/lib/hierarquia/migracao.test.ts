import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

type BancoTeste = {
  pragma(comando: string): unknown;
  exec(comando: string): unknown;
  prepare(comando: string): { all(): unknown[]; run(...valores: unknown[]): unknown };
  close(): void;
};

const Database = createRequire(import.meta.url)('better-sqlite3') as new (arquivo: string) => BancoTeste;

const sql = readFileSync('prisma/migrations/20261005120000_estrutura_comercial/migration.sql', 'utf8');

test('migração cria a estrutura comercial e mantém integridade relacional', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec('CREATE TABLE permissoes_perfil (role TEXT NOT NULL, funcionalidade TEXT NOT NULL, permitido BOOLEAN NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (role, funcionalidade))');
  db.exec('CREATE TABLE users (id TEXT NOT NULL PRIMARY KEY)');
  db.exec(sql);

  const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('gerentes_comerciais', 'equipes_comerciais', 'vendedores_comerciais', 'vinculos_equipe_gerente', 'vinculos_vendedor_equipe', 'aliases_hierarquia', 'itens_sem_vinculo')").all() as { name: string }[];
  assert.deepEqual(new Set(tabelas.map((item) => item.name)), new Set([
    'gerentes_comerciais',
    'equipes_comerciais',
    'vendedores_comerciais',
    'vinculos_equipe_gerente',
    'vinculos_vendedor_equipe',
    'aliases_hierarquia',
    'itens_sem_vinculo',
  ]));

  const agora = '2026-10-05 12:00:00';
  db.prepare('INSERT INTO gerentes_comerciais (id, empresa, nome, nome_normalizado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('g1', 'AKRK', 'Maria', 'MARIA', agora, agora);
  db.prepare('INSERT INTO gerentes_comerciais (id, empresa, nome, nome_normalizado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('g2', 'AKRK', 'MARIA', 'MARIA', agora, agora);
  assert.deepEqual(db.prepare("SELECT id FROM gerentes_comerciais WHERE empresa = 'AKRK' AND nome_normalizado = 'MARIA' ORDER BY id").all(), [{ id: 'g1' }, { id: 'g2' }]);
  db.prepare('INSERT INTO equipes_comerciais (id, empresa, nome, nome_normalizado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('e1', 'AKRK', 'Equipe Centro', 'EQUIPE CENTRO', agora, agora);
  assert.throws(() => db.prepare('INSERT INTO vinculos_equipe_gerente (id, equipe_id, gerente_id, inicio, created_at) VALUES (?, ?, ?, ?, ?)')
    .run('v1', 'equipe-inexistente', 'g1', agora, agora), /FOREIGN KEY/);
  assert.throws(() => db.prepare('INSERT INTO aliases_hierarquia (id, empresa, tipo, origem, valor, valor_normalizado, gerente_id, equipe_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('a1', 'AKRK', 'gerente', 'front_v2', 'Maria', 'MARIA', 'g1', 'e1', agora), /CHECK/);
  assert.deepEqual(
    db.prepare("SELECT role FROM permissoes_perfil WHERE funcionalidade = 'hierarquia' AND permitido = true ORDER BY role").all(),
    [{ role: 'superadmin' }],
  );
  db.close();
});
