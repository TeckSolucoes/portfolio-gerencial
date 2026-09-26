export type Produto = 'Benefício' | 'Crédito' | 'Empréstimo' | 'Adiantamento';
export type Tipo = 'Novo' | 'Compra' | 'Adiantamento';
export type Desfecho = 'Pagou' | 'Morreu' | 'Jornada';
export type Fim = 'Cancelado' | 'Reprovado CCNET' | 'Reprovado Front';
export type Etapa = 'Front' | 'CCNET';

// Registro já normalizado. Traduzir os campos do Front/CCNET para os booleanos
// (integrada, cancelada, esteiraReprovada...) é trabalho do adaptador de cada
// fonte; o motor só aplica as regras do relatório sobre isso.
export interface Proposta {
  numero: string;
  cpf: string;
  nome: string;
  produto: Produto;
  modalidade: string;
  data: string; // YYYY-MM-DD, data de referência da inserção
  hora?: string; // HH:MM:SS quando a fonte traz; desempata propostas do mesmo dia
  valor: number;
  gerente: string;
  equipe: string;
  operador: string;
  convenio: string;
  status: string;
  esteira: string;
  temCodigoFuncao: boolean;
  integrada: boolean;
  excecao: boolean; // Política de Despesa = FRONT EXCEÇÃO
  cancelada: boolean;
  frontReprovado: boolean;
  esteiraReprovada: boolean;
  motivoCancFront: string;
  motivoCancelamento: string;
  dataCancelamento: string; // vazio quando a fonte não traz
}

export interface Descartada {
  proposta: Proposta;
  motivo: 'CPF ausente ou inválido';
}

export interface Caso {
  chave: string;
  cpf: string;
  nome: string;
  tipo: Tipo;
  produto: Produto;
  propostas: Proposta[];
  lote: string;
  gerente: string;
  equipe: string;
  operador: string;
  desfecho: Desfecho;
  fim: Fim | null;
  etapaMorte: Etapa | null;
}

export interface Soma {
  qtd: number;
  valor: number;
}

export interface LinhaSoma extends Soma {
  chave: string;
}

export interface Contagem {
  casos: number;
  pagou: number;
  morreu: number;
  jornada: number;
  taxaMorte: number | null;
  mortesFront: number;
  mortesCcnet: number;
}

export interface LinhaDesfecho {
  chave: string;
  pagou: number;
  morreu: number;
  jornada: number;
}

export interface LinhaLista {
  nome: string;
  cpf: string;
  numero: string;
  lote: string;
  tipo: Tipo;
  produto: Produto;
  fim: Fim;
  motivo: string;
  equipe: string;
  operador: string;
}

export interface TrocaEquipe {
  nome: string;
  cpf: string;
  numero: string;
  de: string;
  para: string;
  gerenteDe: string;
  gerentePara: string;
}

export interface CanceladaOntem {
  nome: string;
  equipe: string;
  motivo: string;
  valor: number;
}

export interface Escopo {
  nome: string;
  corresponde: (gerente: string) => boolean;
}

export interface Relatorio {
  ref: string;
  escopo: string;
  kpis: {
    total: Soma;
    novas: Soma;
    reinseridas: Soma;
    front: Soma;
    ccnet: Soma;
    canceladosOntem: Soma | null;
    taxaMes: number | null;
    excecaoDia: Soma;
    vendasMes: Soma;
    vendasGeral: Soma;
    canceladosMes: Soma;
    canceladosMesPct: number | null;
    canceladosGeral: Soma;
    pagosMes: Soma;
    pagosExcecaoMes: Soma;
    excecaoMes: Soma;
  };
  etapasFront: LinhaSoma[];
  etapasCcnet: LinhaSoma[];
  canalMes: Record<Tipo, Contagem>;
  loteDia: { data: string; casos: number }[];
  porGerente: LinhaDesfecho[];
  porEquipe: LinhaDesfecho[];
  porOperador: LinhaDesfecho[];
  resumoMes: { inseriu: number; pagou: number; morreu: number; jornada: number };
  lista: LinhaLista[];
  rankingEquipes: LinhaSoma[];
  rankingOperadores: LinhaSoma[];
  porConvenio: LinhaSoma[];
  porProduto: LinhaSoma[];
  porTipo: LinhaSoma[];
  trocasEquipe: TrocaEquipe[];
  canceladasOntem: CanceladaOntem[] | null;
  alertas: string[];
}
