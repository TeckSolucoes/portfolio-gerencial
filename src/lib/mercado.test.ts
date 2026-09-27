import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ultimoIndicadorValido } from './mercado';

test('Banco Central ignora data futura e escolhe o último valor válido', () => {
  const linhas = [
    { data: '25/09/2026', valor: '14.90' },
    { data: '28/09/2026', valor: '15.00' },
    { data: '26/09/2026', valor: '14.95' },
  ];
  assert.deepEqual(ultimoIndicadorValido(linhas, new Date('2026-09-27T15:00:00Z')), linhas[2]);
});

test('Banco Central descarta datas e valores inválidos', () => {
  assert.equal(ultimoIndicadorValido([{ data: 'hoje', valor: '10' }, { data: '26/09/2026', valor: 'x' }], new Date('2026-09-27T15:00:00Z')), null);
});
