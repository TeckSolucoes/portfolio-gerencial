import { test } from 'node:test';
import assert from 'node:assert/strict';
import { celula, gerarPlanilha } from './planilha';

test('célula: aspas quando tem ; ou aspas, e fórmula vira texto', () => {
  assert.equal(celula('ANA'), 'ANA');
  assert.equal(celula('A;B'), '"A;B"');
  assert.equal(celula('DIZ "OI"'), '"DIZ ""OI"""');
  assert.equal(celula('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(celula('+55'), "'+55");
  assert.equal(celula('-1'), "'-1");
});

test('planilha: BOM, cabeçalho em português, CPF parcial e data brasileira', () => {
  const csv = gerarPlanilha([
    {
      mes: '2026-10',
      tipo: 'recem-nomeado',
      nome: 'BRUNO REIS',
      cpf6: '222333',
      orgao: 'Órgão; B',
      orgaoSuperior: 'Ministério',
      uf: 'MA',
      cargo: 'Analista',
      situacao: 'ATIVO',
      ingressoCargo: '2026-10-01',
    },
  ]);
  assert.ok(csv.startsWith('﻿Mês;Tipo;Nome;CPF (parcial);Órgão;'));
  assert.equal(csv.split('\r\n')[1], '2026-10;Recém-nomeado;BRUNO REIS;***.222.333-**;"Órgão; B";Ministério;MA;Analista;ATIVO;01/10/2026');
});
