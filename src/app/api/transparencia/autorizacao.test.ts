import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { restricaoOperacaoNominal } from './autorizacao';

test('operação nominal exige autenticação', () => {
  assert.deepEqual(restricaoOperacaoNominal(undefined), { erro: 'Não autenticado.', status: 401 });
  assert.deepEqual(restricaoOperacaoNominal(null), { erro: 'Não autenticado.', status: 401 });
});

for (const role of ['gerente', 'visualizador']) {
  test(`operação nominal bloqueia ${role}`, () => {
    assert.deepEqual(restricaoOperacaoNominal(role), { erro: 'Ação restrita a superadmin.', status: 403 });
  });
}

test('operação nominal permite exclusivamente superadmin', () => {
  assert.equal(restricaoOperacaoNominal('superadmin'), null);
});

test('rotas nominais validam o papel atual carregado do banco, não o papel do JWT', () => {
  for (const arquivo of ['base/route.ts', 'planilha/route.ts']) {
    const fonte = readFileSync(new URL(arquivo, import.meta.url), 'utf8');
    assert.match(fonte, /restricaoOperacaoNominal\(acesso\.perfil\)/);
    assert.doesNotMatch(fonte, /restricaoOperacaoNominal\(session\?\.user\?\.role\)/);
  }
});

test('ações de superadmin consultam o papel atual do usuário no banco', () => {
  const fonte = readFileSync(new URL('../../../lib/authz.ts', import.meta.url), 'utf8');
  assert.match(fonte, /prisma\.user\.findUnique/);
  assert.match(fonte, /usuario\?\.role !== 'superadmin'/);
  assert.doesNotMatch(fonte, /session\.user\.role !== 'superadmin'/);
});
