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
const pasta = mkdtempSync(join(tmpdir(), 'teck-hierarquia-qa-'));
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

test('serviço de hierarquia mantém integridade no SQLite real', async (t) => {
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
    const sql = readFileSync('prisma/migrations/20261005120000_estrutura_comercial/migration.sql', 'utf8');
    for (const comando of sql.split(';').map((item) => item.trim()).filter(Boolean)) await client.$executeRawUnsafe(comando);
    const s = await import('./servico');
    const gerente = await s.cadastrarEntidade('gerente', { empresa: 'AKRK', nome: 'Maria', nomeNormalizado: 'MARIA', codigoExterno: 'g1' }, 'qa');
    const outro = await s.cadastrarEntidade('gerente', { empresa: 'DIG', nome: 'Maria', nomeNormalizado: 'MARIA', codigoExterno: 'g1' }, 'qa');
    const equipe = await s.cadastrarEntidade('equipe', { empresa: 'AKRK', nome: 'Centro', nomeNormalizado: 'CENTRO', codigoExterno: 'e1' }, 'qa');
    const vendedor = await s.cadastrarEntidade('vendedor', { empresa: 'AKRK', nome: 'João', nomeNormalizado: 'JOAO', codigoExterno: 'v1' }, 'qa');
    const inicio = new Date('2026-01-01T03:00:00Z');
    await t.test('rejeita empresa cruzada sem persistir vínculo', async () => {
      await assert.rejects(s.vincularEquipeAoGerente(equipe.id, outro.id, { inicio, fim: null }, 'qa'), /empresa/i);
      assert.equal(await client.vinculoEquipeGerente.count(), 0);
    });
    await t.test('rejeita sobreposição de equipe e vendedor sem duplicar', async () => {
      await s.vincularEquipeAoGerente(equipe.id, gerente.id, { inicio, fim: null }, 'qa');
      await assert.rejects(s.vincularEquipeAoGerente(equipe.id, gerente.id, { inicio: new Date('2026-02-01'), fim: null }, 'qa'), /período/);
      await s.vincularVendedorAEquipe(vendedor.id, equipe.id, { inicio, fim: null }, 'qa');
      await assert.rejects(s.vincularVendedorAEquipe(vendedor.id, equipe.id, { inicio, fim: null }, 'qa'), /período/);
      assert.equal(await client.vinculoEquipeGerente.count(), 1);
      assert.equal(await client.vinculoVendedorEquipe.count(), 1);
    });
    await t.test('não inativa cadastro com vínculo vigente', async () => {
      await assert.rejects(s.alternarEntidade('equipe', equipe.id, false, 'qa'), /vínculos vigentes/);
      assert.equal((await client.equipeComercial.findUniqueOrThrow({ where: { id: equipe.id } })).ativo, true);
    });
    await t.test('resolução com empresa incorreta mantém pendência e nenhum alias', async () => {
      const item = await s.registrarSemVinculo('AKRK', 'gerente', 'front_v2', 'Alias origem');
      await assert.rejects(s.resolverSemVinculo(item.id, outro.id, 'qa'), /empresa/i);
      assert.equal((await client.itemSemVinculo.findUniqueOrThrow({ where: { id: item.id } })).status, 'pendente');
      assert.equal(await client.aliasHierarquia.count(), 0);
      await s.resolverSemVinculo(item.id, gerente.id, 'qa');
      assert.equal((await client.itemSemVinculo.findUniqueOrThrow({ where: { id: item.id } })).status, 'resolvido');
      await assert.rejects(s.resolverSemVinculo(item.id, gerente.id, 'qa'), /já foi tratado/);
      assert.equal(await client.aliasHierarquia.count(), 1);
    });
    await t.test('falha ao finalizar pendência desfaz o alias na mesma transação', async () => {
      const item = await s.registrarSemVinculo('AKRK', 'gerente', 'front_v2', 'Rollback origem');
      await client.$executeRawUnsafe("CREATE TRIGGER falha_resolucao BEFORE UPDATE ON itens_sem_vinculo WHEN OLD.valor_normalizado = 'ROLLBACK ORIGEM' BEGIN SELECT RAISE(ABORT, 'falha simulada'); END");
      await assert.rejects(s.resolverSemVinculo(item.id, gerente.id, 'qa'));
      assert.equal((await client.itemSemVinculo.findUniqueOrThrow({ where: { id: item.id } })).status, 'pendente');
      assert.equal(await client.aliasHierarquia.count({ where: { valorNormalizado: 'ROLLBACK ORIGEM' } }), 0);
      await client.$executeRawUnsafe('DROP TRIGGER falha_resolucao');
    });
    await t.test('encerramento não amplia período sobre vínculo seguinte', async () => {
      const e = await s.cadastrarEntidade('equipe', { empresa: 'AKRK', nome: 'Sul', nomeNormalizado: 'SUL', codigoExterno: 'e2' }, 'qa');
      const primeiro = await s.vincularEquipeAoGerente(e.id, gerente.id, { inicio, fim: new Date('2026-01-31T23:59:59Z') }, 'qa');
      await s.vincularEquipeAoGerente(e.id, gerente.id, { inicio: new Date('2026-02-01T00:00:00Z'), fim: null }, 'qa');
      await assert.rejects(s.encerrarVinculo('equipe-gerente', primeiro.id, new Date('2026-02-10T00:00:00Z')), /sobrepõe/);
      assert.equal((await client.vinculoEquipeGerente.findUniqueOrThrow({ where: { id: primeiro.id } })).fim?.toISOString(), '2026-01-31T23:59:59.000Z');
    });
    await t.test('duas criações simultâneas não gravam vínculos sobrepostos', async () => {
      const e = await s.cadastrarEntidade('equipe', { empresa: 'AKRK', nome: 'Norte', nomeNormalizado: 'NORTE', codigoExterno: 'e3' }, 'qa');
      const resultados = await Promise.allSettled([
        s.vincularEquipeAoGerente(e.id, gerente.id, { inicio, fim: null }, 'qa'),
        s.vincularEquipeAoGerente(e.id, gerente.id, { inicio, fim: null }, 'qa'),
      ]);
      assert.equal(resultados.filter((resultado) => resultado.status === 'fulfilled').length, 1);
      assert.equal(await client.vinculoEquipeGerente.count({ where: { equipeId: e.id } }), 1);
    });
    await t.test('alias fora do lote não derruba reconciliação', async () => {
      const reconhecidos = await s.resolverAliasesERegistrarPendencias('AKRK', [{ tipo: 'equipe', origem: 'front_v2', valor: 'Centro' }]);
      assert.equal(reconhecidos.size, 1);
    });
    await t.test('ignorado permanece ignorado ao receber novamente a fonte', async () => {
      const item = await s.registrarSemVinculo('AKRK', 'vendedor', 'front_v2', 'Sem identificação');
      await s.ignorarSemVinculo(item.id, 'qa');
      await s.resolverAliasesERegistrarPendencias('AKRK', [{ tipo: 'vendedor', origem: 'front_v2', valor: 'Sem identificação' }]);
      assert.equal((await client.itemSemVinculo.findUniqueOrThrow({ where: { id: item.id } })).status, 'ignorado');
    });
  } finally {
    await client.$disconnect();
    globalPrisma.prisma = anterior;
    if (urlAnterior === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlAnterior;
    hooks.deregister();
    rmSync(pasta, { recursive: true, force: true });
  }
});
