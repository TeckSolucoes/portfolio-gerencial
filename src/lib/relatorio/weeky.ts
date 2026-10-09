import type { Empresa } from '@/lib/empresas';
import { mesclarPropostas, type SnapshotPropostas } from './snapshot';
import type { Proposta, Soma } from './types';

export interface ResumoWeeky {
  inicio: string;
  fim: string;
  anteriorInicio: string;
  anteriorFim: string;
  vendas: Soma;
  anteriores: Soma;
  integrados: Soma;
  cancelados: Soma;
  excecao: Soma;
  pendentes: Soma;
  dias: (Soma & { data: string })[];
  equipes: (Soma & { nome: string })[];
  produtos: (Soma & { nome: string })[];
  semHierarquia: number;
  semDataIntegracao: number;
}

const deslocarDia = (ref: string, dias: number) => {
  const data = new Date(`${ref}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
};

const somar = (propostas: readonly Proposta[]): Soma => ({
  qtd: propostas.length,
  valor: propostas.reduce((total, proposta) => total + proposta.valor, 0),
});

function agrupar(propostas: readonly Proposta[], campo: 'equipe' | 'produto') {
  const grupos = new Map<string, Soma & { nome: string }>();
  for (const proposta of propostas) {
    const nome = proposta[campo].trim() || 'Não informado';
    const grupo = grupos.get(nome) ?? { nome, qtd: 0, valor: 0 };
    grupo.qtd++;
    grupo.valor += proposta.valor;
    grupos.set(nome, grupo);
  }
  return [...grupos.values()].sort((a, b) => b.valor - a.valor || b.qtd - a.qtd || a.nome.localeCompare(b.nome));
}

export function montarWeeky(propostas: readonly Proposta[], ref: string): ResumoWeeky {
  const inicio = deslocarDia(ref, -6);
  const anteriorInicio = deslocarDia(ref, -13);
  const anteriorFim = deslocarDia(ref, -7);
  const unicas = mesclarPropostas([], propostas);
  const atuais = unicas.filter((proposta) => proposta.data >= inicio && proposta.data <= ref);
  const anteriores = unicas.filter((proposta) => proposta.data >= anteriorInicio && proposta.data <= anteriorFim);
  const integrados = unicas.filter((proposta) => proposta.integrada && proposta.dataIntegracao
    && proposta.dataIntegracao >= inicio && proposta.dataIntegracao <= ref);
  return {
    inicio,
    fim: ref,
    anteriorInicio,
    anteriorFim,
    vendas: somar(atuais),
    anteriores: somar(anteriores),
    integrados: somar(integrados),
    cancelados: somar(atuais.filter((proposta) => proposta.cancelada)),
    excecao: somar(atuais.filter((proposta) => proposta.excecao)),
    pendentes: somar(atuais.filter((proposta) => !proposta.integrada && !proposta.cancelada
      && !proposta.frontReprovado && !proposta.esteiraReprovada)),
    dias: Array.from({ length: 7 }, (_, indice) => {
      const data = deslocarDia(inicio, indice);
      return { data, ...somar(atuais.filter((proposta) => proposta.data === data)) };
    }),
    equipes: agrupar(atuais, 'equipe'),
    produtos: agrupar(atuais, 'produto'),
    semHierarquia: atuais.filter((proposta) => !(proposta.hierarquiaInformada
      ?? [proposta.gerente, proposta.equipe, proposta.operador].every((valor) => valor.trim() !== '' && valor !== '(não informado)'))).length,
    semDataIntegracao: unicas.filter((proposta) => proposta.integrada && !proposta.dataIntegracao).length,
  };
}

export async function carregarWeeky(empresa: Empresa) {
  const { lerCache } = await import('@/lib/workers/cache');
  const salvo = await lerCache<SnapshotPropostas>(`relatorio-propostas-v3-${empresa.toLowerCase()}`);
  if (!salvo) return null;
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return { geradoEm: salvo.geradoEm, referencia: salvo.dados.ref, desatualizado: Date.now() - new Date(salvo.geradoEm).getTime() > 86_400_000 || salvo.dados.ref < hoje, dados: montarWeeky(salvo.dados.propostas, hoje) };
}
