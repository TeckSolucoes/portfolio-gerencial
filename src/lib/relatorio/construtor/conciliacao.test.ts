import test from 'node:test';
import assert from 'node:assert/strict';
import { agregarConciliado, resumirConciliacao, type PropostaFrontRelatorio, type PropostaFuncaoRelatorio } from './conciliacao';

const baseFront: PropostaFrontRelatorio = {
  id_front: 1, numero_proposta: '000000123', hora_cadastro: '2026-09-28 09:00', dia_cadastro: '2026-09-28',
  gerente: 'Maria', equipe: 'AKRK - A', operador: 'Ana', convenio: 'SIAPE', produto: 'Novo', modalidade: 'Margem',
  status_front: 'Enviada', status_funcao_v2: 'Andamento', esteira_funcao_v2: 'Formalização', valor_contrato: '1.500,00',
};

const baseFuncao: PropostaFuncaoRelatorio = {
  NumeroProposta: '000000123', status_funcao_raw: 'INT', status_funcao: 'Integrada', esteira_funcao: 'Pagamento concluído', valor_liberado: '1.200,00',
};

test('status e valor vêm diretamente da Função', () => {
  assert.deepEqual(agregarConciliado([baseFront], [baseFuncao], 'status_funcao', 'qtd_propostas'), [{ rotulo: 'Integrada', valor: 1 }]);
  assert.deepEqual(agregarConciliado([baseFront], [baseFuncao], null, 'valor_liberado'), [{ rotulo: 'Total', valor: 1200 }]);
});

test('valor liberado não duplica quando a proposta aparece repetida no Front', () => {
  const duplicada = { ...baseFront, id_front: 2 };
  assert.equal(agregarConciliado([baseFront, duplicada], [baseFuncao], null, 'valor_liberado')[0].valor, 1200);
});

test('resumo mostra ausência e divergência entre V2 e Função', () => {
  const ausente = { ...baseFront, id_front: 2, numero_proposta: '000000999', status_funcao_v2: 'Pendente' };
  assert.deepEqual(resumirConciliacao([baseFront, ausente], [baseFuncao]), {
    propostasFront: 2, enviadasFuncao: 2, encontradasFuncao: 1, ausentesFuncao: 1, divergenciasStatus: 1,
  });
});
