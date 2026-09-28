import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cnpjValido, formatarCnpj, somenteDigitos } from './cnpj';

test('valida, limpa e formata CNPJ brasileiro', () => {
  assert.equal(cnpjValido('19.131.243/0001-97'), true);
  assert.equal(somenteDigitos('19.131.243/0001-97'), '19131243000197');
  assert.equal(formatarCnpj('19131243000197'), '19.131.243/0001-97');
});

test('rejeita CNPJ com dígitos inválidos ou repetidos', () => {
  assert.equal(cnpjValido('19.131.243/0001-98'), false);
  assert.equal(cnpjValido('11.111.111/1111-11'), false);
  assert.equal(cnpjValido('123'), false);
});
