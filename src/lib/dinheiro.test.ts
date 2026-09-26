import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesValido, parseValorBR, somarMeses, ultimosMeses, formatarInputBR } from './dinheiro';

test('parseValorBR aceita formatos pt-BR e simples', () => {
  const v = (s: string) => {
    const r = parseValorBR(s);
    return r.ok ? r.valor : null;
  };
  assert.equal(v('8.000.000,00'), 8_000_000);
  assert.equal(v('8000000'), 8_000_000);
  assert.equal(v('R$ 8.000,50'), 8000.5);
  assert.equal(v('8.000'), 8000);
  assert.equal(v('8000.5'), 8000.5);
  assert.equal(v('0'), null);
  assert.equal(v('1234,5'), 1234.5);
});

test('parseValorBR rejeita vazio, negativo, lixo e absurdo', () => {
  for (const s of ['', '   ', '-5', '-1.000,00', 'abc', 'NaN', 'Infinity', '1,2,3', '1e5', '1.00.000', '2000000000000']) {
    assert.equal(parseValorBR(s).ok, false, s);
  }
  assert.equal(parseValorBR(null).ok, false);
  assert.equal(parseValorBR('1.000.000.000.000').ok, true);
});

test('meses: validação, aritmética e viragem de ano', () => {
  assert.equal(mesValido('2026-09'), true);
  assert.equal(mesValido('2026-13'), false);
  assert.equal(mesValido('2026-9'), false);
  assert.equal(somarMeses('2026-01', -1), '2025-12');
  assert.equal(somarMeses('2026-12', 1), '2027-01');
  assert.deepEqual(ultimosMeses('2026-02', 3), ['2026-02', '2026-01', '2025-12']);
});

test('formatarInputBR usa milhar e vírgula', () => {
  assert.equal(formatarInputBR(8_000_000), '8.000.000,00');
});
