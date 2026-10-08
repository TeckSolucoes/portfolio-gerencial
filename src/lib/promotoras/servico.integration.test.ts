import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as nodeModule from 'node:module';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

type Hooks = { deregister(): void };
type HookContext = Record<string, unknown>;
type HookResult = { url?: string; format?: string; source?: string; shortCircuit?: boolean };
const { registerHooks } = nodeModule as unknown as {
  registerHooks(hooks: {
    resolve(specifier: string, context: HookContext, next: (specifier: string, context: HookContext) => HookResult): HookResult;
    load(url: string, context: HookContext, next: (url: string, context: HookContext) => HookResult): HookResult;
  }): Hooks;
};

// O marcador server-only pertence ao bundler Next; o teste executa o serviço real no Node com SQLite isolado.
const pasta = mkdtempSync(join(tmpdir(), 'teck-promotoras-qa-'));
const arquivoMarcador = join(pasta, 'server-only.cjs');
writeFileSync(arquivoMarcador, '');
const marcador = pathToFileURL(arquivoMarcador).href;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    return specifier === 'server-only' ? { url: marcador, shortCircuit: true } : next(specifier, context);
  },
  load(url, context, next) {
    return url === marcador ? { format: 'module', source: '', shortCircuit: true } : next(url, context);
  },
});

test('promotoras persistem histórico e rejeitam vínculos inválidos', async () => {
  const url = `file:${join(pasta, 'teste.db').replaceAll('\\', '/')}`;
  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };
  const anterior = globalPrisma.prisma;
  const urlAnterior = process.env.DATABASE_URL;
  globalPrisma.prisma = client;
  process.env.DATABASE_URL = url;
  try {
    await client.$executeRawUnsafe('CREATE TABLE permissoes_perfil (role TEXT NOT NULL, funcionalidade TEXT NOT NULL, permitido BOOLEAN NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY(role, funcionalidade))');
    await client.$executeRawUnsafe('CREATE TABLE users (id TEXT NOT NULL PRIMARY KEY)');
    for (const arquivo of ['20261005120000_estrutura_comercial', '20261007120000_promotoras']) {
      const sql = readFileSync(`prisma/migrations/${arquivo}/migration.sql`, 'utf8');
      for (const comando of sql.split(';').map(item => item.trim()).filter(Boolean)) await client.$executeRawUnsafe(comando);
    }
    const { gravarPromotora, listarPromotoras } = await import('./servico');
    const gerente = await client.gerenteComercial.create({ data: { empresa: 'AKRK', nome: 'Maria', nomeNormalizado: 'MARIA' } });
    const dados = { empresa: 'AKRK' as const, nome: 'Parceira', cnpj: null, codigo: 'p1', origem: 'manual' as const, ativo: true, gerenteComercialId: gerente.id };
    const criada = await gravarPromotora(null, dados, 'qa');
    await gravarPromotora(criada.id, dados, 'qa');
    assert.equal(await client.historicoPromotora.count(), 1);
    await gravarPromotora(criada.id, { ...dados, nome: 'Novo nome', ativo: false }, 'revisor');
    const historico = await client.historicoPromotora.findMany({ where: { autor: 'revisor' } });
    assert.equal(historico.length, 1);
    assert.equal((historico[0].anterior as { nome: string }).nome, 'Parceira');
    assert.equal((historico[0].posterior as { nome: string }).nome, 'Novo nome');
    await assert.rejects(gravarPromotora(null, dados, 'qa'), /código/);
    await assert.rejects(gravarPromotora(null, { ...dados, empresa: 'DIG' }, 'qa'), /mesma empresa/);
    await client.gerenteComercial.update({ where: { id: gerente.id }, data: { ativo: false } });
    await assert.rejects(gravarPromotora(null, { ...dados, codigo: 'p2' }, 'qa'), /ativo/);
    assert.equal(await client.promotora.count(), 1);
    assert.equal(await client.historicoPromotora.count(), 2);
    const lista = await listarPromotoras();
    assert.equal(lista.promotoras[0].gerenteNome, 'Maria');
    assert.equal(lista.promotoras[0].historico.length, 2);
    assert.equal(typeof lista.promotoras[0].atualizadoEm, 'string');
    await gravarPromotora(criada.id, { ...dados, nome: 'Nome com vínculo preservado' }, 'qa');
    assert.equal(await client.historicoPromotora.count(), 3);
    await assert.rejects(gravarPromotora(criada.id, { ...dados, nome: 'Alteração revertida' }, 'qa', { id: 'u1', email: 'qa@example.test' }));
    assert.equal((await client.promotora.findUniqueOrThrow({ where: { id: criada.id } })).nome, 'Nome com vínculo preservado');
    assert.equal(await client.historicoPromotora.count(), 3);
  } finally {
    await client.$disconnect();
    globalPrisma.prisma = anterior;
    if (urlAnterior === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = urlAnterior;
    hooks.deregister();
    rmSync(pasta, { recursive: true, force: true });
  }
});
