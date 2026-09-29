import assert from 'node:assert/strict';
import test from 'node:test';
import { campoRelatorio, validarVisao, VISOES_PADRAO } from './catalogo';

test('todas as visões padrão usam combinações permitidas', () => {
  for (const visao of VISOES_PADRAO) {
    assert.doesNotThrow(() => validarVisao(visao.dimensao, visao.metrica, visao.grafico));
  }
});

test('rejeita campo enviado fora do catálogo', () => {
  assert.throws(() => campoRelatorio('DROP TABLE proposals'), /não permitido/);
});

test('indicador não exige dimensão', () => {
  const visao = validarVisao(null, 'qtd_propostas', 'indicador');
  assert.equal(visao.dimensao, null);
});

