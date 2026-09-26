import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conveniosDe, ehExecutivoEstadual, itensDe, montarAtos, montarUrl } from './sp';

// Forma real da resposta de do-api-web-search.doe.sp.gov.br (campos reduzidos, texto resumido).
const FIXTURE = {
  items: [
    {
      isLegacy: false,
      id: 'a1',
      date: '2026-09-25T01:00:59.3009769',
      title: 'Despacho do Secretário, de 22-09-2026',
      slug: 'executivo/secretaria-de-gestao-e-governo-digital/despacho-do-secretario-de-22-09-2026-2026092211',
      excerpt: 'Nº do Processo: 018.00011660/2026-19 Interessado: BANCO GENIAL S.A. Assunto: Credenciamento consignação em folha de pagamento. INDEFIRO o pedido',
      hierarchy: 'Executivo > Atos Normativos > Secretaria de Gestão e Governo Digital > Gabinete do Secretário',
    },
    {
      id: 'a2',
      date: '2026-08-31T01:00:00',
      title: 'EXTRATO DE TERMO DE CONTRATO',
      slug: 'executivo/secretaria-de-gestao-e-governo-digital/extrato-de-termo-de-contrato-202608311',
      excerpt: 'Consignante: São Paulo Previdência – SPPREV Consignatária: ASSOCIAÇÃO DOS SERVIDORES Objeto: consignação em folha',
      hierarchy: 'Executivo > Atos de Gestão e Despesas > Secretaria de Gestão e Governo Digital > São Paulo Previdência',
    },
    {
      id: 'b1',
      date: '2026-09-01T01:00:00',
      title: 'Aviso nº 349/2026 - CSMP',
      slug: 'executivo/ministerio-publico/aviso-349',
      excerpt: 'Interessados: Banco Ole Consignado S.a. empréstimo consignado',
      hierarchy: 'Executivo > Atos Normativos > Ministério Público > Conselho Superior',
    },
    {
      id: 'b2',
      date: '2026-09-03T01:00:00',
      title: 'ADM - TERMO DE CREDENCIAMENTO',
      slug: 'municipios/araraquara/termo-de-credenciamento',
      excerpt: 'operações de crédito consignado aos servidores públicos municipais',
      hierarchy: 'Municípios > Araraquara > Prefeitura Municipal de Araraquara',
    },
    {
      id: 'b3',
      date: '2026-09-01T01:00:00',
      title: 'DESPACHO GVS-IX Nº 02',
      slug: 'executivo/secretaria-da-saude/despacho-02',
      excerpt: 'Fica consignado que o estabelecimento passará a integrar o cronograma',
      hierarchy: 'Executivo > Atos Normativos > Secretaria da Saúde > Centro de Vigilância Sanitária',
    },
    {
      id: 'b4',
      date: '2026-09-23T01:00:00',
      title: 'CONSIGNAÇÃO EM FOLHA DE PAGAMENTO PMESP',
      slug: 'executivo/pm/consignacao-pmesp',
      excerpt: 'Contrato nº CIAF-055/620/26 Finalidade: serviços técnicos de processamento',
      hierarchy: 'Executivo > Atos de Gestão e Despesas > Secretaria da Segurança Pública > Polícia Militar do Estado',
    },
    {
      id: 'c1',
      date: '2026-08-06T01:00:00',
      title: 'DECRETO Nº 70.783, DE 5 DE AGOSTO DE 2026',
      slug: 'executivo/decretos/decreto-n-70783-de-5-de-agosto-de-2026-2026080511',
      excerpt: 'somente serão admitidos com autorização expressa do consignado junto à entidade',
      hierarchy: 'Executivo > Atos Normativos > Decretos',
    },
  ],
  currentPage: 1,
  totalPages: 1,
  totalItems: 7,
  pageSize: 100,
  hasPreviousPage: false,
  hasNextPage: false,
};

test('montarUrl codifica termo com acento e datas', () => {
  const u = montarUrl('consignatária', 2, '2026-08-27', '2026-09-26');
  assert.match(u, /Terms%5B0%5D=consignat%C3%A1ria/);
  assert.match(u, /PageNumber=2/);
  assert.match(u, /FromDate=2026-08-27/);
});

test('ehExecutivoEstadual descarta município, MP e pessoal', () => {
  assert.equal(ehExecutivoEstadual('Executivo > Atos Normativos > Decretos'), true);
  assert.equal(ehExecutivoEstadual('Municípios > Araraquara'), false);
  assert.equal(ehExecutivoEstadual('Executivo > Atos Normativos > Ministério Público'), false);
  assert.equal(ehExecutivoEstadual('Executivo > Atos de Pessoal > Casa Civil'), false);
});

test('itensDe mantém só consignação do Executivo estadual e acrescenta o assunto ao título', () => {
  const itens = itensDe(FIXTURE);
  assert.deepEqual(itens.map((i) => i.id), ['a1', 'a2', 'c1']);
  assert.equal(itens[0].titulo, 'Despacho do Secretário, de 22-09-2026 - Credenciamento consignação em folha de pagamento');
  assert.equal(itens[0].dataIso, '2026-09-25');
  assert.equal(itens[0].orgao, 'Secretaria de Gestão e Governo Digital · Gabinete do Secretário');
  assert.equal(itens[0].link, 'https://doe.sp.gov.br/executivo/secretaria-de-gestao-e-governo-digital/despacho-do-secretario-de-22-09-2026-2026092211');
});

test('itensDe tolera resposta vazia ou sem campos', () => {
  assert.deepEqual(itensDe({}), []);
  assert.deepEqual(itensDe({ items: [{ title: 'x' }] }), []);
});

test('conveniosDe: SPPREV só no convênio SPPREV; demais nos dois', () => {
  const [a1, a2] = itensDe(FIXTURE);
  assert.deepEqual(conveniosDe(a1), ['GOV SAO PAULO SPPREV', 'GOV SÃO PAULO']);
  assert.deepEqual(conveniosDe(a2), ['GOV SAO PAULO SPPREV']);
});

test('montarAtos filtra por data, converte e ordena do mais recente', () => {
  const atos = montarAtos(itensDe(FIXTURE), '2026-08-01');
  assert.deepEqual(atos.map((a) => a.id), ['Diário Oficial do Estado de São Paulo:a1', 'Diário Oficial do Estado de São Paulo:a2', 'Diário Oficial do Estado de São Paulo:c1']);
  assert.equal(atos[0].prioritario, true);
  assert.ok(atos[0].assuntos.includes('Habilitação e convênio'));
  assert.deepEqual(montarAtos(itensDe(FIXTURE), '2026-09-10').map((a) => a.id.split(':')[1]), ['a1']);
});
