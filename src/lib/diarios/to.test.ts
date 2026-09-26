import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairEdicoes, edicoesParaItens, montarAtos, fonteTO } from './to';

const linha = (n: string, data: string, id: string) => `
  <tr>
    <td>Nº ${n}</td>
    <td>${data}</td>
    <td>213 pág.</td>
    <td>2.28 MB</td>
    <td>12.674</td>
    <td><a href="https://doe.to.gov.br/diario/${id}/download" title="Edição ${n}" target="_blank">Baixar</a></td>
    <span class="sr-only" id="download${n}">Baixar edição ${n}</span>
  </tr>`;

const FIXTURE = `<html><section class="search-results"><h5>Resultados da busca</h5><table><thead><tr><th>Edição</th></tr></thead>
<tbody>${linha('7083', '19/06/2026', '5718')}${linha('7076', '10/06/2026', '5711')}</tbody></table></section></html>`;
const VAZIA = `<h5>Resultados da busca</h5><table><tbody><tr><td colspan="6">Nenhum resultado encontrado.</td></tr></tbody></table>`;

test('extrairEdicoes lê número, data, link e páginas', () => {
  const eds = extrairEdicoes(FIXTURE)!;
  assert.equal(eds.length, 2);
  assert.deepEqual(eds[0], { docId: '5718', numero: '7083', dataIso: '2026-06-19', paginas: '213', link: 'https://doe.to.gov.br/diario/5718/download' });
});

test('extrairEdicoes: sem resultado devolve [] e página estranha devolve null', () => {
  assert.deepEqual(extrairEdicoes(VAZIA), []);
  assert.equal(extrairEdicoes('<html>Bad Gateway</html>'), null);
});

test('edicoesParaItens junta termos da mesma edição', () => {
  const eds = extrairEdicoes(FIXTURE)!;
  const itens = edicoesParaItens(new Map([['margem consignável', [eds[0]]], ['consignatária', [eds[0], eds[1]]]]));
  assert.equal(itens.length, 2);
  assert.match(itens[0].trecho, /margem consignável, consignatária/);
});

test('montarAtos aplica período e converte para AtoOficial', () => {
  const eds = extrairEdicoes(FIXTURE)!;
  const mapa = new Map([['margem consignável', eds]]);
  const hoje = new Date('2026-06-25T12:00:00Z');
  const semana = montarAtos(mapa, 'semana', hoje);
  assert.equal(semana.length, 1);
  assert.equal(semana[0].data, '2026-06-19');
  assert.equal(semana[0].fonte, 'Diário Oficial do Tocantins');
  assert.deepEqual(semana[0].convenios, ['GOV TOCANTINS IGEPREV']);
  assert.equal(semana[0].assuntos.includes('Margem'), true);
  assert.equal(montarAtos(mapa, 'mes', hoje).length, 2);
});

test('fonteTO tem a identidade esperada', () => {
  assert.equal(fonteTO.id, 'to');
  assert.deepEqual(fonteTO.convenios, ['GOV TOCANTINS IGEPREV']);
});
