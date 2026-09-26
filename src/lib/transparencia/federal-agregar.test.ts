import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agregarFederal, parseLinhasFederal } from './federal-agregar';

// Dados sintéticos no formato do ServidorPorOrgaoDTO da API (só contagens).
const dto = (over: Record<string, unknown> = {}) => ({
  qntPessoas: 10,
  qntVinculos: 12,
  descSituacao: 'ATIVO PERMANENTE',
  descTipoVinculo: 'Cargo',
  descTipoServidor: 'Civil',
  licenca: 0,
  codOrgaoExercicioSiape: '1',
  nomOrgaoExercicioSiape: 'ORGAO A',
  nomOrgaoSuperiorExercicioSiape: 'MINISTERIO X',
  ...over,
});

test('parse ignora o que não é lista ou objeto e converte números e licença', () => {
  assert.deepEqual(parseLinhasFederal({ erro: true }), []);
  assert.equal(parseLinhasFederal([dto(), null, 'x']).length, 1);
  const [l] = parseLinhasFederal([dto({ licenca: 1, qntPessoas: '7' })]);
  assert.equal(l.pessoas, 7);
  assert.equal(l.licenca, true);
});

test('agrega por órgão superior, órgão, tipo e situação, ordenando por pessoas', () => {
  const a = agregarFederal(
    parseLinhasFederal([
      dto({ qntPessoas: 10, qntVinculos: 11 }),
      dto({ qntPessoas: 5, qntVinculos: 5, descSituacao: 'APOSENTADO' }),
      dto({
        qntPessoas: 30,
        qntVinculos: 30,
        codOrgaoExercicioSiape: '2',
        nomOrgaoExercicioSiape: 'ORGAO B',
        nomOrgaoSuperiorExercicioSiape: 'MINISTERIO Y',
        descTipoServidor: 'Militar',
      }),
    ]),
    new Date('2026-09-26T12:00:00Z'),
  );
  assert.equal(a.totalPessoas, 45);
  assert.equal(a.totalVinculos, 46);
  assert.deepEqual(a.porOrgaoSuperior.map((x) => [x.chave, x.pessoas]), [['MINISTERIO Y', 30], ['MINISTERIO X', 15]]);
  assert.deepEqual(a.porOrgao.map((x) => [x.chave, x.cod, x.pessoas]), [['ORGAO B', '2', 30], ['ORGAO A', '1', 15]]);
  assert.deepEqual(a.porTipoServidor.map((x) => x.chave), ['Militar', 'Civil']);
  assert.equal(a.porSituacao.length, 2);
  assert.equal(a.geradoEm, '2026-09-26T12:00:00.000Z');
});

test('campo vazio vira "(não informado)" em vez de sumir', () => {
  const a = agregarFederal(parseLinhasFederal([dto({ nomOrgaoSuperiorExercicioSiape: '' })]));
  assert.equal(a.porOrgaoSuperior[0].chave, '(não informado)');
});
