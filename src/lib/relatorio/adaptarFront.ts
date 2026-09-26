import { normalizarProduto } from './casos';
import type { Proposta } from './types';

export interface LinhaFront {
  numero: string;
  cpf: string;
  nome: string;
  produto: string;
  modalidade: string;
  data: string;
  contrato: number;
  gerente: string;
  equipe: string;
  operador: string;
  convenio: string;
  status: string;
  motivoCancFront: string;
  politica: string;
}

const PREFIXO_APROVADA = 'Aprovada - ';

// Sem o CCNET na mão, "Aprovada - X" no Front é a proposta que já passou pela auditoria e tem
// Código Função; X é a esteira. Bate exatamente com a prova de 17/09 (Front 47 / CCNET 75).
// Não há como saber pelo Front se a esteira reprovou, então esteiraReprovada fica falso.
export function propostaDeFront(r: LinhaFront): Proposta | null {
  const produto = normalizarProduto(r.produto);
  if (!produto) return null;
  const aprovada = r.status.startsWith(PREFIXO_APROVADA);
  return {
    numero: r.numero,
    cpf: r.cpf,
    nome: r.nome,
    produto,
    modalidade: r.modalidade,
    data: r.data,
    valor: r.contrato,
    gerente: r.gerente,
    equipe: r.equipe,
    operador: r.operador,
    convenio: r.convenio,
    status: r.status,
    esteira: aprovada ? r.status.slice(PREFIXO_APROVADA.length) : '',
    temCodigoFuncao: aprovada,
    integrada: r.status.toUpperCase().includes('INTEGRADO'),
    excecao: r.politica === 'FRONT EXCEÇÃO',
    cancelada: r.status === 'Cancelada',
    frontReprovado: r.status === 'Reprovada',
    esteiraReprovada: false,
    motivoCancFront: r.motivoCancFront ?? '',
    motivoCancelamento: '',
    dataCancelamento: '',
  };
}
