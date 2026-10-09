import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as nodeModule from 'node:module';
import { carregarComparativoEmpresas, montarComparativoEmpresas } from './comparativo-empresas';
import { montarAcesso, type Acesso } from '../permissoes';
import type { Proposta } from './types';
import type { SnapshotPropostas } from './snapshot';
import type { EntradaCache } from '../workers/cache';
import { montarRelatorio } from './relatorio';

const agora = Date.parse('2026-10-09T15:00:00Z');
const proposta = (numero: string, data: string, valor = 100, campos: Partial<Proposta> = {}): Proposta => ({
  numero, data, valor, cpf: '12345678901', nome: 'Cliente', produto: 'Empréstimo', modalidade: 'Novo',
  gerente: 'Gerente', equipe: 'Equipe', operador: 'Operador', convenio: 'SIAPE', status: 'Em análise',
  esteira: '', temCodigoFuncao: false, integrada: false, excecao: false, cancelada: false,
  frontReprovado: false, esteiraReprovada: false, motivoCancFront: '', motivoCancelamento: '', dataCancelamento: '', ...campos,
});
const snapshot = (propostas: Proposta[] = [], ref = '2026-10-09', geradoEm = new Date(agora).toISOString()): EntradaCache<SnapshotPropostas> => ({
  geradoEm, dados: { ref, propostas },
});

test('referência impossível retorna indisponibilidade sem normalizar ou lançar erro', () => {
  for (const ref of ['2026-99-99', '2026-02-30']) {
    const resultado = montarComparativoEmpresas([snapshot(), snapshot()], ref, 7, agora);
    assert.equal(resultado.estado, 'indisponivel');
    assert.deepEqual(resultado.empresas, []);
    assert.equal(resultado.lider, null);
    assert.equal(resultado.motivo, 'Data de referência inválida.');
  }
});

test('comparativo diário usa criação e contratado, incluindo canceladas e sem misturar integração', () => {
  const resultado = montarComparativoEmpresas([
    snapshot([
      proposta('1', '2026-10-08', 50, { cancelada: true }),
      proposta('2', '2026-10-08', 70, { integrada: true, valorLiberado: 10, dataIntegracao: '2026-10-09' }),
      proposta('3', '2026-10-07', 900, { integrada: true, dataIntegracao: '2026-10-08' }),
      proposta('4', '2026-10-09', 800),
    ]), snapshot([proposta('1', '2026-10-08', 90)]),
  ], '2026-10-08', 1, agora);
  assert.equal(resultado.estado, 'disponivel');
  assert.equal(resultado.inicio, '2026-10-08');
  assert.deepEqual(resultado.empresas.map(({ empresa, qtd, valor }) => ({ empresa, qtd, valor })), [
    { empresa: 'AKRK', qtd: 2, valor: 120 }, { empresa: 'DIG', qtd: 1, valor: 90 },
  ]);
  assert.equal(resultado.lider, 'AKRK');
});

test('janela de sete dias cruza o mês e deduplica pelo último estado de cada proposta', () => {
  const resultado = montarComparativoEmpresas([
    snapshot([
      proposta('1', '2026-09-27', 900), proposta('2', '2026-09-28', 40),
      proposta('2', '2026-09-28', 50), proposta('3', '2026-10-04', 10), proposta('4', '2026-10-05', 900),
    ]), snapshot([proposta('2', '2026-10-01', 70)]),
  ], '2026-10-04', 7, agora);
  assert.equal(resultado.inicio, '2026-09-28');
  assert.deepEqual(resultado.empresas.map(({ qtd, valor }) => ({ qtd, valor })), [{ qtd: 2, valor: 60 }, { qtd: 1, valor: 70 }]);
  assert.equal(resultado.lider, 'DIG');
});

test('empate monetário não usa quantidade para desempatar e zero válido não cria líder', () => {
  const empate = montarComparativoEmpresas([
    snapshot([proposta('1', '2026-10-08', 0.1), proposta('2', '2026-10-08', 0.2)]),
    snapshot([proposta('1', '2026-10-08', 0.3)]),
  ], '2026-10-08', 1, agora);
  assert.equal(empate.lider, null);
  assert.equal(empate.empresas[0].valor, 0.3);
  const zero = montarComparativoEmpresas([snapshot(), snapshot()], '2026-10-08', 1, agora);
  assert.equal(zero.estado, 'disponivel');
  assert.equal(zero.lider, null);
  assert.deepEqual(zero.empresas.map(({ qtd, valor }) => ({ qtd, valor })), [{ qtd: 0, valor: 0 }, { qtd: 0, valor: 0 }]);
});

test('dinheiro é arredondado por proposta antes da soma', () => {
  const resultado = montarComparativoEmpresas([
    snapshot([proposta('1', '2026-10-08', 1.005), proposta('2', '2026-10-08', 1.005), proposta('3', '2026-10-08', 10.075)]), snapshot(),
  ], '2026-10-08', 1, agora);
  assert.equal(resultado.empresas[0].valor, 12.1);
});

