import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificar } from './diarioOficial';

const item = (over: Record<string, string>) => ({
  urlTitle: 'ato-1',
  title: 'INSTRUÇÃO NORMATIVA PRES/INSS Nº 213, DE 17 DE AGOSTO DE 2026',
  pubDate: '19/08/2026',
  content: 'suspende a averbação de <span class="highlight">consignado</span> e altera a margem',
  hierarchyStr: 'Ministério da Previdência Social/Instituto Nacional do Seguro Social',
  ...over,
});

test('ato do INSS que fala de consignado entra como prioritário, com convênio e assuntos', () => {
  const [a] = classificar([item({})]);
  assert.equal(a.prioritario, true);
  assert.deepEqual(a.convenios, ['INSS']);
  assert.equal(a.data, '2026-08-19');
  assert.equal(a.link, 'https://www.in.gov.br/web/dou/-/ato-1');
  assert.ok(a.assuntos.includes('Margem') && a.assuntos.includes('Suspensão e vedação'));
  assert.ok(!a.trecho.includes('<'));
});

test('ruído fora: extrato de contrato, licitação e atos de tribunais', () => {
  const r = classificar([
    item({ urlTitle: 'a', title: 'EXTRATO DE CONTRATO Nº 3/2026' }),
    item({ urlTitle: 'b', title: 'AVISO DE LICITAÇÃO' }),
    item({ urlTitle: 'c', title: 'ATO NORMATIVO Nº 996, DE 4 DE SETEMBRO DE 2026', hierarchyStr: 'Poder Judiciário/Superior Tribunal Militar' }),
  ]);
  assert.equal(r.length, 0);
});

test('sem a palavra consign no título nem no trecho, não entra', () => {
  assert.equal(classificar([item({ content: 'trata de licença médica', title: 'PORTARIA PRES/INSS Nº 1' })]).length, 0);
});

test('duplicado sai uma vez e Gestão vira SIAPE', () => {
  const r = classificar([
    item({ urlTitle: 'x', title: 'PORTARIA MGI Nº 984, DE 19 DE FEVEREIRO DE 2026', hierarchyStr: 'Ministério da Gestão e da Inovação em Serviços Públicos' }),
    item({ urlTitle: 'x', title: 'PORTARIA MGI Nº 984, DE 19 DE FEVEREIRO DE 2026', hierarchyStr: 'Ministério da Gestão e da Inovação em Serviços Públicos' }),
  ]);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].convenios, ['SIAPE']);
});

test('prioritários vêm primeiro, depois por data mais recente', () => {
  const r = classificar([
    item({ urlTitle: 'p1', pubDate: '01/01/2026' }),
    item({ urlTitle: 'p2', pubDate: '01/06/2026' }),
    item({ urlTitle: 'o', pubDate: '30/09/2026', title: 'PORTARIA Nº 1', hierarchyStr: 'Ministério da Agricultura/Gabinete' }),
  ]);
  assert.deepEqual(r.map((x) => x.id), ['p2', 'p1', 'o']);
});
