import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extrairToken, fonteImperatriz, montarAtos, parseResultadosPdf } from './imperatriz';

// Forma real de POST https://diariooficial.imperatriz.ma.gov.br/publicacoes-buscar (trechos encurtados).
const linha = (ed: string, data: string, trecho: string, arq: string) => `<tr>
  <td>${ed}</td>
  <td>${data}</td>
  <td>Edição Nº ${ed}, ${data}</td>
  <td style="font-size: 12px;">${trecho}</td>
  <td style="text-align: center;"><a href="https://diariooficial.imperatriz.ma.gov.br/upload/diario_oficial/${arq}.pdf" target="_blank"><i class="fa fa-download"></i></a></td>
</tr>`;

const FIXTURE = `<form><input type="hidden" name="_token" value="abc123TOKEN"></form>
<table id="example"><tbody><tr><td colspan="5">Nenhum registro encontrado!</td></tr></tbody></table>
<!-- Resultados da busca nos arquivos PDF -->
<h6>Resultados encontrados nos Diários Oficiais (PDF)</h6>
<table><thead><tr><th>Edição</th></tr></thead><tbody>
${linha('1420', '24/09/2026', '...art. 1º Fica suspenso o desconto em folha de consignatária credenciada, servidor CPF 123.456.789-09...', 'AAA')}
${linha('1403', '01/09/2026', '...na qual foram consignados apontamentos relacionados à regularidade do procedimento...', 'BBB')}
${linha('1401', '28/08/2026', '...FAZ SABER a BANCO OLÉ BONSUCESSO CONSIGNADO S.A, inscrita no CNPJ nº 71.371.686/0001-75...', 'CCC')}
${linha('1200', '02/01/2025', '...altera a margem consignável dos servidores municipais para 40%...', 'DDD')}
</tbody></table>`;

test('extrairToken lê o token CSRF da página', () => {
  assert.equal(extrairToken(FIXTURE), 'abc123TOKEN');
  assert.equal(extrairToken('<html></html>'), null);
});

test('parseResultadosPdf lê só a tabela de trechos e omite CPF', () => {
  const itens = parseResultadosPdf(FIXTURE);
  assert.equal(itens.length, 4);
  assert.equal(itens[0].id, '1420');
  assert.equal(itens[0].dataIso, '2026-09-24');
  assert.equal(itens[0].link, 'https://diariooficial.imperatriz.ma.gov.br/upload/diario_oficial/AAA.pdf');
  assert.ok(!itens[0].trecho.includes('123.456.789-09'));
  assert.match(itens[0].trecho, /\[CPF omitido\]/);
  assert.deepEqual(parseResultadosPdf('<html>sem resultados</html>'), []);
});

test('montarAtos mantém consignado em folha e descarta verbo consignar e nota de banco', () => {
  const atos = montarAtos(parseResultadosPdf(FIXTURE), '2026-08-01', ['PREF IMPERATRIZ MA']);
  assert.equal(atos.length, 1);
  assert.equal(atos[0].id, 'Diário Oficial de Imperatriz:1420');
  assert.deepEqual(atos[0].convenios, ['PREF IMPERATRIZ MA']);
  assert.ok(atos[0].assuntos.includes('Suspensão e vedação'));
  assert.equal(atos[0].prioritario, true);
});

test('montarAtos respeita o início do período', () => {
  const atos = montarAtos(parseResultadosPdf(FIXTURE), '2024-01-01', ['PREF IMPERATRIZ MA']);
  assert.deepEqual(atos.map((a) => a.data), ['2026-09-24', '2025-01-02']);
});

test('fonteImperatriz declara id, nome e convênio', () => {
  assert.equal(fonteImperatriz.id, 'imperatriz');
  assert.equal(fonteImperatriz.nome, 'Diário Oficial de Imperatriz');
  assert.deepEqual(fonteImperatriz.convenios, ['PREF IMPERATRIZ MA']);
});
