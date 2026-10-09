import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { carregarFoto, ErroFoto, fotoExiste, lerCorpoFoto, lerIdFoto, LIMITE_FOTO_BYTES, mimeFoto, origemPermitida, salvarFoto, validarFoto } from './fotos';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test('origem pública configurada aceita HTTPS atrás de proxy HTTP e prevalece sobre URL interna', () => {
  const interna = 'http://app:3000/api/promotoras/fotos/ceo-roberto';
  const publica = 'https://portal.example.test';
  assert.equal(origemPermitida(interna, publica, 'same-origin', publica), true);
  assert.equal(origemPermitida(interna, publica, null, `${publica}/base`), true);
  assert.equal(origemPermitida(interna, 'http://app:3000', 'same-origin', publica), false);
  assert.equal(origemPermitida('https://atacante.test/foto', 'https://atacante.test', 'same-origin', publica), false);
  for (const origin of [null, 'null', 'https://portal.example.test.atacante.test', 'http://portal.example.test']) assert.equal(origemPermitida(interna, origin, 'same-origin', publica), false);
  for (const secfetch of ['cross-site', 'same-site', 'none', '']) assert.equal(origemPermitida(interna, publica, secfetch, publica), false);
  assert.equal(origemPermitida(interna, publica, 'same-origin', 'url-inválida'), false);
});

test('sem configuração pública, dev usa a origem da requisição e rejeita outro host ou porta', () => {
  const reqUrl = 'http://localhost:3000/api/promotoras/fotos/ceo-roberto';
  assert.equal(origemPermitida(reqUrl, 'http://localhost:3000', 'same-origin'), true);
  assert.equal(origemPermitida(reqUrl, 'http://localhost:3000', null), true);
  assert.equal(origemPermitida(reqUrl, 'http://localhost:3001', 'same-origin'), false);
  assert.equal(origemPermitida(reqUrl, 'http://atacante.test', 'same-origin'), false);
});

test('IDs de foto aceitam CEO e UUIDs prefixados, bloqueando caminhos e IDs arbitrários', () => {
  assert.equal(lerIdFoto('ceo-roberto').tipo, 'ceo');
  for (const tipo of ['gerente', 'promotora']) assert.equal(lerIdFoto(`${tipo}-550e8400-e29b-41d4-a716-446655440000`).tipo, tipo);
  for (const id of ['../ceo-roberto', 'ceo-outra', 'gerente-abc', 'promotora-550e8400-e29b-41d4-a716-446655440000/..']) assert.throws(() => lerIdFoto(id), ErroFoto);
});

test('magic reconhece raster permitido e rejeita SVG, vazio, assinatura truncada e MIME divergente', () => {
  assert.equal(validarFoto(png, 'image/png'), 'image/png');
  assert.equal(mimeFoto(Buffer.from([255, 216, 255, 224])), 'image/jpeg');
  assert.equal(mimeFoto(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
  for (const bytes of [Buffer.alloc(0), png.subarray(0, 7), Buffer.from('<svg></svg>'), Buffer.from('RIFF0000WEBPxxxx')]) assert.throws(() => mimeFoto(bytes), ErroFoto);
  for (const mime of ['image/jpeg', 'image/svg+xml', null]) assert.throws(() => validarFoto(png, mime), ErroFoto);
});

test('tamanho aceita o limite exato e rejeita um byte a mais', () => {
  const bytes = Buffer.alloc(LIMITE_FOTO_BYTES);
  png.copy(bytes);
  assert.equal(validarFoto(bytes, 'image/png'), 'image/png');
  assert.throws(() => validarFoto(Buffer.alloc(LIMITE_FOTO_BYTES + 1), 'image/png'), (erro: unknown) => erro instanceof ErroFoto && erro.status === 413);
});

test('leitura limita stream sem confiar no Content-Length e cancela ao exceder', async () => {
  let cancelado = false;
  const body = new ReadableStream<Uint8Array>({
    start(controlador) {
      controlador.enqueue(Buffer.alloc(LIMITE_FOTO_BYTES));
      controlador.enqueue(Buffer.alloc(1));
    },
    cancel() { cancelado = true; },
  });
  const req = new Request('http://localhost/foto', { method: 'PUT', body, duplex: 'half', headers: { 'content-type': 'image/png', 'content-length': '8' } } as RequestInit);
  await assert.rejects(lerCorpoFoto(req), (erro: unknown) => erro instanceof ErroFoto && erro.status === 413);
  assert.equal(cancelado, true);
  assert.deepEqual(await lerCorpoFoto(new Request('http://localhost/foto', { method: 'PUT', body: png, headers: { 'content-type': 'image/png' } })), png);
});

test('volume persiste e substitui foto sem deixar temporários e informa ausência', async () => {
  const diretorioAnterior = process.cwd();
  const pasta = await mkdtemp(join(tmpdir(), 'teck-fotos-'));
  try {
    process.chdir(pasta);
    assert.equal(await fotoExiste('ceo-roberto'), false);
    assert.equal(await carregarFoto('ceo-roberto'), null);
    await salvarFoto('ceo-roberto', png, 'image/png');
    assert.equal(await fotoExiste('ceo-roberto'), true);
    const jpeg = Buffer.from([255, 216, 255, 224]);
    await salvarFoto('ceo-roberto', jpeg, 'image/jpeg');
    assert.deepEqual(await carregarFoto('ceo-roberto'), { bytes: jpeg, mime: 'image/jpeg' });
    assert.deepEqual(await readdir(join(pasta, 'data', 'organograma-fotos')), ['ceo-roberto.foto']);
  } finally {
    process.chdir(diretorioAnterior);
    assert.ok(resolve(pasta).startsWith(`${resolve(tmpdir())}\\`) || resolve(pasta).startsWith(`${resolve(tmpdir())}/`));
    await rm(pasta, { recursive: true, force: true });
  }
});
