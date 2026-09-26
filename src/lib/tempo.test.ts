import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataExtenso, tempoRelativo } from './tempo';

const agora = new Date('2026-09-26T15:00:00Z');
const antes = (ms: number) => new Date(agora.getTime() - ms);
const MIN = 60_000;

test('tempoRelativo cobre minutos, horas, dias e data antiga', () => {
  assert.equal(tempoRelativo(antes(20_000), agora), 'agora');
  assert.equal(tempoRelativo(antes(5 * MIN), agora), 'há 5 min');
  assert.equal(tempoRelativo(antes(59 * MIN), agora), 'há 59 min');
  assert.equal(tempoRelativo(antes(60 * MIN), agora), 'há 1 h');
  assert.equal(tempoRelativo(antes(3 * 60 * MIN + 30 * MIN), agora), 'há 3 h');
  assert.equal(tempoRelativo(antes(30 * 60 * MIN), agora), 'há 1 d');
  assert.equal(tempoRelativo(antes(10 * 24 * 60 * MIN), agora), '16/09');
});

test('tempoRelativo tolera nulo e datas no futuro', () => {
  assert.equal(tempoRelativo(null, agora), '');
  assert.equal(tempoRelativo(new Date(agora.getTime() + 5 * MIN), agora), 'agora');
});

test('dataExtenso em pt-BR no fuso de São Paulo', () => {
  assert.equal(dataExtenso(new Date('2026-09-26T02:00:00Z')), 'Sexta-feira, 25 de setembro de 2026');
});
