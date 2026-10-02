import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerSistema, normalizarUrl } from './sistemas';

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

test('url: completa o https, aceita http e recusa outros esquemas', () => {
  assert.equal(normalizarUrl('crm2.consigfront.com.br'), 'https://crm2.consigfront.com.br/');
  assert.equal(normalizarUrl('http://intranet.local/x'), 'http://intranet.local/x');
  assert.equal(normalizarUrl(''), null);
  assert.equal(normalizarUrl('javascript:alert(1)'), undefined);
  assert.equal(normalizarUrl('ftp://arquivos.exemplo.com'), undefined);
});

test('sistema: exige nome, categoria e classificação; situação padrão é ativo', () => {
  const r = lerSistema(form({ nome: ' Teck Sign ', categoria: 'Assinatura', classificacao: 'interno', url: 'sign.tecksolucoes.com.br' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.dados.nome, 'Teck Sign');
    assert.equal(r.dados.situacao, 'ativo');
    assert.equal(r.dados.url, 'https://sign.tecksolucoes.com.br/');
    assert.equal(r.dados.empresa, null);
  }
  assert.equal(lerSistema(form({ categoria: 'X', classificacao: 'interno' })).ok, false);
  assert.equal(lerSistema(form({ nome: 'X', categoria: 'X', classificacao: 'outro' })).ok, false);
  assert.equal(lerSistema(form({ nome: 'X', categoria: 'X', classificacao: 'externo', url: 'javascript:alert(1)' })).ok, false);
});
