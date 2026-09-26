import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atosDeHits, conveniosDoTrecho, itensDeHits, relevanteMG, type HitMG } from './mg';

// Forma real de PesquisarJornaisPaginados (texto sem acento, um trecho por página).
const hit = (idJornal: number, dia: string, pagina: number, textoResultado: string): HitMG => ({
  idJornal,
  dataPublicacao: `${dia}T00:00:00`,
  tipoCaderno: 'Diário do Executivo',
  textoResultado,
  pagina,
});

const PM = 'Altera a margem consignavel dos militares da Policia Militar de Minas Gerais e dispoe sobre consignacao em folha de pagamento';

const FIXTURE: HitMG[] = [
  hit(328001, '2026-01-23', 36, 'por falta de recadastramento Por este termo, fica esta Entidade Consignataria intimada a tomar ciencia do inteiro teor do Processo SEI'),
  hit(330001, '2026-09-18', 9, 'Correicao Administrativa Controladoria Setorial Coordenacao de Consignacao em Folha de Pessoal Diretoria Central de Processamento do Pagamento'),
  hit(330032, '2026-09-23', 57, 'de materiais medico-hospitalares, em regime de consignacao, necessarios a realizacao dos procedimentos cirurgicos'),
  hit(330500, '2026-09-10', 1, PM),
  hit(330500, '2026-09-10', 1, PM),
  hit(330600, '2026-09-12', 4, 'Secretaria de Estado de Planejamento e Gestao define teto de juros para consignatarias de servidores civis'),
  hit(330700, '2026-09-15', 2, 'Suspende a averbacao de consignacao em folha de pagamento de servidor publico ativo ou inativo'),
];

const P = 'Diário Oficial de Minas Gerais';

test('relevanteMG barra consignação mercantil e nome de unidade', () => {
  assert.equal(relevanteMG(FIXTURE[2].textoResultado), false);
  assert.equal(relevanteMG(FIXTURE[1].textoResultado), false);
  assert.equal(relevanteMG(FIXTURE[0].textoResultado), true);
  assert.equal(relevanteMG('valores conforme consignado no Termo'), false);
});

test('itensDeHits deduplica por edição+página e monta título sem inventar', () => {
  const itens = itensDeHits(FIXTURE);
  assert.equal(itens.length, 4);
  const pm = itens.find((i) => i.id === '330500-p1')!;
  assert.equal(pm.titulo, 'Jornal Minas Gerais, Diário do Executivo de 10/09/2026, p. 1');
  assert.equal(pm.dataIso, '2026-09-10');
  assert.ok(pm.link.startsWith('https://'));
});

test('conveniosDoTrecho separa PMMG, SEPLAG e geral', () => {
  assert.deepEqual(conveniosDoTrecho('militares da Policia Militar de Minas Gerais'), ['GOV MINAS GERAIS PMMG']);
  assert.deepEqual(conveniosDoTrecho('Secretaria de Estado de Planejamento e Gestao'), ['GOV MINAS GERAIS SEPLAG']);
  assert.deepEqual(conveniosDoTrecho('servidor publico ativo ou inativo'), ['GOV MINAS GERAIS SEPLAG', 'GOV MINAS GERAIS PMMG']);
});

test('atosDeHits filtra por data, atribui convênios e ordena do mais novo', () => {
  const atos = atosDeHits(FIXTURE, '2026-09-01');
  assert.deepEqual(atos.map((a) => a.id), [`${P}:330700-p2`, `${P}:330600-p4`, `${P}:330500-p1`]);
  assert.deepEqual(atos[1].convenios, ['GOV MINAS GERAIS SEPLAG']);
  assert.deepEqual(atos[2].convenios, ['GOV MINAS GERAIS PMMG']);
  assert.ok(atos[1].assuntos.includes('Juros e taxas'));
  assert.ok(atos[0].assuntos.includes('Suspensão e vedação'));
  assert.equal(atos[0].fonte, P);
  assert.equal(atosDeHits(FIXTURE, '2026-12-01').length, 0);
  assert.deepEqual(atosDeHits([], '2026-01-01'), []);
});
