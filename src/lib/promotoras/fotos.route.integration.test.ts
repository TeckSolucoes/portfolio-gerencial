import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as nodeModule from 'node:module';

type HookContext = Record<string, unknown>;
type HookResult = { url?: string; format?: string; source?: string; shortCircuit?: boolean };
const { registerHooks } = nodeModule as unknown as {
  registerHooks(hooks: {
    resolve(specifier: string, context: HookContext, next: (specifier: string, context: HookContext) => HookResult): HookResult;
    load(url: string, context: HookContext, next: (url: string, context: HookContext) => HookResult): HookResult;
  }): { deregister(): void };
};

test('endpoint de fotos autoriza antes de persistir e protege a resposta', async t => {
  const pasta = mkdtempSync(join(tmpdir(), 'teck-fotos-route-qa-'));
  const cwdAnterior = process.cwd();
  const authAnterior = process.env.AUTH_URL;
  const nextAuthAnterior = process.env.NEXTAUTH_URL;
  const gerenteId = '12345678-1234-4234-8234-123456789abc';
  const ausenteId = '87654321-4321-4321-8321-cba987654321';
  const estado = { acesso: { perfil: 'superadmin' } as { perfil: string } | null, permitido: true, consultas: [] as string[] };
  const globalTeste = globalThis as unknown as { fotosRouteQA?: typeof estado };
  const anterior = globalTeste.fotosRouteQA;
  globalTeste.fotosRouteQA = estado;
  const fontes = new Map([
    ['@/lib/acesso', 'export async function carregarAcesso() { return globalThis.fotosRouteQA.acesso; }'],
    ['@/lib/permissoes', 'export function podeAcessar(acesso, funcionalidade) { if (funcionalidade !== "hierarquia") throw new Error("Permissão inesperada"); return globalThis.fotosRouteQA.permitido; }'],
    ['@/lib/prisma', `const findUnique = async ({ where }) => { globalThis.fotosRouteQA.consultas.push(where.id); return where.id === '${gerenteId}' ? { id: where.id } : null; }; export const prisma = { gerenteComercial: { findUnique }, promotora: { findUnique } };`],
  ]);
  const urls = new Map([...fontes.keys()].map(chave => [chave, `teck-qa:${chave}`]));
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      const url = urls.get(specifier);
      if (url) return { url, shortCircuit: true };
      if (specifier === '@/lib/promotoras/fotos') return { url: new URL('./fotos.ts', import.meta.url).href, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      const chave = [...urls].find(([, valor]) => valor === url)?.[0];
      return chave ? { format: 'module', source: fontes.get(chave)!, shortCircuit: true } : next(url, context);
    },
  });
  try {
    const { GET, PUT } = await import('../../app/api/promotoras/fotos/[id]/route');
    // O armazenamento real usa cwd; mudar para uma pasta temporária evita qualquer acesso às fotos do projeto.
    process.chdir(pasta);
    process.env.AUTH_URL = 'https://portal.example.test';
    delete process.env.NEXTAUTH_URL;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII=', 'base64');
    const contexto = (id: string) => ({ params: Promise.resolve({ id }) });
    const requisicao = (id: string, origem = 'https://portal.example.test') => new Request(`http://127.0.0.1:3000/api/promotoras/fotos/${id}`, {
      method: 'PUT', headers: { origin: origem, 'sec-fetch-site': 'same-origin', 'content-type': 'image/png' }, body: png,
    });
    const privado = (resposta: Response) => {
      assert.equal(resposta.headers.get('cache-control'), 'private, no-store');
      assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
    };
    const rejeitado = async (status: number, id = 'ceo-roberto') => {
      for (const resposta of [await GET(new Request('http://127.0.0.1:3000'), contexto(id)), await PUT(requisicao(id), contexto(id))]) {
        assert.equal(resposta.status, status);
        privado(resposta);
      }
      assert.deepEqual(readdirSync(pasta), []);
    };
    await t.test('sem sessão retorna 401 sem acessar cadastros', async () => {
      estado.acesso = null;
      await rejeitado(401);
      assert.deepEqual(estado.consultas, []);
    });
    await t.test('gerente não pode ler nem enviar foto', async () => {
      estado.acesso = { perfil: 'gerente' };
      await rejeitado(403);
    });
    await t.test('superadmin sem hierarquia recebe 403', async () => {
      estado.acesso = { perfil: 'superadmin' };
      estado.permitido = false;
      await rejeitado(403);
      estado.permitido = true;
    });
    await t.test('cadastro inexistente recebe 404 antes da gravação', async () => {
      await rejeitado(404, `gerente-${ausenteId}`);
      await rejeitado(404, `promotora-${ausenteId}`);
    });
    await t.test('origem externa não grava arquivo', async () => {
      const resposta = await PUT(requisicao('ceo-roberto', 'https://externo.example.test'), contexto('ceo-roberto'));
      assert.equal(resposta.status, 403);
      privado(resposta);
      assert.deepEqual(readdirSync(pasta), []);
    });
    for (const id of ['ceo-roberto', `gerente-${gerenteId}`]) {
      await t.test(`PUT e GET reais de ${id} aceitam origem pública com URL interna`, async () => {
        const enviada = await PUT(requisicao(id), contexto(id));
        assert.equal(enviada.status, 200);
        privado(enviada);
        assert.deepEqual(await enviada.json(), { ok: true });
        assert.deepEqual(readFileSync(join(pasta, 'data', 'organograma-fotos', `${id}.foto`)), png);
        const recebida = await GET(new Request(`http://127.0.0.1:3000/api/promotoras/fotos/${id}`), contexto(id));
        assert.equal(recebida.status, 200);
        assert.equal(recebida.headers.get('content-type'), 'image/png');
        privado(recebida);
        assert.deepEqual(Buffer.from(await recebida.arrayBuffer()), png);
      });
    }
    assert.deepEqual(readdirSync(join(pasta, 'data', 'organograma-fotos')).sort(), ['ceo-roberto.foto', `gerente-${gerenteId}.foto`].sort());
  } finally {
    process.chdir(cwdAnterior);
    if (authAnterior === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = authAnterior;
    if (nextAuthAnterior === undefined) delete process.env.NEXTAUTH_URL; else process.env.NEXTAUTH_URL = nextAuthAnterior;
    if (anterior === undefined) delete globalTeste.fotosRouteQA; else globalTeste.fotosRouteQA = anterior;
    hooks.deregister();
    rmSync(pasta, { recursive: true, force: true });
  }
});
