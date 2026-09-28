import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erroConsultaPortal, normalizarChavePortal } from './portalTransparencia';

test('normaliza espaços e aspas acidentais da chave', () => {
  assert.equal(normalizarChavePortal('  abc123  '), 'abc123');
  assert.equal(normalizarChavePortal('"abc123"'), 'abc123');
  assert.equal(normalizarChavePortal("'abc123'"), 'abc123');
  assert.equal(normalizarChavePortal(undefined), '');
});

test('explica falhas do Portal sem expor a chave', () => {
  assert.match(erroConsultaPortal(401, 'ceis'), /chave.*rejeitada.*401/i);
  assert.match(erroConsultaPortal(429, 'ceis'), /limite.*429/i);
  assert.match(erroConsultaPortal(503, 'cnep'), /CNEP.*503/i);
});
