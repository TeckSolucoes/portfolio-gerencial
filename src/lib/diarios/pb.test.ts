import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consolidar, dataDaEdicao, parseRss, urlBusca } from './pb';

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>x</title>
<item><title>Diário Oficial 03-06-2026 Eduardo.indd - A União</title><link>https://news.google.com/rss/articles/AAA?oc=5</link><guid isPermaLink="false">AAA</guid><pubDate>Wed, 03 Jun 2026 07:00:00 GMT</pubDate><source url="https://auniao.pb.gov.br">A União</source></item>
<item><title>ATOS DO PODER EXECUTIVO - A União</title><link>https://news.google.com/rss/articles/BBB?oc=5</link><guid isPermaLink="false">BBB</guid><pubDate>Wed, 22 Jan 2025 08:00:00 GMT</pubDate></item>
<item><title>SECRETARIAS DE ESTADO - A União</title><link>https://news.google.com/rss/articles/CCC?oc=5</link><guid isPermaLink="false">CCC</guid><pubDate>Sat, 30 May 2026 07:00:00 GMT</pubDate></item>
<item><title>sem guid - A União</title><link>https://news.google.com/rss/articles/DDD</link><pubDate>Sat, 30 May 2026 07:00:00 GMT</pubDate></item>
</channel></rss>`;

test('dataDaEdicao prefere a data do título e cai para pubDate', () => {
  assert.equal(dataDaEdicao('Diário Oficial 03-06-2026 Eduardo.indd', 'Mon, 01 Jan 2024 00:00:00 GMT'), '2026-06-03');
  assert.equal(dataDaEdicao('ATOS DO PODER EXECUTIVO', 'Wed, 22 Jan 2025 08:00:00 GMT'), '2025-01-22');
  assert.equal(dataDaEdicao('x', 'lixo'), '');
});

test('parseRss extrai itens válidos e ignora sem guid', () => {
  const itens = parseRss(FIXTURE, 'consignado');
  assert.equal(itens.length, 3);
  assert.equal(itens[0].dataIso, '2026-06-03');
  assert.equal(itens[0].titulo, 'Diário Oficial da Paraíba de 03/06/2026: Diário Oficial 03-06-2026 Eduardo');
  assert.ok(itens[0].link.startsWith('https://'));
  assert.equal(itens[1].dataIso, '2025-01-22');
});

test('consolidar filtra por período, deduplica e monta AtoOficial', () => {
  const itens = [...parseRss(FIXTURE, 'consignado'), ...parseRss(FIXTURE, 'consignação')];
  const atos = consolidar(itens, 'mes', new Date('2026-06-10T12:00:00Z'));
  assert.deepEqual(atos.map((a) => a.data), ['2026-06-03', '2026-05-30']);
  assert.deepEqual(atos[0].convenios, ['GOV PARAÍBA']);
  assert.match(atos[0].fonte ?? '', /via Google Notícias/);
  assert.equal(atos[0].id, 'Diário Oficial da Paraíba (via Google Notícias):AAA');
  assert.equal(consolidar(itens, 'ano', new Date('2027-01-01T12:00:00Z')).length, 2);
  assert.equal(consolidar([], 'mes').length, 0);
});

test('urlBusca restringe ao domínio e à janela', () => {
  const u = decodeURIComponent(urlBusca('consignado', 'semana'));
  assert.match(u, /q=consignado site:auniao\.pb\.gov\.br when:7d/);
});
