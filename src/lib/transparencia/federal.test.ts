import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coletarLinhas } from './federal';

const linha = { qntPessoas: 3, qntVinculos: 3, descSituacao: 'ATIVO', descTipoVinculo: 'Cargo', descTipoServidor: 'Civil', licenca: 0, codOrgaoExercicioSiape: '1', nomOrgaoExercicioSiape: 'A', nomOrgaoSuperiorExercicioSiape: 'M' };

const resposta = (status: number, corpo: unknown = []) => new Response(JSON.stringify(corpo), { status });

// fetch falso: devolve as respostas da fila, na ordem, e guarda as URLs e cabeçalhos pedidos.
function falso(fila: Response[]) {
  const chamadas: { url: string; chave: string | null }[] = [];
  const buscar = (async (url: string, init?: RequestInit) => {
    chamadas.push({ url, chave: new Headers(init?.headers).get('chave-api-dados') });
    return fila.shift() ?? resposta(200, []);
  }) as unknown as typeof fetch;
  return { buscar, chamadas };
}

test('pagina até a resposta vazia, enviando a chave no cabeçalho', async () => {
  const { buscar, chamadas } = falso([resposta(200, [linha, linha]), resposta(200, [linha]), resposta(200, [])]);
  const linhas = await coletarLinhas({ chave: 'abc', buscar, pausaMs: 0 });
  assert.equal(linhas.length, 3);
  assert.equal(chamadas.length, 3);
  assert.ok(chamadas[1].url.endsWith('?pagina=2'));
  assert.ok(chamadas.every((c) => c.chave === 'abc'));
});

test('chave recusada (401/403) vira erro claro, sem insistir', async () => {
  const { buscar, chamadas } = falso([resposta(401)]);
  await assert.rejects(coletarLinhas({ chave: 'x', buscar, pausaMs: 0 }), /Chave da API recusada/);
  assert.equal(chamadas.length, 1);
});

test('429 espera e tenta a mesma página de novo; segundo 429 desiste', async () => {
  const ok = falso([resposta(429), resposta(200, [linha]), resposta(200, [])]);
  assert.equal((await coletarLinhas({ chave: 'x', buscar: ok.buscar, pausaMs: 0, espera429Ms: 0 })).length, 1);
  assert.ok(ok.chamadas[0].url.endsWith('?pagina=1') && ok.chamadas[1].url.endsWith('?pagina=1'));

  const ruim = falso([resposta(429), resposta(429)]);
  await assert.rejects(coletarLinhas({ chave: 'x', buscar: ruim.buscar, pausaMs: 0, espera429Ms: 0 }), /Limite de requisições/);
});

test('respeita o máximo de páginas', async () => {
  const { buscar, chamadas } = falso([resposta(200, [linha]), resposta(200, [linha]), resposta(200, [linha])]);
  await coletarLinhas({ chave: 'x', buscar, pausaMs: 0, maxPaginas: 2 });
  assert.equal(chamadas.length, 2);
});
