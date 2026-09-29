export type TipoCampo = 'tempo' | 'dimensao' | 'metrica';
export type TipoGrafico = 'indicador' | 'linha' | 'barras' | 'rosca' | 'tabela';

export interface CampoRelatorio {
  id: string;
  nome: string;
  tipo: TipoCampo;
  descricao: string;
  graficos: readonly TipoGrafico[];
  sensivel?: boolean;
}

// Catálogo deliberadamente fechado. A interface envia somente IDs desta lista; SQL, nomes de
// tabela e expressões nunca vêm do navegador.
export const CAMPOS_RELATORIO = [
  { id: 'hora_cadastro', nome: 'Hora de cadastro', tipo: 'tempo', descricao: 'Propostas agrupadas por hora de entrada no Front V2.', graficos: ['linha', 'barras', 'tabela'] },
  { id: 'dia_cadastro', nome: 'Dia de cadastro', tipo: 'tempo', descricao: 'Data de entrada da proposta.', graficos: ['linha', 'barras', 'tabela'] },
  { id: 'gerente', nome: 'Gerente', tipo: 'dimensao', descricao: 'Gerente registrado no atendimento.', graficos: ['barras', 'rosca', 'tabela'] },
  { id: 'equipe', nome: 'Equipe', tipo: 'dimensao', descricao: 'Equipe comercial responsável.', graficos: ['barras', 'rosca', 'tabela'] },
  { id: 'operador', nome: 'Operador', tipo: 'dimensao', descricao: 'Operador responsável pela proposta.', graficos: ['barras', 'tabela'] },
  { id: 'convenio', nome: 'Convênio', tipo: 'dimensao', descricao: 'Convênio normalizado da proposta.', graficos: ['barras', 'rosca', 'tabela'] },
  { id: 'produto', nome: 'Produto', tipo: 'dimensao', descricao: 'Produto comercial.', graficos: ['barras', 'rosca', 'tabela'] },
  { id: 'modalidade', nome: 'Modalidade', tipo: 'dimensao', descricao: 'Modalidade da tabela de simulação.', graficos: ['barras', 'rosca', 'tabela'] },
  { id: 'status_front', nome: 'Status no Front', tipo: 'dimensao', descricao: 'Etapa atual antes ou durante o envio à Função.', graficos: ['barras', 'rosca', 'tabela'] },
  { id: 'status_funcao', nome: 'Status na Função', tipo: 'dimensao', descricao: 'Situação resumida devolvida pela Função.', graficos: ['barras', 'rosca', 'tabela'] },
  { id: 'esteira_funcao', nome: 'Esteira da Função', tipo: 'dimensao', descricao: 'Última etapa operacional da proposta na Função.', graficos: ['barras', 'tabela'] },
  { id: 'qtd_propostas', nome: 'Quantidade de propostas', tipo: 'metrica', descricao: 'Contagem distinta de propostas do Front.', graficos: ['indicador', 'linha', 'barras', 'rosca', 'tabela'] },
  { id: 'valor_contratado', nome: 'Valor contratado', tipo: 'metrica', descricao: 'Soma do valor contratado registrado no Front V2.', graficos: ['indicador', 'linha', 'barras', 'rosca', 'tabela'] },
  { id: 'valor_liberado', nome: 'Valor liberado', tipo: 'metrica', descricao: 'Soma conciliada por proposta na Função.', graficos: ['indicador', 'linha', 'barras', 'rosca', 'tabela'] },
  { id: 'ticket_medio', nome: 'Ticket médio', tipo: 'metrica', descricao: 'Valor contratado dividido pela quantidade de propostas.', graficos: ['indicador', 'linha', 'barras', 'tabela'] },
  { id: 'taxa_integracao', nome: 'Taxa de integração', tipo: 'metrica', descricao: 'Percentual das propostas enviadas que chegaram a Integrada.', graficos: ['indicador', 'linha', 'barras', 'tabela'] },
] as const satisfies readonly CampoRelatorio[];

export type IdCampoRelatorio = (typeof CAMPOS_RELATORIO)[number]['id'];

const POR_ID = new Map<string, CampoRelatorio>(CAMPOS_RELATORIO.map((campo) => [campo.id, campo]));

export function campoRelatorio(id: string): CampoRelatorio {
  const campo = POR_ID.get(id);
  if (!campo) throw new Error(`Campo de relatório não permitido: ${id}.`);
  return campo;
}

export function validarVisao(dimensao: string | null, metrica: string, grafico: TipoGrafico) {
  const campoMetrica = campoRelatorio(metrica);
  if (campoMetrica.tipo !== 'metrica') throw new Error('Escolha uma métrica válida.');
  if (!campoMetrica.graficos.includes(grafico)) throw new Error('Esse gráfico não aceita a métrica escolhida.');
  if (grafico === 'indicador') return { dimensao: null, metrica: campoMetrica };
  if (!dimensao) throw new Error('Escolha uma dimensão para o gráfico.');
  const campoDimensao = campoRelatorio(dimensao);
  if (campoDimensao.tipo === 'metrica') throw new Error('A dimensão não pode ser uma métrica.');
  if (!campoDimensao.graficos.includes(grafico)) throw new Error('Esse gráfico não aceita a dimensão escolhida.');
  return { dimensao: campoDimensao, metrica: campoMetrica };
}

export const VISOES_PADRAO = [
  { id: 'propostas-hora', nome: 'Propostas por hora', dimensao: 'hora_cadastro', metrica: 'qtd_propostas', grafico: 'linha' },
  { id: 'valor-hora', nome: 'Valor contratado por hora', dimensao: 'hora_cadastro', metrica: 'valor_contratado', grafico: 'barras' },
  { id: 'funil-funcao', nome: 'Funil por status da Função', dimensao: 'status_funcao', metrica: 'qtd_propostas', grafico: 'barras' },
  { id: 'ranking-equipes', nome: 'Ranking de equipes', dimensao: 'equipe', metrica: 'valor_contratado', grafico: 'barras' },
  { id: 'liberado-dia', nome: 'Valor liberado por dia', dimensao: 'dia_cadastro', metrica: 'valor_liberado', grafico: 'linha' },
] as const;

