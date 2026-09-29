import 'server-only';

import mysql, { type RowDataPacket } from 'mysql2/promise';
import { Client } from 'ssh2';
import { validarConsultaLeitura, variaveisAusentes, type BaseExterna } from './politica';

function exigirConfiguracao(base: BaseExterna) {
  const ausentes = variaveisAusentes(base);
  if (ausentes.length) throw new Error(`${base}: configuração incompleta (${ausentes.join(', ')}).`);
}

async function consultarDireto<T extends RowDataPacket[]>(base: 'funcao' | 'front-v1', sql: string, parametros: unknown[] = []) {
  validarConsultaLeitura(sql);
  exigirConfiguracao(base);
  const prefixo = base === 'funcao' ? 'FUNCAO' : 'FRONT_V1';
  const conexao = await mysql.createConnection({
    host: process.env[`${prefixo}_DB_HOST`],
    port: Number(process.env[`${prefixo}_DB_PORT`] || 3306),
    user: process.env[`${prefixo}_DB_USER`],
    password: process.env[base === 'funcao' ? 'FUNCAO_DB_PASSWORD' : 'FRONT_V1_DB_PASS'],
    database: base === 'funcao' ? process.env.FUNCAO_DB_NAME : undefined,
    ssl: base === 'funcao' ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 12_000,
    multipleStatements: false,
  });
  try {
    const [linhas] = await conexao.query<T>(sql, parametros);
    return linhas;
  } finally {
    await conexao.end();
  }
}

export const consultarFuncao = <T extends RowDataPacket[]>(sql: string, parametros: unknown[] = []) =>
  consultarDireto<T>('funcao', sql, parametros);

export const consultarFrontV1 = <T extends RowDataPacket[]>(sql: string, parametros: unknown[] = []) =>
  consultarDireto<T>('front-v1', sql, parametros);

export async function consultarFrontV2<T extends RowDataPacket[]>(sql: string, parametros: unknown[] = []): Promise<T> {
  validarConsultaLeitura(sql);
  exigirConfiguracao('front-v2');

  const ssh = new Client();
  let conexao: Awaited<ReturnType<typeof mysql.createConnection>> | null = null;
  try {
    const stream = await new Promise<NodeJS.ReadWriteStream>((resolve, reject) => {
      ssh
        .once('ready', () => {
          ssh.forwardOut(
            '127.0.0.1',
            0,
            process.env.FRONT_V2_DB_HOST!,
            Number(process.env.FRONT_V2_DB_PORT || 3306),
            (erro, canal) => (erro ? reject(erro) : resolve(canal)),
          );
        })
        .once('error', reject)
        .connect({
          host: process.env.FRONT_V2_SSH_HOST,
          port: Number(process.env.FRONT_V2_SSH_PORT || 22),
          username: process.env.FRONT_V2_SSH_USER,
          privateKey: Buffer.from(process.env.FRONT_V2_SSH_PRIVATE_KEY_BASE64!, 'base64'),
          readyTimeout: 15_000,
        });
    });
    conexao = await mysql.createConnection({
      user: process.env.FRONT_V2_DB_USER,
      password: process.env.FRONT_V2_DB_PASS,
      stream,
      connectTimeout: 12_000,
      multipleStatements: false,
    });
    const [linhas] = await conexao.query<T>(sql, parametros);
    return linhas;
  } finally {
    if (conexao) await conexao.end().catch(() => undefined);
    ssh.end();
  }
}