test('ausência, defasagem, referências divergentes e cobertura insuficiente suprimem valores e líder', () => {
  const invalidos = [
    null,
    snapshot([], '2026-10-09', new Date(agora - 86_400_001).toISOString()),
    snapshot([], '2026-10-09', 'inválido'),
    snapshot([], '2026-10-09', new Date(agora + 1).toISOString()),
    snapshot([], '2026-10-08'),
  ];
  for (const invalido of invalidos) {
    const resultado = montarComparativoEmpresas([snapshot([proposta('1', '2026-10-08')]), invalido], '2026-10-08', 1, agora);
    assert.equal(resultado.estado, 'indisponivel');
    assert.equal(resultado.lider, null);
    assert.deepEqual(resultado.empresas, []);
    assert.ok(resultado.motivo);
  }
  for (const [ref, dias] of [['2026-10-10', 1], ['2026-09-13', 7]] as const) {
    const resultado = montarComparativoEmpresas([snapshot(), snapshot()], ref, dias, agora);
    assert.equal(resultado.estado, 'indisponivel');
    assert.deepEqual(resultado.empresas, []);
  }
  const limite = montarComparativoEmpresas([snapshot(), snapshot()], '2026-09-14', 7, agora);
  assert.equal(limite.estado, 'disponivel');
  assert.equal(montarComparativoEmpresas([snapshot([], undefined, new Date(agora - 86_400_000).toISOString()), snapshot()], '2026-10-08', 1, agora).estado, 'disponivel');
});

test('valor externo negativo, não finito ou fora da precisão segura invalida a comparação', () => {
  for (const valor of [-0.01, NaN, Infinity, -Infinity, Number.MAX_VALUE]) {
    const resultado = montarComparativoEmpresas([snapshot(), snapshot([proposta('1', '2026-10-08', valor)])], '2026-10-08', 1, agora);
    assert.equal(resultado.estado, 'indisponivel');
    assert.equal(resultado.lider, null);
    assert.deepEqual(resultado.empresas, []);
  }
});

test('comparativo descarta CPF inválido na mesma regra das propostas comerciais do relatório', () => {
  const propostas = [
    proposta('1', '2026-10-08', 50), proposta('2', '2026-10-08', 900, { cpf: '' }),
    proposta('3', '2026-10-08', 800, { cpf: '123456789012' }),
    proposta('4', '2026-10-02', 70), proposta('5', '2026-10-02', 600, { cpf: 'sem CPF' }),
  ];
  const diario = montarComparativoEmpresas([snapshot(propostas), snapshot()], '2026-10-08', 1, agora);
  const relatorio = montarRelatorio(propostas, '2026-10-08');
  assert.deepEqual({ qtd: diario.empresas[0].qtd, valor: diario.empresas[0].valor }, relatorio.kpis.total);
  assert.equal(diario.empresas[0].qtd, 1);
  assert.equal(diario.empresas[0].valor, 50);
  const semanal = montarComparativoEmpresas([snapshot(propostas), snapshot()], '2026-10-08', 7, agora);
  assert.equal(semanal.empresas[0].qtd, 2);
  assert.equal(semanal.empresas[0].valor, 120);
});

test('loader autoriza antes de importar e ler snapshots e nunca consulta fontes ao vivo', async () => {
  const globalTeste = globalThis as unknown as { comparativoQA?: { leituras: string[]; falhar: boolean } };
  const anterior = globalTeste.comparativoQA;
  globalTeste.comparativoQA = { leituras: [], falhar: false };
  const { registerHooks } = nodeModule as unknown as {
    registerHooks(hooks: {
      resolve(specifier: string, context: Record<string, unknown>, next: (specifier: string, context: Record<string, unknown>) => Record<string, unknown>): Record<string, unknown>;
      load(url: string, context: Record<string, unknown>, next: (url: string, context: Record<string, unknown>) => Record<string, unknown>): Record<string, unknown>;
    }): { deregister(): void };
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === '@/lib/workers/cache') return { url: 'teck-qa:comparativo-cache', shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url === 'teck-qa:comparativo-cache') return {
        format: 'module', shortCircuit: true,
        source: 'export async function lerCache(id) { globalThis.comparativoQA.leituras.push(id); if (globalThis.comparativoQA.falhar) throw new Error("Leitura falhou"); return { geradoEm: new Date().toISOString(), dados: { ref: "2026-10-09", propostas: [] } }; }',
      };
      return next(url, context);
    },
  });
  const acesso = montarAcesso({ id: '1', role: 'visualizador', displayName: 'Usuário', empresas: 'AKRK,DIG', escopoGerente: null,
    permissoesPerfil: [{ funcionalidade: 'relatorio', permitido: true }] });
  try {
    const restritos: Acesso[] = [
      { ...acesso, empresas: ['AKRK'] }, { ...acesso, empresas: ['DIG'] },
      { ...acesso, funcionalidades: { ...acesso.funcionalidades, relatorio: false } },
      { ...acesso, escopoGerente: 'Gerente' }, { ...acesso, perfil: 'gerente' },
      { ...acesso, gerenteComercialId: 'gerente-1' },
    ];
    for (const restrito of restritos) assert.equal(await carregarComparativoEmpresas(restrito, '2026-10-08', 1), null);
    assert.deepEqual(globalTeste.comparativoQA.leituras, []);
    assert.equal((await carregarComparativoEmpresas(acesso, '2026-10-08', 1))?.estado, 'disponivel');
    assert.deepEqual(globalTeste.comparativoQA.leituras, ['relatorio-propostas-v3-akrk', 'relatorio-propostas-v3-dig']);
    const admin = montarAcesso({ id: '2', role: 'superadmin', displayName: 'ADM', empresas: '', escopoGerente: null,
      permissoesPerfil: [{ funcionalidade: 'relatorio', permitido: true }] });
    assert.equal((await carregarComparativoEmpresas(admin, '2026-10-08', 7))?.estado, 'disponivel');
    globalTeste.comparativoQA.falhar = true;
    const falha = await carregarComparativoEmpresas(acesso, '2026-10-08', 1);
    assert.equal(falha?.estado, 'indisponivel');
    assert.equal(falha?.lider, null);
    assert.deepEqual(falha?.empresas, []);
  } finally {
    hooks.deregister();
    if (anterior) globalTeste.comparativoQA = anterior;
    else delete globalTeste.comparativoQA;
  }
});
