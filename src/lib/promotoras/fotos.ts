import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const LIMITE_FOTO_BYTES = 2 * 1024 * 1024;

export class ErroFoto extends Error {
  constructor(mensagem: string, public status = 400) {
    super(mensagem);
  }
}

export function origemPermitida(reqUrl: string, origin: string | null, secfetch: string | null, urlPublica?: string) {
  if (!origin || (secfetch !== null && secfetch !== 'same-origin')) return false;
  try {
    const publica = new URL(urlPublica ?? reqUrl);
    return ['http:', 'https:'].includes(publica.protocol) && origin === publica.origin;
  } catch {
    return false;
  }
}

export function lerIdFoto(id: string) {
  if (id === 'ceo-roberto') return { tipo: 'ceo' as const, cadastroId: null };
  const partes = /^(gerente|promotora)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(id);
  if (!partes) throw new ErroFoto('Identificador de foto inválido.');
  return { tipo: partes[1] as 'gerente' | 'promotora', cadastroId: partes[2] };
}

export function mimeFoto(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16))) return 'image/webp';
  throw new ErroFoto('Use uma imagem PNG, JPEG ou WebP.', 415);
}

export function validarFoto(bytes: Uint8Array, mime: string | null) {
  if (bytes.byteLength > LIMITE_FOTO_BYTES) throw new ErroFoto('A foto deve ter até 2 MB.', 413);
  const detectado = mimeFoto(bytes);
  if (mime !== detectado) throw new ErroFoto('O formato da foto não corresponde ao conteúdo.', 415);
  return detectado;
}

export async function lerCorpoFoto(req: Request) {
  const tamanho = Number(req.headers.get('content-length'));
  if (tamanho > LIMITE_FOTO_BYTES) throw new ErroFoto('A foto deve ter até 2 MB.', 413);
  if (!req.body) throw new ErroFoto('Selecione uma foto.');
  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMITE_FOTO_BYTES) {
        await leitor.cancel();
        throw new ErroFoto('A foto deve ter até 2 MB.', 413);
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  const bytes = Buffer.concat(partes, total);
  validarFoto(bytes, req.headers.get('content-type'));
  return bytes;
}

function caminhoFoto(id: string) {
  lerIdFoto(id);
  return join(process.cwd(), 'data', 'organograma-fotos', `${id}.foto`);
}

function arquivoAusente(erro: unknown) {
  return erro instanceof Error && 'code' in erro && erro.code === 'ENOENT';
}

export async function fotoExiste(id: string): Promise<boolean> {
  try {
    return (await stat(caminhoFoto(id))).isFile();
  } catch (erro) {
    if (arquivoAusente(erro)) return false;
    throw erro;
  }
}

export async function carregarFoto(id: string) {
  try {
    const bytes = await readFile(caminhoFoto(id));
    return { bytes, mime: mimeFoto(bytes) };
  } catch (erro) {
    if (arquivoAusente(erro)) return null;
    throw erro;
  }
}

export async function salvarFoto(id: string, bytes: Uint8Array, mime: string | null) {
  const destino = caminhoFoto(id);
  validarFoto(bytes, mime);
  await mkdir(join(process.cwd(), 'data', 'organograma-fotos'), { recursive: true });
  const temporario = `${destino}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporario, bytes, { flag: 'wx', mode: 0o600 });
    await rename(temporario, destino);
  } finally {
    await unlink(temporario).catch(erro => {
      if (!arquivoAusente(erro)) throw erro;
    });
  }
}
