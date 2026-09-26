import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarPorTipo, porUnidade } from './resumo';
import type { Alerta } from './detectar';

const alerta = (unidade: string, tipos: Alerta['tipos']): Alerta => ({
  unidade,
  convenio: 'X',
  dia: '2026-09-01',
  tipos,
  qtd: 1,
  valor: 1,
  historico: 100,
  historicoConvenio: 0,
  participacao: 0,
  operadores: [],
});

test('porUnidade ordena por alertas e conta por tipo', () => {
  const r = porUnidade([alerta('A', ['RARO']), alerta('B', ['INÉDITO']), alerta('B', ['RARO', 'PICO'])]);
  assert.equal(r[0].unidade, 'B');
  assert.deepEqual([r[0].alertas, r[0].INÉDITO, r[0].RARO, r[0].PICO], [2, 1, 1, 1]);
});

test('porUnidade respeita o limite n', () => {
  assert.equal(porUnidade([alerta('A', ['RARO']), alerta('B', ['RARO'])], 1).length, 1);
});

test('filtrarPorTipo mantém alertas que contêm o tipo; null devolve todos', () => {
  const as = [alerta('A', ['RARO']), alerta('B', ['RARO', 'PICO'])];
  assert.equal(filtrarPorTipo(as, 'PICO').length, 1);
  assert.equal(filtrarPorTipo(as, null).length, 2);
});
