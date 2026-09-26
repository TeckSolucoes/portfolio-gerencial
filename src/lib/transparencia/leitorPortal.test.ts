import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataBr, lerCadastro, partirLinha } from './leitorPortal';

// Amostra sintética no formato do <AAAAMM>_Cadastro.csv (colunas reduzidas, pessoas inventadas).
const CAB =
  '"Id_SERVIDOR_PORTAL";"NOME";"CPF";"MATRICULA";"DESCRICAO_CARGO";"ORG_LOTACAO";"ORGSUP_EXERCICIO";"ORG_EXERCICIO";"SITUACAO_VINCULO";"DATA_INGRESSO_CARGOFUNCAO";"UF_EXERCICIO"';

test('linha CSV com aspas, separador dentro de aspas e aspas escapadas', () => {
  assert.deepEqual(partirLinha('"a";"b;c";"d ""e"""'), ['a', 'b;c', 'd "e"']);
  assert.deepEqual(partirLinha('1;;3'), ['1', '', '3']);
});

test('data brasileira vira ISO; texto vira vazio', () => {
  assert.equal(dataBr('05/10/2026'), '2026-10-05');
  assert.equal(dataBr('Sem informação'), '');
  assert.equal(dataBr(''), '');
});

test('lê o cadastro pelo nome das colunas', async () => {
  const r = await lerCadastro([
    '﻿' + CAB,
    '"123";"BRUNO REIS";"***.222.222-**";"***1234";"ANALISTA";"LOT X";"MINISTERIO DA SAUDE";"FUNDACAO NACIONAL DE SAUDE";"ATIVO PERMANENTE";"01/10/2026";"MA"',
    '"124";"SEM CPF";"";"***1";"X";"";"";"ORG";"";"";""',
    '',
  ]);
  assert.equal(r.ignoradas, 1);
  assert.deepEqual(r.servidores, [
    {
      id: '123',
      nome: 'BRUNO REIS',
      cpf6: '222222',
      orgao: 'FUNDACAO NACIONAL DE SAUDE',
      orgaoSuperior: 'MINISTERIO DA SAUDE',
      uf: 'MA',
      cargo: 'ANALISTA',
      situacao: 'ATIVO PERMANENTE',
      ingressoCargo: '2026-10-01',
    },
  ]);
});

test('coluna obrigatória ausente vira erro claro (formato mudou)', async () => {
  await assert.rejects(lerCadastro(['"ID";"NOME";"CPF"', '"1";"A";"***.111.111-**"']), /sem as colunas: Id_SERVIDOR_PORTAL, ORG_EXERCICIO/);
  await assert.rejects(lerCadastro([]), /vazio/);
});
