import { normalizarProduto } from './casos';
import { normalizarConvenio } from '../convenios';
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

// O Front só mostra o último status da esteira em "Aprovada - X". Estes X são o CCNET dizendo não
// (reprovou ou cancelou o contrato); qualquer outro X é a esteira ainda andando. Lista derivada
// do gabarito de 17/09: bate com os 126 Reprovado CCNET + 4 Cancelado que vêm de "Aprovada - X"
// (REPROVADO CRÉDITO entra aqui: o gabarito a chama de Reprovado Front, mas conta a morte no CCNET).
const ESTEIRA_ENCERRADA = new Set([
  'CALCULO MANUAL NEGATIVO',
  'CANCELADA',
  'CLIENTE SEM MARGEM',
  'CONTEM CTT C/ PROB AVERB',
  'CONTRATO FORA DE FOLHA',
  'CTT PAGO NAO AVERBADO',
  'DUPLICIDADE',
  'FORA DA POLÍTICA DE CRÉD',
  'IDADE FORA DA POLITICA',
  'M NEGATIVA / SEM MARGEM',
  'NÃO ATINGE VLR MIN PARC',
  'PEND NÃO SANADA/FORA SLA',
  'REPROVADO CRÉDITO',
  'REPROVA POR RISCO OP',
  'REPROVA POR RISCO OP.',
  'SALDO MAIOR',
  'SEM ATUAÇÃO / FORA DA SLA',
  'SITUAÇÃO FUNC NÃO ATENDID',
  'ULTRAPASSA VALOR CESSÃO',
]);

// Limites do Front: ele não diferencia "CCNET reprovou" de "CCNET cancelou" (PEND NÃO SANADA/FORA SLA
// e CANCELADA caem em Reprovado CCNET aqui; no gabarito 4 desses casos são Cancelado), e `cancelada`
// fica só com o status "Cancelada" pra bater com os 166 cancelados do export.
export function propostaDeFront(r: LinhaFront): Proposta | null {
  const produto = normalizarProduto(r.produto);
  if (!produto) return null;
  const aprovada = r.status.startsWith(PREFIXO_APROVADA);
  const sufixo = aprovada ? r.status.slice(PREFIXO_APROVADA.length) : '';
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
    convenio: normalizarConvenio(r.convenio),
    status: r.status,
    esteira: sufixo,
    temCodigoFuncao: aprovada,
    integrada: r.status.toUpperCase().includes('INTEGRADO'),
    excecao: r.politica === 'FRONT EXCEÇÃO',
    cancelada: r.status === 'Cancelada',
    frontReprovado: r.status === 'Reprovada',
    esteiraReprovada: ESTEIRA_ENCERRADA.has(sufixo),
    motivoCancFront: r.motivoCancFront ?? '',
    motivoCancelamento: '',
    dataCancelamento: '',
  };
}
