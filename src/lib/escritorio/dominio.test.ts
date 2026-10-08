import assert from 'node:assert/strict';
import test from 'node:test';
import { autorizarEscritorio, validarMensagem, estaOnline, validarSessao } from './dominio';
test('escritório exige perfil e funcionalidade', () => {
  assert.doesNotThrow(() => autorizarEscritorio('superadmin', true));
  for (const perfil of ['gerente', 'visualizador']) assert.throws(() => autorizarEscritorio(perfil, true));
  assert.throws(() => autorizarEscritorio('superadmin', false));
});
test('mensagem rejeita vazio e conteúdo excedente', () => {
  assert.equal(validarMensagem(' olá '), 'olá');
  for (const texto of ['', ' ', null, 'a'.repeat(1001)]) assert.throws(() => validarMensagem(texto));
  assert.equal(validarMensagem('a'.repeat(1000)).length, 1000);
});
test('presença expira exatamente em 90 segundos', () => {
  const agora = new Date(100000);
  assert.equal(estaOnline(new Date(10001), agora), true);
  assert.equal(estaOnline(new Date(10000), agora), false);
});
test('identificador de sessão tem formato e tamanho limitado', () => {
  assert.throws(() => validarSessao('../'));
  assert.doesNotThrow(() => validarSessao('a'.repeat(32)));
});
