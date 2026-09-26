import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converter, fonteSPCap, latin1, parseResultados } from './spcap';

const bloco = (o: { orgao: string; sigla: string; proc: string; assunto: string; doc: string; tipo: string; data: string; veiculo: string; resumo: string }) =>
  `<div class="dadosDocumento"><i class="detalhesDocumento"><span class="detalhesOrgao">
   ${o.sigla}
   <span class="tooltiptext">${o.orgao}</span>
 </span>&nbsp;>&nbsp;</i><span class="negrito">Processo: </span><a href="http://processos.prefeitura.sp.gov.br/x" target="_blank" class="nroSei">${o.proc}</a> - ${o.assunto}<br /><div class="alinhar__itens__documento"><span class="negrito">Documento: </span><a href="http://diariooficial.prefeitura.sp.gov.br/md_epubli_visualizar.php?tok${o.doc},," target="_blank" class="nroSei">${o.doc}</a> <span> - ${o.tipo}</span></div><span class="dataPublicacao">Publicado em ${o.data}</span> &nbsp; | &nbsp; <span class="veiculo">${o.veiculo}</span><p class="resumoDocumento"> ${o.resumo}<b>&nbsp;&nbsp;...&nbsp;&nbsp;</b></p></div>`;

const FIXTURE = `<div class="resultadobusca">${[
  bloco({ orgao: 'Secretaria Municipal de Gestão', sigla: 'SEGES', proc: '6013.2026/0006390-5', assunto: 'Gestão de Pessoas: Cadastramento de Consignatário', doc: '164432290', tipo: 'Despacho', data: '08/09/2026', veiculo: 'Atos do Executivo', resumo: 'Solicitação de credenciamento junto a PMSP - modalidade <b>Empréstimo Consignado</b> DESPACHO I' }),
  bloco({ orgao: 'Secretaria Municipal de Gestão', sigla: 'SEGES', proc: '6013.2026/0006532-0', assunto: 'Comunicações Administrativas: Ofício', doc: '163826969', tipo: 'Comunicado', data: '01/09/2026', veiculo: 'Servidores', resumo: 'liberação da <b>margem consignável</b>. Dessa forma' }),
  bloco({ orgao: 'Câmara Municipal de São Paulo', sigla: 'CMSP', proc: '6510.2026/0000212-6', assunto: 'Publicações Oficiais', doc: '165616691', tipo: 'Comunicado', data: '23/09/2026', veiculo: 'Atos da CMSP', resumo: 'margem consignável correspondente' }),
  bloco({ orgao: 'Secretaria Municipal da Fazenda', sigla: 'SF', proc: '6021.2026/0046254-4', assunto: 'Dívida ativa', doc: '165757713', tipo: 'Decisão Tributária', data: '25/09/2026', veiculo: 'Atos do Executivo', resumo: '<b>consignado</b> no presente processo determino' }),
  bloco({ orgao: 'Secretaria Municipal de Gestão', sigla: 'SEGES', proc: '6013.2025/0000001-1', assunto: 'Consignatária antiga', doc: '100000001', tipo: 'Despacho', data: '01/01/2020', veiculo: 'Atos do Executivo', resumo: 'descredenciamento como entidade <b>consignatária</b>' }),
].join('')}</div>`;

test('parseResultados extrai campos, decodifica entidades e usa https', () => {
  const itens = parseResultados(FIXTURE);
  assert.equal(itens.length, 4); // o bloco da Câmara é descartado
  const [a, b] = itens;
  assert.equal(a.id, '164432290');
  assert.equal(a.titulo, 'Despacho - Gestão de Pessoas: Cadastramento de Consignatário');
  assert.equal(a.orgao, 'Secretaria Municipal de Gestão');
  assert.equal(a.dataIso, '2026-09-08');
  assert.match(a.link, /^https:\/\/diariooficial\.prefeitura\.sp\.gov\.br\/md_epubli_visualizar\.php\?tok/);
  assert.ok(a.trecho.includes('Empréstimo Consignado') && !a.trecho.includes('<'));
  assert.equal(b.titulo, 'Comunicado - Comunicações Administrativas: Ofício');
});

test('parseResultados devolve [] para HTML sem resultados', () => {
  assert.deepEqual(parseResultados('<html>nada</html>'), []);
});

test('converter filtra por data, descarta particípio "consignado" e marca convênio', () => {
  const atos = converter(parseResultados(FIXTURE), '2026-08-27');
  assert.deepEqual(atos.map((a) => a.id), ['Diário Oficial da Cidade de São Paulo:164432290', 'Diário Oficial da Cidade de São Paulo:163826969']);
  assert.deepEqual(atos[0].convenios, ['PREF SÃO PAULO SP']);
  assert.equal(atos[0].fonte, 'Diário Oficial da Cidade de São Paulo');
  assert.equal(atos[0].prioritario, true);
});

test('fonteSPCap declara identidade e não lança quando o fetch falha', async () => {
  assert.equal(fonteSPCap.id, 'spcap');
  assert.deepEqual(fonteSPCap.convenios, ['PREF SÃO PAULO SP']);
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('sem rede');
  }) as typeof fetch;
  try {
    assert.equal(await fonteSPCap.buscar('mes'), null);
  } finally {
    globalThis.fetch = original;
  }
});

test('latin1 codifica acentos em ISO-8859-1 (exigência do portal)', () => {
  assert.equal(latin1('consignatária'), 'consignat%E1ria');
  assert.equal(latin1('27/08/2026'), '27%2F08%2F2026');
});
