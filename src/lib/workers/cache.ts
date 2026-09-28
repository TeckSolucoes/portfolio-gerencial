import 'server-only';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Resultado de cada worker em arquivo (data/cache/<id>.json, no volume). É regenerável: se sumir,
// o próximo ciclo do worker refaz. As telas leem daqui em vez de consultar as fontes a cada acesso.
const PASTA = path.join(process.cwd(), 'data', 'cache');

export interface EntradaCache<T> {
  geradoEm: string;
  dados: T;
}

const arquivo = (id: string) => path.join(PASTA, `${id.replace(/[^a-z0-9-]/gi, '_')}.json`);

export async function gravarCache(id: string, dados: unknown): Promise<void> {
  await mkdir(PASTA, { recursive: true });
  const destino = arquivo(id);
  const tmp = `${destino}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ geradoEm: new Date().toISOString(), dados }));
  await rename(tmp, destino);
}

export async function lerCache<T>(id: string): Promise<EntradaCache<T> | null> {
  try {
    return JSON.parse(await readFile(arquivo(id), 'utf-8')) as EntradaCache<T>;
  } catch {
    return null;
  }
}

export async function apagarCache(id: string): Promise<void> {
  await unlink(arquivo(id)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
