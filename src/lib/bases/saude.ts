import 'server-only';

import type { RowDataPacket } from 'mysql2/promise';
import { consultarFrontV1, consultarFrontV2, consultarFuncao } from './conexoes';
import type { BaseExterna } from './politica';

export interface SaudeBase {
  base: BaseExterna;
  ok: boolean;
  latenciaMs: number;
  mensagem: string;
}

async function medir(base: BaseExterna, consulta: () => Promise<RowDataPacket[]>): Promise<SaudeBase> {
  const inicio = Date.now();
  try {
    await consulta();
    return { base, ok: true, latenciaMs: Date.now() - inicio, mensagem: 'Conexão de leitura disponível.' };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha desconhecida.';
    // Não propaga mensagens do driver, pois elas podem conter host, usuário ou outros detalhes.
    return { base, ok: false, latenciaMs: Date.now() - inicio, mensagem: mensagem.includes('configuração incompleta') ? mensagem : 'Falha ao conectar.' };
  }
}

export async function validarSaudeBases(): Promise<SaudeBase[]> {
  return Promise.all([
    medir('funcao', () => consultarFuncao<RowDataPacket[]>('SELECT 1 AS ok')),
    medir('front-v1', () => consultarFrontV1<RowDataPacket[]>('SELECT 1 AS ok')),
    medir('front-v2', () => consultarFrontV2<RowDataPacket[]>('SELECT 1 AS ok')),
  ]);
}
