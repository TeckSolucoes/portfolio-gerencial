import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarAbasRelatorio } from './abas';

test('abas usam gerentes oficiais por ID quando a Estrutura Comercial está cadastrada', () => {
  const abas = montarAbasRelatorio([{ id: 'g-1', nome: 'Luana Cosme' }]);
  assert.deepEqual(abas.slice(0, 2), [
      { escopo: 'Geral', rotulo: 'Geral', gerenteComercialId: null },
      { escopo: 'Luana Cosme', rotulo: 'Luana', gerenteComercialId: 'g-1' },
    ]);
  assert.equal(abas.filter((aba) => aba.escopo === 'Luana Cosme').length, 1);
  assert.ok(abas.some((aba) => aba.escopo === 'Marcos Mota' && aba.gerenteComercialId === null));
});

test('abas preservam a operação legada até o primeiro cadastro oficial', () => {
  const abas = montarAbasRelatorio([]);
  assert.equal(abas[0].escopo, 'Geral');
  assert.ok(abas.some((aba) => aba.escopo === 'Marcos Mota' && aba.gerenteComercialId === null));
});
