import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chavePessoa, compararMeses, cpfDoMeio, indicadorDaLista, normalizarNome, tipoDoNovo } from './clientesNovos';
import type { ServidorPortal } from './clientesNovos';

// Dados sintéticos: nomes e CPFs inventados, só provam as regras.
const s = (id: string, nome: string, cpf6: string, extra: Partial<ServidorPortal> = {}): ServidorPortal => ({
  id,
  nome,
  cpf6,
  orgao: 'Órgão A',
  orgaoSuperior: 'Ministério A',
  uf: 'MA',
  cargo: 'Analista',
  situacao: 'ATIVO PERMANENTE',
  ingressoCargo: '',
  ...extra,
});

test('nome normalizado ignora acento, caixa, pontuação e espaços extras', () => {
  assert.equal(normalizarNome('  José  da Silva-Júnior '), 'JOSE DA SILVA JUNIOR');
  assert.equal(normalizarNome("Maria D'Ávila"), 'MARIA D AVILA');
});

test('CPF do meio: completo, com zeros à esquerda e mascarado do Portal', () => {
  assert.equal(cpfDoMeio('987.123.456-10'), '123456');
  assert.equal(cpfDoMeio('98712345610'), '123456');
  assert.equal(cpfDoMeio('1234561'), '012345'); // 00001234561
  assert.equal(cpfDoMeio('***.123.456-**'), '123456');
  assert.equal(cpfDoMeio('***.12.456-**'), null);
  assert.equal(cpfDoMeio(''), null);
});

test('mesma pessoa no Portal (mascarado) e na nossa base (completo) gera a mesma chave', () => {
  assert.equal(chavePessoa('***.123.456-**', 'JOSE DA SILVA'), chavePessoa('987.123.456-10', 'José da Silva'));
  assert.notEqual(chavePessoa('***.123.456-**', 'JOSE DA SILVA'), chavePessoa('987.123.457-10', 'José da Silva'));
  // Homônimo com CPF diferente não colide.
  assert.notEqual(chavePessoa('***.123.456-**', 'JOSE DA SILVA'), chavePessoa('***.999.456-**', 'JOSE DA SILVA'));
  assert.equal(chavePessoa('***.123.456-**', ''), null);
});

test('recém-nomeado: ingresso no mês do arquivo ou no anterior', () => {
  assert.equal(tipoDoNovo(s('1', 'A', '111111', { ingressoCargo: '2026-10-03' }), '2026-10'), 'recem-nomeado');
  assert.equal(tipoDoNovo(s('1', 'A', '111111', { ingressoCargo: '2026-09-28' }), '2026-10'), 'recem-nomeado');
  assert.equal(tipoDoNovo(s('1', 'A', '111111', { ingressoCargo: '2026-08-31' }), '2026-10'), 'outro');
  assert.equal(tipoDoNovo(s('1', 'A', '111111'), '2026-10'), 'outro');
  assert.equal(tipoDoNovo(s('1', 'A', '111111', { ingressoCargo: '2025-12-15' }), '2026-01'), 'recem-nomeado');
});

test('compara meses: só quem entrou, tira quem já é cliente e conta cada pessoa uma vez', () => {
  const anteriores = new Set(['1', '2']);
  const nossaBase = new Set([chavePessoa('555.333.333-00', 'Carla Souza')!]);
  const atual = [
    s('1', 'ANA LIMA', '111111'), // já estava
    s('3', 'BRUNO REIS', '222222', { ingressoCargo: '2026-10-01', orgao: 'Órgão B' }), // novo, recém-nomeado
    s('3', 'BRUNO REIS', '222222', { cargo: 'Outro vínculo' }), // mesma pessoa, 2º vínculo
    s('4', 'CARLA SOUZA', '333333'), // novo, mas já é nossa cliente
    s('5', 'DANIEL ROCHA', '444444', { ingressoCargo: '2019-03-01' }), // novo por transferência
  ];
  const r = compararMeses('2026-10', atual, anteriores, nossaBase);
  assert.equal(r.totalServidores, 4);
  assert.equal(r.entraram, 3);
  assert.equal(r.jaClientes, 1);
  assert.deepEqual(r.acionaveis.map((x) => [x.id, x.tipo]), [['3', 'recem-nomeado'], ['5', 'outro']]);
  assert.equal(r.acionaveis[0].chave, chavePessoa('***.222.222-**', 'Bruno Reis'));
});

test('indicador: primeiro contrato depois da lista, por faixa, sem contar quem já tinha fechado antes', () => {
  const [a, b, c, d] = ['111111|A', '222222|B', '333333|C', '444444|D'].map((x) => chavePessoa(`***.${x.slice(0, 3)}.${x.slice(3, 6)}-**`, x.slice(7))!);
  const contratos = [
    { chave: a, data: '2026-10-20', valor: 3_000 },
    { chave: a, data: '2026-11-10', valor: 50_000 }, // 2º contrato de A: não muda a faixa
    { chave: b, data: '2026-11-05', valor: 12_000 },
    { chave: c, data: '2026-09-30', valor: 8_000 }, // antes da lista: não conta
    { chave: 'fora-da-lista', data: '2026-10-15', valor: 99_000 },
  ];
  const r = indicadorDaLista('2026-10', [a, b, c, d], contratos);
  assert.equal(r.acionaveis, 4);
  assert.equal(r.tomadores, 2);
  assert.equal(r.conversao, 50);
  assert.equal(r.valorTotal, 15_000);
  assert.deepEqual(r.porFaixa, [
    { rotulo: 'Até R$ 5 mil', tomadores: 1, valor: 3_000 },
    { rotulo: 'R$ 5 mil a R$ 20 mil', tomadores: 1, valor: 12_000 },
    { rotulo: 'Acima de R$ 20 mil', tomadores: 0, valor: 0 },
  ]);
});

test('indicador de lista vazia não divide por zero', () => {
  const r = indicadorDaLista('2026-10', [], []);
  assert.equal(r.conversao, 0);
  assert.equal(r.tomadores, 0);
});
