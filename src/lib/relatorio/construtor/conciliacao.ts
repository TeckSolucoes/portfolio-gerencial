import type { IdCampoRelatorio } from './catalogo';

export interface PropostaFrontRelatorio {
  id_front: string | number;
  numero_proposta: string | null;
  hora_cadastro: string;
  dia_cadastro: string;
  gerente: string;
  equipe: string;
  operador: string;
  convenio: string;
  produto: string;
  modalidade: string;
  status_front: string;
  status_funcao_v2: string | null;
  esteira_funcao_v2: string | null;
  valor_contrato: string | number | null;
}

export interface PropostaFuncaoRelatorio {
  NumeroProposta: string;
  status_funcao_raw: string | null;
  status_funcao: string | null;
  esteira_funcao: string | null;
  valor_liberado: string | number | null;
}

export interface ResumoConciliacao {
  propostasFront: number;
  enviadasFuncao: number;
  encontradasFuncao: number;
  ausentesFuncao: number;
  divergenciasStatus: number;
}

export interface PontoConciliado {
  rotulo: string;
  valor: number;
}

const vazio = '(não informado)';

export function numeroPtBr(valor: string | number | null | undefined): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor ?? '').trim().replace(/^R\$\s*/, '');
  if (!texto) return 0;
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

const chaveProposta = (valor: unknown) => String(valor ?? '').trim();
const compararStatus = (valor: unknown) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const integrada = (linha: PropostaFuncaoRelatorio | undefined) =>
  compararStatus(linha?.status_funcao) === 'INTEGRADA' || compararStatus(linha?.status_funcao_raw) === 'INT';

function rotuloDaDimensao(
  linha: PropostaFrontRelatorio,
  funcao: PropostaFuncaoRelatorio | undefined,
  dimensao: IdCampoRelatorio | null,
) {
  if (!dimensao) return 'Total';
  if (dimensao === 'status_funcao') {
    if (!chaveProposta(linha.numero_proposta)) return '(não enviada à Função)';
    return funcao?.status_funcao?.trim() || funcao?.status_funcao_raw?.trim() || '(não encontrada na Função)';
  }
  if (dimensao === 'esteira_funcao') {
    if (!chaveProposta(linha.numero_proposta)) return '(não enviada à Função)';
    return funcao?.esteira_funcao?.trim() || '(não encontrada na Função)';
  }
  const valor = linha[dimensao as keyof PropostaFrontRelatorio];
  return String(valor ?? '').trim() || vazio;
}

export function resumirConciliacao(
  front: PropostaFrontRelatorio[],
  funcao: PropostaFuncaoRelatorio[],
): ResumoConciliacao {
  const idsFront = new Set(front.map((linha) => String(linha.id_front)));
  const numeros = new Set(front.map((linha) => chaveProposta(linha.numero_proposta)).filter(Boolean));
  const porNumero = new Map(funcao.map((linha) => [chaveProposta(linha.NumeroProposta), linha]));
  let divergenciasStatus = 0;
  for (const linha of front) {
    const numero = chaveProposta(linha.numero_proposta);
    const atual = porNumero.get(numero);
    if (!numero || !atual || !linha.status_funcao_v2 || !atual.status_funcao) continue;
    if (compararStatus(linha.status_funcao_v2) !== compararStatus(atual.status_funcao)) divergenciasStatus += 1;
  }
  const encontradasFuncao = [...numeros].filter((numero) => porNumero.has(numero)).length;
  return {
    propostasFront: idsFront.size,
    enviadasFuncao: numeros.size,
    encontradasFuncao,
    ausentesFuncao: numeros.size - encontradasFuncao,
    divergenciasStatus,
  };
}

export function agregarConciliado(
  front: PropostaFrontRelatorio[],
  funcao: PropostaFuncaoRelatorio[],
  dimensao: IdCampoRelatorio | null,
  metrica: IdCampoRelatorio,
): PontoConciliado[] {
  const porNumero = new Map(funcao.map((linha) => [chaveProposta(linha.NumeroProposta), linha]));
  const grupos = new Map<string, {
    idsFront: Set<string>;
    numerosFuncao: Set<string>;
    integradas: Set<string>;
    valorContratado: number;
  }>();

  for (const linha of front) {
    const numero = chaveProposta(linha.numero_proposta);
    const dadoFuncao = porNumero.get(numero);
    const rotulo = rotuloDaDimensao(linha, dadoFuncao, dimensao);
    const grupo = grupos.get(rotulo) ?? {
      idsFront: new Set<string>(), numerosFuncao: new Set<string>(), integradas: new Set<string>(), valorContratado: 0,
    };
    const id = String(linha.id_front);
    if (!grupo.idsFront.has(id)) {
      grupo.idsFront.add(id);
      grupo.valorContratado += numeroPtBr(linha.valor_contrato);
    }
    if (numero) {
      grupo.numerosFuncao.add(numero);
      if (integrada(dadoFuncao)) grupo.integradas.add(numero);
    }
    grupos.set(rotulo, grupo);
  }

  const pontos = [...grupos].map(([rotulo, grupo]) => {
    let valor = 0;
    if (metrica === 'qtd_propostas') valor = grupo.idsFront.size;
    else if (metrica === 'valor_contratado') valor = grupo.valorContratado;
    else if (metrica === 'ticket_medio') valor = grupo.idsFront.size ? grupo.valorContratado / grupo.idsFront.size : 0;
    else if (metrica === 'valor_liberado') {
      valor = [...grupo.numerosFuncao].reduce((soma, numero) => soma + numeroPtBr(porNumero.get(numero)?.valor_liberado), 0);
    } else if (metrica === 'taxa_integracao') {
      valor = grupo.numerosFuncao.size ? 100 * grupo.integradas.size / grupo.numerosFuncao.size : 0;
    }
    return { rotulo, valor };
  });
  pontos.sort((a, b) => dimensao === 'hora_cadastro' || dimensao === 'dia_cadastro'
    ? a.rotulo.localeCompare(b.rotulo)
    : b.valor - a.valor || a.rotulo.localeCompare(b.rotulo));
  return pontos.slice(0, 50);
}
