export type BaseExterna = 'funcao' | 'front-v1' | 'front-v2';

const VARIAVEIS: Record<BaseExterna, readonly string[]> = {
  funcao: ['FUNCAO_DB_HOST', 'FUNCAO_DB_PORT', 'FUNCAO_DB_USER', 'FUNCAO_DB_PASSWORD', 'FUNCAO_DB_NAME'],
  'front-v1': ['FRONT_V1_DB_HOST', 'FRONT_V1_DB_PORT', 'FRONT_V1_DB_USER', 'FRONT_V1_DB_PASS'],
  'front-v2': [
    'FRONT_V2_DB_HOST',
    'FRONT_V2_DB_PORT',
    'FRONT_V2_DB_USER',
    'FRONT_V2_DB_PASS',
    'FRONT_V2_SSH_HOST',
    'FRONT_V2_SSH_PORT',
    'FRONT_V2_SSH_USER',
    'FRONT_V2_SSH_PRIVATE_KEY_BASE64',
  ],
};

export function variaveisAusentes(base: BaseExterna, ambiente: Record<string, string | undefined> = process.env): string[] {
  return VARIAVEIS[base].filter((nome) => !ambiente[nome]?.trim());
}

export function validarConsultaLeitura(sql: string) {
  const inicio = sql.trimStart().match(/^([a-z]+)/i)?.[1]?.toUpperCase();
  if (!inicio || !['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH'].includes(inicio)) {
    throw new Error('Somente consultas de leitura são permitidas nas bases externas.');
  }
  if (/\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|TRUNCATE|CREATE|GRANT|REVOKE|CALL|LOAD)\b/i.test(sql)) {
    throw new Error('A consulta contém uma operação de escrita não permitida.');
  }
}

