import assert from 'node:assert/strict';
import { test } from 'node:test';
import { montarAtos, parseBusca, parseCards, relevante } from './ma';

// Forma real de https://diariooficial.ma.gov.br/ajax.busca.php?termo=...&datai=...&dataf=...
// (es_html com um card por fragmento de página; textos encurtados).
const CARD_EXEC = `<div class="card flex-md-row mb-4 box-shadow h-md-250" style="border-radius:23px"><div class="card-body d-flex flex-column align-items-start"><strong class="d-inline-block mb-2 text-primary">EXECUTIVO</strong><div id="dataPub" class="mb-1 text-muted">Publicado em 16/05/2025</div><hr size="10" width="100%" color="#999" noshade><p class="card-text mb-auto">Acrescenta o inciso XII ao art. 5º do Decreto nº 28.798, de 21 de dezembro de
2012, que dispõe sobre as <span style="background-color:yellow; border-radius:8px;"><b>consignações em folha</b></span> de pagamento dos servidores
públicos civis, militares, dos aposentados
e pensionistas do Poder Executivo do Estado do Maranhão.</p><br/><p class="card-text mb-auto"><strong>P&aacute;gina: </strong>2</p> <hr size="10" width="100%" color="#999" noshade><a type="button" class="btn btn-primary btnVermais" data-toggle="modal" data-target="#gridSystemModal" onClick="setModal('EXECUTIVO','<strong><i>P&aacute;gina: 2</i></strong>','EX20250516','sgc/modulos/sgc_00/00/src/2025/05/EX20250516.png','2',)">👁 Ver mais</a></div></div>`;

const CARD_MUNICIPAL = `<div class="card flex-md-row mb-4 box-shadow h-md-250" style="border-radius:23px"><div class="card-body d-flex flex-column align-items-start"><strong class="d-inline-block mb-2 text-primary">TERCEIROS</strong><div id="dataPub" class="mb-1 text-muted">Publicado em 04/02/2025</div><hr><p class="card-text mb-auto">Dispõe sobre a gestão das <span style="background-color:yellow"><b>consignações em folha</b></span> de pagamento de pessoal no âmbito da Câmara Municipal.</p><br/><p class="card-text mb-auto"><strong>P&aacute;gina: </strong>7</p> <a onClick="setModal('TERCEIROS','<strong><i>P&aacute;gina: 7</i></strong>','TE20250204','sgc/x/TE20250204.png','7',)">Ver mais</a></div></div>`;

const CARD_ATA = `<div class="card flex-md-row mb-4 box-shadow h-md-250"><div class="card-body"><strong class="d-inline-block mb-2 text-primary">TERCEIROS</strong><div id="dataPub" class="mb-1 text-muted">Publicado em 17/09/2026</div><hr><p class="card-text mb-auto">A empresa detentora/<span style="background-color:yellow"><b>consignatária</b></span> desta ata de registro de preços será convocada.</p><br/><p class="card-text mb-auto"><strong>P&aacute;gina: </strong>3</p> <a onClick="setModal('TERCEIROS','<strong><i>P&aacute;gina: 3</i></strong>','TE20260917','sgc/x/TE20260917.png','3',)">Ver mais</a></div></div>`;

const CARD_CPF = `<div class="card flex-md-row mb-4"><div class="card-body"><strong class="text-primary">EXECUTIVO</strong><div id="dataPub">Publicado em 20/09/2026</div><p class="card-text mb-auto">Servidor CPF 123.***.203-78 teve <b>desconto em folha</b> de consignatária credenciada suspenso.</p><br/><p class="card-text mb-auto"><strong>P&aacute;gina: </strong>9</p> <a onClick="setModal('EXECUTIVO','<strong><i>P&aacute;gina: 9</i></strong>','EX20260920','sgc/x/EX20260920.png','9',)">Ver mais</a></div></div>`;

const resposta = (html: string) => ({ busca: { erro: false, scrollId: 'x', es_html: html, total: 4, totalFragmentos: 4, btnLoad: false, msn: 'processo ok' } });

test('parseCards extrai caderno, data, página, edição e link', () => {
  const [item] = parseCards(CARD_EXEC);
  assert.equal(item.dataIso, '2025-05-16');
  assert.equal(item.orgao, 'DOEMA - EXECUTIVO');
  assert.equal(item.link, 'https://diariooficial.ma.gov.br/download.php?arqv=1&arq=EX20250516#page=2');
  assert.match(item.id, /^EX20250516-p2-/);
  assert.match(item.trecho, /^Acrescenta o inciso XII ao art\. 5º do Decreto nº 28\.798/);
  assert.ok(!item.trecho.includes('<'));
  assert.match(item.titulo, /^EXECUTIVO - pág\. 2: /);
});

test('parseCards ignora HTML sem a forma esperada', () => {
  assert.deepEqual(parseCards('<html>manutenção</html>'), []);
  assert.deepEqual(parseCards(''), []);
});

test('parseBusca distingue erro, vazio e resultado', () => {
  assert.equal(parseBusca(null), undefined);
  assert.equal(parseBusca({ busca: { erro: true } }), undefined);
  assert.equal(parseBusca({ foo: 1 }), undefined);
  assert.deepEqual(parseBusca({ busca: { erro: false, total: 0, msn: 'Nada encontrado!' } }), []);
  assert.equal(parseBusca(resposta(CARD_EXEC))?.length, 1);
});

test('relevante descarta ata de registro, ato municipal e dotação', () => {
  const [exec] = parseCards(CARD_EXEC);
  const [mun] = parseCards(CARD_MUNICIPAL);
  const [ata] = parseCards(CARD_ATA);
  assert.equal(relevante(exec), true);
  assert.equal(relevante(mun), false);
  assert.equal(relevante(ata), false);
});

test('montarAtos converte, filtra por data, deduplica e marca GOV MARANHÃO', () => {
  const itens = [...parseCards(CARD_EXEC), ...parseCards(CARD_EXEC), ...parseCards(CARD_MUNICIPAL), ...parseCards(CARD_ATA)];
  const atos = montarAtos(itens, '2025-01-01');
  assert.equal(atos.length, 1);
  assert.deepEqual(atos[0].convenios, ['GOV MARANHÃO']);
  assert.equal(atos[0].fonte, 'Diário Oficial do Maranhão');
  assert.equal(atos[0].prioritario, true);
  assert.equal(atos[0].data, '2025-05-16');
  assert.deepEqual(montarAtos(itens, '2025-06-01'), []);
});

test('CPF, mesmo mascarado, não vaza para título nem trecho', () => {
  const atos = montarAtos(parseCards(CARD_CPF), '2026-01-01');
  assert.equal(atos.length, 1);
  assert.ok(!/\d{3}\.\*{3}|203-78/.test(atos[0].trecho + atos[0].titulo));
  assert.match(atos[0].trecho, /\[doc\]/);
});
