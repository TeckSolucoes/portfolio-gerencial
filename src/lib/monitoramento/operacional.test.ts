import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparPorResponsavel, sinaisDaProposta, type PropostaMonitorada } from './operacional';

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
