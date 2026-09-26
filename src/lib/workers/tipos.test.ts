import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estaVencido, intervaloValido, proximaExecucao } from './tipos';

const t = (s: string) => new Date(s);

test('nunca rodou: vence já', () => {
  const agora = t('2026-09-26T12:00:00Z');
  assert.equal(estaVencido(null, 30, agora), true);
  assert.equal(proximaExecucao(null, 30, agora).getTime(), agora.getTime());
});

test('vence exatamente no início da última execução + intervalo', () => {
  const inicio = t('2026-09-26T12:00:00Z');
  assert.equal(estaVencido(inicio, 30, t('2026-09-26T12:29:59Z')), false);
  assert.equal(estaVencido(inicio, 30, t('2026-09-26T12:30:00Z')), true);
  assert.equal(proximaExecucao(inicio, 30).toISOString(), '2026-09-26T12:30:00.000Z');
});

test('intervalo: inteiro entre 5 minutos e 7 dias', () => {
  assert.equal(intervaloValido(5), true);
  assert.equal(intervaloValido(4), false);
  assert.equal(intervaloValido(7 * 24 * 60), true);
  assert.equal(intervaloValido(7 * 24 * 60 + 1), false);
  assert.equal(intervaloValido(30.5), false);
  assert.equal(intervaloValido(Number.NaN), false);
});
