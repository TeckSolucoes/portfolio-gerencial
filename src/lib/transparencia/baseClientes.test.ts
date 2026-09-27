import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataQualquer, detectarSeparador, efetivado, importarBase, valorBr } from './baseClientes';
import { chavePessoa } from './clientesNovos';

// Dados sintéticos: CPFs e nomes inventados.

test('valor em formato brasileiro, americano e com R$', () => {
  assert.equal(valorBr('12.500,00'), 12500);
  assert.equal(valorBr('12500.00'), 12500);
  assert.equal(valorBr('R$ 3.000,50'), 3000.5);
  assert.equal(valorBr(''), 0);
});

test('data dd/mm/aaaa, ISO e ISO com hora', () => {
  assert.equal(dataQualquer('15/09/2026'), '2026-09-15');
  assert.equal(dataQualquer('2026-09-15'), '2026-09-15');
  assert.equal(dataQualquer('2026-09-15 14:22:01'), '2026-09-15');
  assert.equal(dataQualquer(''), '');
});

test('separador detectado pelo cabeçalho', () => {
  assert.equal(detectarSeparador('cpf;nome;valor'), ';');
  assert.equal(detectarSeparador('cpf,nome,valor'), ',');
  assert.equal(detectarSeparador('cpf\tnome\tvalor'), '\t');
});

test('importa o SELECT do Função (vírgula, nomes em minúsculas) sem guardar CPF nem nome', () => {
  const r = importarBase(
    [
      'cpf,nome,data_contrato,valor,convenio,status,promotora',
      '98712345610,José da Silva,2026-09-15,12500.00,SIAPE,PAGO,AKRK',
      '11122233344,Maria Souza,2026-09-16,3000.00,SIAPE,CANCELADO,DIG',
      ',Sem CPF,2026-09-16,100,SIAPE,PAGO,DIG',
    ].join('\n'),
  );
  assert.equal(r.ignoradas, 1);
  assert.equal(r.linhas.length, 2);
  assert.equal(r.linhas[0].chave, chavePessoa('***.123.456-**', 'JOSE DA SILVA'));
  assert.deepEqual(Object.keys(r.linhas[0]).sort(), ['chave', 'data', 'status', 'valor']);
  assert.deepEqual(r.colunas, { cpf: 'CPF', nome: 'NOME', data: 'DATA_CONTRATO', valor: 'VALOR', status: 'STATUS' });
  assert.deepEqual(r.status, [
    { status: 'PAGO', qtd: 1 },
    { status: 'CANCELADO', qtd: 1 },
  ]);
});

test('importa export com ponto e vírgula, acentos no cabeçalho e valor brasileiro', () => {
  const r = importarBase('﻿CPF Cliente;Nome Cliente;Data de Cadastro;Valor Liberado\n987.123.456-10;JOSE DA SILVA;15/09/2026;12.500,00\n');
  assert.equal(r.linhas[0].valor, 12500);
  assert.equal(r.linhas[0].data, '2026-09-15');
});

test('sem coluna de CPF ou nome: erro mostrando as colunas encontradas', () => {
  assert.throws(() => importarBase('documento;cliente_nome\n1;A'), /Faltam as colunas: CPF, NOME\. Colunas encontradas: DOCUMENTO, CLIENTE_NOME/);
  assert.throws(() => importarBase(''), /vazio/);
});

test('status que contam como contrato fechado', () => {
  assert.equal(efetivado('PAGO'), true);
  assert.equal(efetivado('INTEGRADA'), true);
  assert.equal(efetivado('AVERBADO'), true);
  assert.equal(efetivado('CANCELADO'), false);
  assert.equal(efetivado('REPROVADO'), false);
  assert.equal(efetivado(''), true); // arquivo sem status: já vem filtrado
});
