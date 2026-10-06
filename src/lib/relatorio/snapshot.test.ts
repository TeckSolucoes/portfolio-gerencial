import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarEstadosFuncao, mesclarPropostas, watermarkSql } from './snapshot';
import type { Proposta } from './types';

const proposta = (numero: string, integrada = false) => ({ numero, integrada }) as Proposta;

test('snapshot incremental adiciona novas propostas e atualiza as já conhecidas', () => {
  const resultado = mesclarPropostas([proposta('1'), proposta('2')], [proposta('2', true), proposta('3')]);
  assert.deepEqual(resultado.map((item) => [item.numero, item.integrada]), [
    ['1', false],
    ['2', true],
    ['3', false],
  ]);
});

test('snapshot atualiza integração tardia e releases de proposta criada antes do dia', () => {
  const antiga = {
    ...proposta('10'),
    data: '2026-09-20',
    temCodigoFuncao: true,
    valorLiberado: 50,
  } as Proposta;
  const [atualizada] = aplicarEstadosFuncao([antiga], [{
    numero: '10',
    integrada: true,
    cancelada: false,
    esteiraReprovada: false,
    dataIntegracao: '2026-10-05',
    valorLiberado: 90,
  }]);
  assert.equal(atualizada.data, '2026-09-20');
  assert.equal(atualizada.dataIntegracao, '2026-10-05');
  assert.equal(atualizada.integrada, true);
  assert.equal(atualizada.valorLiberado, 90);
  assert.equal(atualizada.conciliadaFuncao, true);
});

test('snapshot substitui estados corrigidos pela Função em vez de mantê-los grudados', () => {
  const antiga = {
    ...proposta('11', true),
    temCodigoFuncao: true,
    status: 'Em análise',
    cancelada: true,
    esteiraReprovada: true,
    dataIntegracao: '2026-10-01',
    valorLiberado: 100,
  } as Proposta;
  const [atualizada] = aplicarEstadosFuncao([antiga], [{
    numero: '11',
    integrada: false,
    cancelada: false,
    esteiraReprovada: false,
  }]);
  assert.equal(atualizada.integrada, false);
  assert.equal(atualizada.cancelada, false);
  assert.equal(atualizada.esteiraReprovada, false);
  assert.equal(atualizada.valorLiberado, undefined);
  assert.equal(atualizada.dataIntegracao, undefined);
});

test('atualização incremental preserva proposta ausente do lote de mudanças', () => {
  const antiga = { ...proposta('12', true), temCodigoFuncao: true, conciliadaFuncao: true } as Proposta;
  const [preservada] = aplicarEstadosFuncao([antiga], [], { ausentes: 'preservar' });
  assert.equal(preservada.integrada, true);
  assert.equal(preservada.conciliadaFuncao, true);
});

test('INT sem evento datado não inventa data de integração', () => {
  const antiga = { ...proposta('13'), temCodigoFuncao: true, status: 'Em análise' } as Proposta;
  const [integrada] = aplicarEstadosFuncao([antiga], [{ numero: '13', integrada: true, cancelada: false, esteiraReprovada: false }]);
  assert.equal(integrada.dataIntegracao, undefined);
});

test('watermark mantém UTC com formato DATETIME aceito pelo MySQL', () => {
  assert.equal(watermarkSql('2026-10-06T09:15:23.123Z'), '2026-10-06 09:15:23.123');
});
