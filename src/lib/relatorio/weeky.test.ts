import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarWeeky } from './weeky';
import type { Proposta } from './types';

const proposta = (numero: string, data: string, campos: Partial<Proposta> = {}): Proposta => ({
  numero, data, cpf: '12345678901', nome: 'Cliente', produto: 'Empréstimo', modalidade: 'Novo',
  valor: 100, gerente: 'Gerente', equipe: 'AKRK - Equipe', operador: 'Operador', convenio: 'SIAPE',
  status: 'Em análise', esteira: '', temCodigoFuncao: false, integrada: false, excecao: false,
  cancelada: false, frontReprovado: false, esteiraReprovada: false, motivoCancFront: '',
  motivoCancelamento: '', dataCancelamento: '', ...campos,
});

test('Weeky separa as duas janelas de sete dias, inclusive virada de mês, sem incluir futuro', () => {
  const resumo = montarWeeky([
    proposta('1', '2026-09-20'), proposta('2', '2026-09-21'), proposta('3', '2026-09-27'),
    proposta('4', '2026-09-28'), proposta('5', '2026-10-04'), proposta('6', '2026-10-05'),
  ], '2026-10-04');
  assert.equal(resumo.inicio, '2026-09-28');
  assert.equal(resumo.anteriorInicio, '2026-09-21');
  assert.equal(resumo.anteriorFim, '2026-09-27');
  assert.deepEqual(resumo.vendas, { qtd: 2, valor: 200 });
  assert.deepEqual(resumo.anteriores, { qtd: 2, valor: 200 });
  assert.equal(resumo.dias.length, 7);
  assert.deepEqual(resumo.dias[1], { data: '2026-09-29', qtd: 0, valor: 0 });
});

test('Weeky mantém último estado de cada número e usa integração mesmo com criação anterior', () => {
  const resumo = montarWeeky([
    proposta('1', '2026-10-03', { valor: 900 }),
    proposta('1', '2026-10-03', { valor: 150, cancelada: true }),
    proposta('2', '2026-09-01', { integrada: true, dataIntegracao: '2026-10-02', valor: 300 }),
    proposta('3', '2026-10-02', { integrada: true }),
    proposta('4', '2026-10-02', { integrada: true, dataIntegracao: '2026-10-05' }),
  ], '2026-10-04');
  assert.deepEqual(resumo.vendas, { qtd: 3, valor: 350 });
  assert.deepEqual(resumo.integrados, { qtd: 1, valor: 300 });
  assert.equal(resumo.semDataIntegracao, 1);
  assert.deepEqual(resumo.cancelados, { qtd: 1, valor: 150 });
});

test('Weeky mantém exceção da fonte, exclui encerradas das pendências e agrega hierarquia', () => {
  const resumo = montarWeeky([
    proposta('1', '2026-10-04', { excecao: true, valor: 200, hierarquiaInformada: false }),
    proposta('2', '2026-10-04', { frontReprovado: true }),
    proposta('3', '2026-10-04', { esteiraReprovada: true }),
    proposta('4', '2026-10-04', { integrada: true, dataIntegracao: '2026-10-04' }),
    proposta('5', '2026-10-04', { cancelada: true }),
  ], '2026-10-04');
  assert.deepEqual(resumo.pendentes, { qtd: 1, valor: 200 });
  assert.deepEqual(resumo.excecao, { qtd: 1, valor: 200 });
  assert.equal(resumo.semHierarquia, 1);
  assert.deepEqual(resumo.equipes, [{ nome: 'AKRK - Equipe', qtd: 5, valor: 600 }]);
  assert.deepEqual(resumo.produtos, [{ nome: 'Empréstimo', qtd: 5, valor: 600 }]);
});

test('Weeky vazio entrega sete dias sem criar valores', () => {
  const resumo = montarWeeky([], '2026-01-03');
  assert.equal(resumo.inicio, '2025-12-28');
  assert.deepEqual(resumo.vendas, { qtd: 0, valor: 0 });
  assert.equal(resumo.dias.length, 7);
  assert.deepEqual(resumo.equipes, []);
});
