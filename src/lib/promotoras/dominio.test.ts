import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerPromotora, resumirAlteracoes } from './dominio';

function formulario(valores: Record<string, string> = {}) {
  const form = new FormData();
  for (const [chave, valor] of Object.entries({ empresa: 'AKRK', nome: 'Parceira', origem: 'manual', ativo: 'true', ...valores })) form.set(chave, valor);
  return form;
}
test('cadastro aceita opcionais vazios e normaliza CNPJ', () => {
  assert.equal(lerPromotora(formulario()).cnpj, null);
  assert.equal(lerPromotora(formulario({ cnpj: '19.131.243/0001-97' })).cnpj, '19131243000197');
  assert.equal(lerPromotora(formulario({ ativo: 'false' })).ativo, false);
});
test('rejeita CNPJ incorreto e texto descartável', () => {
  for (const cnpj of ['19.131.243/0001-98', '11.111.111/1111-11', 'abc19131243000197']) assert.throws(() => lerPromotora(formulario({ cnpj })), /CNPJ/);
});
test('valida empresa, origem, nome e situação na entrada', () => {
  const casos: Record<string, string>[] = [{ empresa: 'OUTRA' }, { origem: 'api' }, { nome: ' ' }, { ativo: 'yes' }];
  for (const valores of casos) assert.throws(() => lerPromotora(formulario(valores)));
});
test('histórico identifica alterações e ignora salvamento sem mudança', () => {
  const dados = lerPromotora(formulario());
  assert.equal(resumirAlteracoes(null, dados), 'Promotora cadastrada');
  assert.equal(resumirAlteracoes(dados, dados), '');
  assert.equal(resumirAlteracoes(dados, { ...dados, ativo: false, gerenteComercialId: 'g1' }), 'Alterações: situação, gerente');
});
