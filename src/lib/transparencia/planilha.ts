// Planilha do comercial em CSV no padrão do Excel em português: separador ";", BOM UTF-8 (acentos
// certos ao abrir com dois cliques) e sem dependência de biblioteca de Excel.

export interface LinhaPlanilha {
  mes: string;
  tipo: string;
  nome: string;
  cpf6: string;
  orgao: string;
  orgaoSuperior: string;
  uf: string;
  cargo: string;
  situacao: string;
  ingressoCargo: string;
}

const COLUNAS: [string, (l: LinhaPlanilha) => string][] = [
  ['Mês', (l) => l.mes],
  ['Tipo', (l) => (l.tipo === 'recem-nomeado' ? 'Recém-nomeado' : 'Transferido/outro')],
  ['Nome', (l) => l.nome],
  ['CPF (parcial)', (l) => `***.${l.cpf6.slice(0, 3)}.${l.cpf6.slice(3)}-**`],
  ['Órgão', (l) => l.orgao],
  ['Órgão superior', (l) => l.orgaoSuperior],
  ['UF', (l) => l.uf],
  ['Cargo', (l) => l.cargo],
  ['Situação', (l) => l.situacao],
  ['Ingresso no cargo', (l) => (l.ingressoCargo ? l.ingressoCargo.split('-').reverse().join('/') : '')],
];

// Aspas quando precisa; e valor que começa com = + - @ vira texto (senão o Excel executa como fórmula).
export function celula(v: string): string {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function gerarPlanilha(linhas: readonly LinhaPlanilha[]): string {
  const cab = COLUNAS.map(([t]) => celula(t)).join(';');
  const corpo = linhas.map((l) => COLUNAS.map(([, f]) => celula(f(l))).join(';'));
  return '﻿' + [cab, ...corpo].join('\r\n') + '\r\n';
}
