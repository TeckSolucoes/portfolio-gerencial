export type SinalMonitoramento = 'OBJECAO' | 'REPROVADA' | 'AGUARDANDO_FUNCAO' | 'SEM_ATUALIZACAO' | 'SEM_RESPONSAVEL';
export type PrioridadeMonitoramento = 'CRITICA' | 'ALTA' | 'MEDIA';

export interface PropostaMonitorada {
  id: string;
  gerente: string;
  equipe: string;
  operador: string;
  convenio: string;
  criadaEm: string;
  atualizadaEm: string;
  statusFront: string;
  statusFuncao: string;
  esteira: string;
  motivo: string;
  temCodigoFuncao: boolean;
}

export interface PessoaMonitorada {
  chave: string;
  operador: string;
  gerente: string;
  equipe: string;
  prioridade: PrioridadeMonitoramento;
  casos: number;
  objecoes: number;
  reprovadas: number;
  aguardandoFuncao: number;
  semAtualizacao: number;
  semResponsavel: number;
  desde: string;
  ultimaAtualizacao: string;
  principaisMotivos: Array<{ motivo: string; quantidade: number }>;
  proximaAcao: string;
}

const normalizar = (valor: unknown) =>
  String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

const diasDesde = (ymd: string, hoje: string) => {
  const inicio = Date.parse(`${ymd.slice(0, 10)}T00:00:00Z`);
  const fim = Date.parse(`${hoje.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(inicio) && Number.isFinite(fim) ? Math.max(0, Math.floor((fim - inicio) / 86_400_000)) : 0;
};

export function sinaisDaProposta(proposta: PropostaMonitorada, hoje: string): SinalMonitoramento[] {
  const status = normalizar(`${proposta.statusFront} ${proposta.statusFuncao} ${proposta.esteira}`);
  const encerrada = /(INTEGRAD|PAGO|FINALIZAD|CONCLUID)/.test(status);
  const cancelada = /CANCEL/.test(status);
  const reprovada = /REPROV|RECUSAD|NEGAD/.test(status);
  const sinais: SinalMonitoramento[] = [];

  if (proposta.motivo.trim()) sinais.push('OBJECAO');
  if (reprovada) sinais.push('REPROVADA');
  if (!encerrada && !cancelada && !reprovada && proposta.temCodigoFuncao && !proposta.statusFuncao.trim() && !proposta.esteira.trim()) sinais.push('AGUARDANDO_FUNCAO');
  if (!encerrada && !cancelada && diasDesde(proposta.atualizadaEm || proposta.criadaEm, hoje) >= 2) sinais.push('SEM_ATUALIZACAO');
  if (!encerrada && !cancelada && !proposta.operador.trim()) sinais.push('SEM_RESPONSAVEL');
  return [...new Set(sinais)];
}

const peso = (sinais: SinalMonitoramento[]): number => {
  if (sinais.includes('OBJECAO') || sinais.includes('REPROVADA')) return 3;
  if (sinais.includes('SEM_RESPONSAVEL') || sinais.includes('SEM_ATUALIZACAO')) return 2;
  return 1;
};

const prioridade = (valor: number): PrioridadeMonitoramento => (valor >= 3 ? 'CRITICA' : valor === 2 ? 'ALTA' : 'MEDIA');

function acaoDe(p: Pick<PessoaMonitorada, 'objecoes' | 'reprovadas' | 'semResponsavel' | 'semAtualizacao'>): string {
  if (p.objecoes) return 'Tratar a objeção e registrar o retorno ao cliente.';
  if (p.reprovadas) return 'Revisar a reprovação e confirmar se cabe correção ou nova proposta.';
  if (p.semResponsavel) return 'Definir um operador responsável antes de seguir.';
  if (p.semAtualizacao) return 'Cobrar atualização da proposta e registrar o próximo contato.';
  return 'Confirmar o retorno da Função e atualizar a proposta.';
}

export function agruparPorResponsavel(propostas: PropostaMonitorada[], hoje: string): PessoaMonitorada[] {
  const grupos = new Map<string, { pessoa: PessoaMonitorada; motivos: Map<string, number>; ids: Set<string>; maiorPeso: number }>();

  for (const proposta of propostas) {
    const sinais = sinaisDaProposta(proposta, hoje);
    if (!sinais.length) continue;
    const operador = proposta.operador.trim() || 'Sem responsável';
    const equipe = proposta.equipe.trim() || 'Equipe não informada';
    const gerente = proposta.gerente.trim() || 'Gerente não informado';
    const chave = `${gerente}|${equipe}|${operador}`;
    const atual = grupos.get(chave) ?? {
      pessoa: {
        chave,
        operador,
        gerente,
        equipe,
        prioridade: 'MEDIA',
        casos: 0,
        objecoes: 0,
        reprovadas: 0,
        aguardandoFuncao: 0,
        semAtualizacao: 0,
        semResponsavel: 0,
        desde: proposta.criadaEm,
        ultimaAtualizacao: proposta.atualizadaEm || proposta.criadaEm,
        principaisMotivos: [],
        proximaAcao: '',
      },
      motivos: new Map<string, number>(),
      ids: new Set<string>(),
      maiorPeso: 1,
    };
    if (!atual.ids.has(proposta.id)) {
      atual.ids.add(proposta.id);
      atual.pessoa.casos += 1;
    }
    atual.pessoa.objecoes += Number(sinais.includes('OBJECAO'));
    atual.pessoa.reprovadas += Number(sinais.includes('REPROVADA'));
    atual.pessoa.aguardandoFuncao += Number(sinais.includes('AGUARDANDO_FUNCAO'));
    atual.pessoa.semAtualizacao += Number(sinais.includes('SEM_ATUALIZACAO'));
    atual.pessoa.semResponsavel += Number(sinais.includes('SEM_RESPONSAVEL'));
    atual.pessoa.desde = proposta.criadaEm < atual.pessoa.desde ? proposta.criadaEm : atual.pessoa.desde;
    const atualizada = proposta.atualizadaEm || proposta.criadaEm;
    atual.pessoa.ultimaAtualizacao = atualizada > atual.pessoa.ultimaAtualizacao ? atualizada : atual.pessoa.ultimaAtualizacao;
    atual.maiorPeso = Math.max(atual.maiorPeso, peso(sinais));
    if (proposta.motivo.trim()) atual.motivos.set(proposta.motivo.trim(), (atual.motivos.get(proposta.motivo.trim()) ?? 0) + 1);
    grupos.set(chave, atual);
  }

  return [...grupos.values()]
    .map(({ pessoa, motivos, maiorPeso }) => ({
      ...pessoa,
      prioridade: prioridade(maiorPeso),
      principaisMotivos: [...motivos].map(([motivo, quantidade]) => ({ motivo, quantidade })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 3),
      proximaAcao: acaoDe(pessoa),
    }))
    .sort((a, b) => pesoPessoa(b) - pesoPessoa(a) || b.casos - a.casos || a.operador.localeCompare(b.operador));
}

const pesoPessoa = (p: PessoaMonitorada) => (p.prioridade === 'CRITICA' ? 3 : p.prioridade === 'ALTA' ? 2 : 1);
