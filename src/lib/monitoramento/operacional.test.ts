import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparPorGerente, agruparPorResponsavel, chaveGerente, sinaisDaProposta, type PropostaMonitorada } from './operacional';

const proposta = (parcial: Partial<PropostaMonitorada> = {}): PropostaMonitorada => ({
  id: '1', gerente: 'Luana', equipe: 'AKRK - FLAMENGO', operador: 'Ana', convenio: 'INSS',
  criadaEm: '2026-09-20', atualizadaEm: '2026-09-29', statusFront: 'Em andamento', statusFuncao: '',
  esteira: '', motivo: '', temCodigoFuncao: true, ...parcial,
});

test('identifica objeção, reprovação e proposta sem atualização', () => {
  assert.deepEqual(sinaisDaProposta(proposta({ motivo: 'Cliente não reconhece', statusFront: 'Reprovado', atualizadaEm: '2026-09-25' }), '2026-10-01'), ['OBJECAO', 'REPROVADA', 'SEM_ATUALIZACAO']);
});

test('proposta concluída não entra como aguardando ou sem responsável', () => {
  assert.deepEqual(sinaisDaProposta(proposta({ operador: '', statusFront: 'Integrado', atualizadaEm: '2026-09-20' }), '2026-10-01'), []);
});

test('agrupa casos por responsável, mantém motivos e define próximo passo', () => {
  const pessoas = agruparPorResponsavel([
    proposta({ id: '1', motivo: 'Documento ilegível' }),
    proposta({ id: '2', motivo: 'Documento ilegível' }),
  ], '2026-10-01');
  assert.equal(pessoas.length, 1);
  assert.equal(pessoas[0].prioridade, 'CRITICA');
  assert.equal(pessoas[0].casos, 2);
  assert.deepEqual(pessoas[0].principaisMotivos, [{ motivo: 'Documento ilegível', quantidade: 2 }]);
  assert.match(pessoas[0].proximaAcao, /objeção/i);
});

test('gerentes: ordena pela proporção da carteira em alerta, não pelo volume', () => {
  const propostas = [
    proposta({ id: '1', gerente: 'Luana Cosme', motivo: 'Documento ilegível' }),
    proposta({ id: '2', gerente: 'Luana Cosme', atualizadaEm: '2026-09-25' }),
    proposta({ id: '3', gerente: 'Luana Cosme', atualizadaEm: '2026-09-30' }),
    proposta({ id: '4', gerente: 'Daniel Mansur', operador: '', atualizadaEm: '2026-09-25' }),
  ];
  const totais = new Map([[chaveGerente('Luana Cosme'), 30], [chaveGerente('Daniel Mansur'), 2]]);
  const [primeiro, segundo] = agruparPorGerente(propostas, totais, '2026-10-01');
  assert.equal(primeiro.gerente, 'Daniel Mansur'); // 1 de 2 = 50%
  assert.equal(primeiro.pct, 0.5);
  assert.equal(primeiro.semResponsavel, 1);
  assert.equal(segundo.gerente, 'Luana Cosme'); // 3 de 30 = 10%, mesmo com mais casos
  assert.deepEqual([segundo.emAlerta, segundo.critica, segundo.alta, segundo.media], [3, 1, 1, 1]);
  assert.equal(segundo.objecoes, 1);
});

test('gerentes: total nunca fica abaixo dos casos em alerta', () => {
  const [g] = agruparPorGerente([proposta({ motivo: 'x' })], new Map(), '2026-10-01');
  assert.equal(g.total, 1);
  assert.equal(g.pct, 1);
});
