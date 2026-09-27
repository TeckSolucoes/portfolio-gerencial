import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarConvenio } from './convenios';

test('normaliza acento, caixa e espaços dos convênios conhecidos', () => {
  assert.equal(normalizarConvenio(' gov sao paulo '), 'GOV SÃO PAULO');
  assert.equal(normalizarConvenio('GOV SÃO PAULO SPPREV'), 'GOV SÃO PAULO SPPREV');
  assert.equal(normalizarConvenio('gov paraiba'), 'GOV PARAÍBA');
  assert.equal(normalizarConvenio('  SIAPE  '), 'SIAPE');
});
