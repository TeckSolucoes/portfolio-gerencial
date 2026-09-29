import assert from 'node:assert/strict';
import test from 'node:test';
import { validarConsultaLeitura, variaveisAusentes } from './politica';

test('aceita somente comandos de leitura', () => {
  for (const sql of ['SELECT 1', 'SHOW DATABASES', 'DESCRIBE tabela', 'EXPLAIN SELECT 1', 'WITH x AS (SELECT 1) SELECT * FROM x']) {
    assert.doesNotThrow(() => validarConsultaLeitura(sql));
  }
});

test('bloqueia escrita mesmo escondida depois de WITH', () => {
  for (const sql of ['UPDATE tabela SET valor = 1', 'DELETE FROM tabela', 'WITH x AS (SELECT 1) DELETE FROM tabela']) {
    assert.throws(() => validarConsultaLeitura(sql), /leitura|escrita/);
  }
});

test('lista variáveis ausentes sem expor valores', () => {
  const ambiente = { FRONT_V1_DB_HOST: 'host', FRONT_V1_DB_PORT: '3306' };
  assert.deepEqual(variaveisAusentes('front-v1', ambiente), ['FRONT_V1_DB_USER', 'FRONT_V1_DB_PASS']);
});
