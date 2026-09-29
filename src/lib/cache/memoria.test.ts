import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCache } from './memoria';

test('duas chamadas simultâneas para a mesma chave calculam uma vez só', async () => {
  let chamadas = 0;
  const cache = criarCache<number>();
  const calcular = async () => {
    chamadas += 1;
    return 42;
  };
  const [a, b] = await Promise.all([cache.obter('x', 60_000, calcular), cache.obter('x', 60_000, calcular)]);
  assert.equal(a, 42);
  assert.equal(b, 42);
  assert.equal(chamadas, 1);
});

test('dentro do TTL devolve do cache sem recalcular; fora do TTL recalcula', async () => {
  let t = 0;
  let chamadas = 0;
  const cache = criarCache<number>(() => t);
  const calcular = async () => {
    chamadas += 1;
    return chamadas;
  };
  assert.equal(await cache.obter('x', 1000, calcular), 1);
  t = 999;
  assert.equal(await cache.obter('x', 1000, calcular), 1); // ainda dentro do TTL
  t = 1000;
  assert.equal(await cache.obter('x', 1000, calcular), 2); // venceu
});

test('chaves diferentes não se misturam', async () => {
  const cache = criarCache<string>();
  await cache.obter('a', 60_000, async () => 'valor-a');
  await cache.obter('b', 60_000, async () => 'valor-b');
  assert.equal(await cache.obter('a', 60_000, async () => 'outro'), 'valor-a');
  assert.equal(await cache.obter('b', 60_000, async () => 'outro'), 'valor-b');
});

test('erro não fica preso em "em andamento": a próxima chamada tenta de novo', async () => {
  const cache = criarCache<number>();
  await assert.rejects(
    cache.obter('x', 60_000, async () => {
      throw new Error('falhou');
    }),
  );
  assert.equal(await cache.obter('x', 60_000, async () => 7), 7);
});

test('invalidar força recálculo mesmo dentro do TTL', async () => {
  let chamadas = 0;
  const cache = criarCache<number>();
  const calcular = async () => {
    chamadas += 1;
    return chamadas;
  };
  assert.equal(await cache.obter('x', 60_000, calcular), 1);
  cache.invalidar('x');
  assert.equal(await cache.obter('x', 60_000, calcular), 2);
});
