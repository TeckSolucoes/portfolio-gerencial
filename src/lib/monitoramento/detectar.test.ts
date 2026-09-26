import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectar, PADRAO, porSemana } from './detectar';
import type { PropostaMonit } from './detectar';

// Dados sintéticos: só provam a regra, não representam promotora real.
const hist = (n: number, convenio: string): PropostaMonit[] =>
  Array.from({ length: n }, (_, i) => ({
    data: `2026-08-${String(1 + (i % 20)).padStart(2, '0')}`,
    unidade: 'P1',
    convenio,
    valor: 100,
    operador: 'op',
  }));
const dia = (data: string, convenio: string, n = 1): PropostaMonit[] =>
  Array.from({ length: n }, () => ({ data, unidade: 'P1', convenio, valor: 100, operador: 'op' }));

test('convênio nunca usado = INÉDITO, 1 alerta por dia e convênio', () => {
  const a = detectar([...hist(40, 'GOV SP'), ...dia('2026-09-01', 'GOV PI', 3)]);
  assert.equal(a.length, 1);
  assert.deepEqual(a[0].tipos, ['INÉDITO']);
  assert.equal(a[0].qtd, 3);
});

test('convênio abaixo de 2% do histórico = RARO', () => {
  const a = detectar([...hist(98, 'GOV SP'), ...hist(1, 'GOV PI'), ...dia('2026-09-01', 'GOV PI')]);
  assert.deepEqual(a[0].tipos, ['RARO']);
});

test('volume do dia acima de 3x a média diária do convênio = PICO', () => {
  const base = hist(60, 'GOV SP');
  assert.deepEqual(detectar([...base, ...dia('2026-09-01', 'GOV SP', 12)])[0].tipos, ['PICO']);
  assert.equal(detectar([...base, ...dia('2026-09-01', 'GOV SP', 2)]).length, 0);
});

test('menos de 30 propostas de histórico: sem padrão, sem alerta', () => {
  assert.equal(detectar([...hist(20, 'GOV SP'), ...dia('2026-09-01', 'GOV PI')]).length, 0);
});

test('histórico mais antigo que a janela não conta', () => {
  const antigo = hist(40, 'GOV SP').map((x) => ({ ...x, data: '2026-01-10' }));
  assert.equal(detectar([...antigo, ...dia('2026-09-01', 'GOV PI')], PADRAO).length, 0);
});

test('agrupa por semana começando na segunda', () => {
  const s = porSemana(detectar([...hist(40, 'GOV SP'), ...dia('2026-09-02', 'GOV PI')]));
  assert.deepEqual(s, [{ semana: '2026-08-31', INÉDITO: 1, RARO: 0, PICO: 0 }]);
});
