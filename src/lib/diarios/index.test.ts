import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COBERTURA, FONTES } from './index';

test('toda fonte tem id único e uma nota de cobertura para a tela', () => {
  const ids = FONTES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of FONTES) assert.ok(COBERTURA[f.id], `sem cobertura para ${f.id}`);
  assert.ok(COBERTURA.dou);
});

test('cada convênio dos 10 mais vendidos (exceto SIAPE, coberto pelo DOU) tem uma fonte', () => {
  const cobertos = new Set(FONTES.flatMap((f) => f.convenios));
  for (const c of [
    'GOV MARANHÃO',
    'GOV TOCANTINS IGEPREV',
    'GOV SAO PAULO SPPREV',
    'GOV PARAÍBA',
    'GOV MINAS GERAIS SEPLAG',
    'GOV MINAS GERAIS PMMG',
    'GOV SÃO PAULO',
    'PREF IMPERATRIZ MA',
    'PREF SÃO PAULO SP',
  ]) {
    assert.ok(cobertos.has(c), `convênio sem fonte: ${c}`);
  }
});
