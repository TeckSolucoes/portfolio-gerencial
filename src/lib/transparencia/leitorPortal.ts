import type { ServidorPortal } from './clientesNovos';

// Leitor do arquivo mensal "Servidores SIAPE" do Portal da Transparência (Download de dados), parte
// <AAAAMM>_Cadastro.csv: separado por ";", aspas duplas, codificação ISO-8859-1, datas dd/mm/aaaa.
// As colunas são achadas PELO NOME (com apelidos), não pela posição: o Portal já reordenou e
// renomeou colunas antes. Coluna obrigatória ausente = erro claro, não lista vazia silenciosa.

const COLUNAS = {
  id: ['Id_SERVIDOR_PORTAL', 'ID_SERVIDOR_PORTAL'],
  nome: ['NOME'],
  cpf: ['CPF'],
  orgao: ['ORG_EXERCICIO', 'ORGAO_EXERCICIO', 'ORG_LOTACAO'],
  orgaoSuperior: ['ORGSUP_EXERCICIO', 'ORGAO_SUPERIOR_EXERCICIO', 'ORGSUP_LOTACAO'],
  uf: ['UF_EXERCICIO'],
  cargo: ['DESCRICAO_CARGO', 'CARGO'],
  situacao: ['SITUACAO_VINCULO'],
  ingressoCargo: ['DATA_INGRESSO_CARGOFUNCAO', 'DATA_INGRESSO_CARGO'],
} as const;

type Campo = keyof typeof COLUNAS;
const OBRIGATORIAS: Campo[] = ['id', 'nome', 'cpf', 'orgao'];

// Uma linha CSV com aspas ("a;b" é um campo só; "" dentro de aspas é uma aspa).
export function partirLinha(linha: string, sep = ';'): string[] {
  const campos: string[] = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (aspas) {
      if (ch === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (ch === '"') aspas = false;
      else atual += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) {
      campos.push(atual);
      atual = '';
    } else atual += ch;
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

// "31/12/2019" -> "2019-12-31"; qualquer outra coisa (vazio, "Sem informação") -> "".
export function dataBr(v: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

const normCab = (s: string) => s.replace(/^﻿/, '').trim().toUpperCase();

export function mapearCabecalho(cabecalho: string[]): Record<Campo, number> {
  const cab = cabecalho.map(normCab);
  const idx = {} as Record<Campo, number>;
  for (const campo of Object.keys(COLUNAS) as Campo[]) {
    idx[campo] = COLUNAS[campo].map((n) => cab.indexOf(n.toUpperCase())).find((i) => i >= 0) ?? -1;
  }
  const faltando = OBRIGATORIAS.filter((c) => idx[c] < 0);
  if (faltando.length) {
    throw new Error(`Arquivo do Portal sem as colunas: ${faltando.map((c) => COLUNAS[c][0]).join(', ')}. O formato mudou; o leitor precisa ser ajustado.`);
  }
  return idx;
}

export interface Leitura {
  servidores: ServidorPortal[];
  ignoradas: number; // linhas sem ID ou sem CPF legível
}

// Lê as linhas (a 1ª é o cabeçalho) e entrega cada servidor ao callback, sem acumular: o arquivo
// federal tem centenas de milhares de linhas e não cabe inteiro na memória do container.
export async function percorrerCadastro(
  linhas: AsyncIterable<string> | Iterable<string>,
  aoLer: (s: ServidorPortal) => void,
): Promise<{ lidas: number; ignoradas: number }> {
  let idx: Record<Campo, number> | null = null;
  let lidas = 0;
  let ignoradas = 0;
  for await (const bruta of linhas) {
    if (!bruta.trim()) continue;
    const c = partirLinha(bruta);
    if (!idx) {
      idx = mapearCabecalho(c);
      continue;
    }
    const v = (campo: Campo) => (idx![campo] >= 0 ? (c[idx![campo]] ?? '') : '');
    const cpf6 = v('cpf').replace(/\D/g, '');
    if (!v('id') || cpf6.length !== 6) {
      ignoradas++;
      continue;
    }
    lidas++;
    aoLer({
      id: v('id'),
      nome: v('nome'),
      cpf6,
      orgao: v('orgao'),
      orgaoSuperior: v('orgaoSuperior'),
      uf: v('uf'),
      cargo: v('cargo'),
      situacao: v('situacao'),
      ingressoCargo: dataBr(v('ingressoCargo')),
    });
  }
  if (!idx) throw new Error('Arquivo do Portal vazio.');
  return { lidas, ignoradas };
}

// Versão que acumula tudo: para testes e amostras pequenas.
export async function lerCadastro(linhas: AsyncIterable<string> | Iterable<string>): Promise<Leitura> {
  const servidores: ServidorPortal[] = [];
  const { ignoradas } = await percorrerCadastro(linhas, (s) => servidores.push(s));
  return { servidores, ignoradas };
}
