import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empresaDaEquipe, gravarEmpresas, lerEmpresas } from './empresas';
import {
  abasPermitidas,
  escolherAba,
  escolherEmpresa,
  filtrarPorEmpresa,
  montarAcesso,
  podeVerAba,
  podeVerEmpresa,
  statusMonitoramento,
  resolverFuncionalidades,
} from './permissoes';

test('permissão do usuário prevalece sobre perfil e ausência nega', () => {
  const regras = resolverFuncionalidades(
    [{ funcionalidade: 'diario_oficial', permitido: true }, { funcionalidade: 'transparencia', permitido: false }],
    [{ funcionalidade: 'diario_oficial', permitido: false }, { funcionalidade: 'transparencia', permitido: true }],
  );
  assert.equal(regras.diario_oficial, false);
  assert.equal(regras.transparencia, true);
  assert.equal(regras.custos, false);
  assert.equal(regras.noc, false);
  assert.equal(regras.juridico, false);
  assert.equal(regras.roteiros, false);
});

const usuario = (over: Partial<Parameters<typeof montarAcesso>[0]> = {}) =>
  montarAcesso({ id: 'u1', role: 'visualizador', displayName: 'Fulano', empresas: '', escopoGerente: null, ...over });

test('empresa vem do prefixo da equipe; sem prefixo conhecido é null', () => {
  assert.equal(empresaDaEquipe('AKRK - PRAIA DO FLAMENGO'), 'AKRK');
  assert.equal(empresaDaEquipe('akrk - usa'), 'AKRK');
  assert.equal(empresaDaEquipe('DIG - EQUIPE 1'), 'DIG');
  assert.equal(empresaDaEquipe('CAPITAL - X'), null);
  assert.equal(empresaDaEquipe(''), null);
});

test('lista de empresas ignora lixo, caixa e repetição', () => {
  assert.deepEqual(lerEmpresas('dig, AKRK,xpto,AKRK'), ['AKRK', 'DIG']);
  assert.deepEqual(lerEmpresas(''), []);
  assert.deepEqual(lerEmpresas(null), []);
  assert.equal(gravarEmpresas(['DIG', 'lixo']), 'DIG');
});

test('visualizador sem empresa não vê nada; com empresa vê só a dele', () => {
  assert.equal(podeVerEmpresa(usuario(), 'AKRK'), false);
  const akrk = usuario({ empresas: 'AKRK' });
  assert.equal(podeVerEmpresa(akrk, 'AKRK'), true);
  assert.equal(podeVerEmpresa(akrk, 'DIG'), false);
});

test('empresa não identificada só o superadmin vê', () => {
  assert.equal(podeVerEmpresa(usuario({ empresas: 'AKRK,DIG' }), null), false);
  assert.equal(podeVerEmpresa(usuario({ role: 'superadmin' }), null), true);
});

test('superadmin vê todas as empresas mesmo sem cadastro', () => {
  assert.deepEqual(usuario({ role: 'superadmin' }).empresas, ['AKRK', 'DIG']);
});

test('escopo de gerente limita à própria aba e esconde o Geral', () => {
  const luana = usuario({ role: 'gerente', empresas: 'AKRK', escopoGerente: 'Luana' });
  assert.equal(podeVerAba(luana, 'Luana Cosme'), true);
  assert.equal(podeVerAba(luana, 'Daniel Mansur'), false);
  assert.equal(podeVerAba(luana, 'Geral'), false);
  assert.equal(podeVerAba(usuario({ empresas: 'AKRK' }), 'Geral'), true);
});

const ABAS = ['Geral', 'Luana Cosme', 'Adriano Monteiro'];

test('sem empresa: nenhuma empresa escolhida, monitoramento bloqueado', () => {
  const u = usuario();
  assert.equal(escolherEmpresa(u, 'AKRK'), null);
  assert.equal(statusMonitoramento(u), 'sem-empresa');
});

test('uma empresa: pedido de outra empresa cai na dela', () => {
  const u = usuario({ empresas: 'AKRK' });
  assert.equal(escolherEmpresa(u, 'DIG'), 'AKRK');
  assert.equal(escolherEmpresa(u, undefined), 'AKRK');
  assert.equal(escolherEmpresa(u, 'akrk'), 'AKRK');
  assert.equal(statusMonitoramento(u), 'ok');
});

test('duas empresas: escolhe a pedida, senão a primeira', () => {
  const u = usuario({ empresas: 'DIG,AKRK' });
  assert.equal(escolherEmpresa(u, 'DIG'), 'DIG');
  assert.equal(escolherEmpresa(u, 'xpto'), 'AKRK');
});

test('gerente com escopo: só a própria aba, nunca Geral nem outro gerente', () => {
  const u = usuario({ empresas: 'AKRK', escopoGerente: 'Luana' });
  assert.deepEqual(abasPermitidas(u, ABAS), ['Luana Cosme']);
  assert.equal(escolherAba(u, 'Geral', ABAS), 'Luana Cosme');
  assert.equal(escolherAba(u, 'Adriano Monteiro', ABAS), 'Luana Cosme');
  assert.equal(escolherAba(u, undefined, ABAS), 'Luana Cosme');
  assert.equal(statusMonitoramento(u), 'so-empresa-inteira');
});

test('gerente com escopo que não existe nas abas não recebe nada', () => {
  const u = usuario({ empresas: 'AKRK', escopoGerente: 'Fulano' });
  assert.equal(escolherAba(u, 'Geral', ABAS), null);
});

test('superadmin: todas as abas, todas as empresas, monitoramento liberado', () => {
  const u = usuario({ role: 'superadmin', escopoGerente: 'Luana' });
  assert.deepEqual(abasPermitidas(u, ABAS), ABAS);
  assert.equal(escolherEmpresa(u, 'DIG'), 'DIG');
  assert.equal(statusMonitoramento(u), 'ok');
});

test('filtrarPorEmpresa: empresa null só o superadmin; outra empresa nunca vaza', () => {
  const itens = ['AKRK - A', 'DIG - B', 'CAPITAL - C'];
  const filtrar = (u: ReturnType<typeof usuario>) => filtrarPorEmpresa(u, itens, empresaDaEquipe);
  assert.deepEqual(filtrar(usuario()), []);
  assert.deepEqual(filtrar(usuario({ empresas: 'AKRK' })), ['AKRK - A']);
  assert.deepEqual(filtrar(usuario({ empresas: 'AKRK,DIG' })), ['AKRK - A', 'DIG - B']);
  assert.deepEqual(filtrar(usuario({ role: 'superadmin' })), itens);
});
