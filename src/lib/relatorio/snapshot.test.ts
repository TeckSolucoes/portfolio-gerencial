import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesclarPropostas } from './snapshot';
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
