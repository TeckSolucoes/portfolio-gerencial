import { createHash } from 'node:crypto';

// Mapeamento mensal de servidores (Portal da Transparência) para achar clientes novos e medir quem
// virou tomador. Funções PURAS (sem rede, disco ou banco): o worker e a tela só orquestram.
//
// Cruzamento com a nossa base: o Portal mascara o CPF (***.123.456-**), então a chave de uma pessoa é
// "6 dígitos do meio do CPF + nome normalizado". Da nossa base guardamos só o hash dessa chave
// (irreversível): dá para cruzar sem manter CPF nem nome de cliente no painel.

export interface ServidorPortal {
  id: string; // Id_SERVIDOR_PORTAL: fixo por pessoa entre os meses
  nome: string;
  cpf6: string; // 6 dígitos visíveis do CPF
  orgao: string;
  orgaoSuperior: string;
  uf: string;
  cargo: string;
  situacao: string;
  ingressoCargo: string; // YYYY-MM-DD ou ''
}

export type TipoNovo = 'recem-nomeado' | 'outro';

export interface ServidorNovo extends ServidorPortal {
  tipo: TipoNovo;
  chave: string; // hash de cpf6 + nome, o mesmo usado na nossa base
}

export interface ResultadoMes {
  mes: string; // YYYY-MM do arquivo do Portal
  totalServidores: number;
  entraram: number; // estão neste mês e não estavam no anterior
  jaClientes: number; // dos que entraram, quantos já estão na nossa base
  acionaveis: ServidorNovo[]; // entraram e não são clientes: a lista do comercial
}

export interface ContratoBase {
  chave: string;
  data: string; // YYYY-MM-DD
  valor: number;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// "José  da Silva-Júnior" e "JOSE DA SILVA JUNIOR" viram a mesma coisa.
export function normalizarNome(nome: string): string {
  return semAcento(nome)
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// CPF completo (98712345610) ou mascarado do Portal (***.123.456-**): devolve os 6 dígitos do meio.
export function cpfDoMeio(cpf: string): string | null {
  const bruto = cpf.trim();
  if (/[*xX]/.test(bruto)) {
    const d = bruto.replace(/\D/g, '');
    return d.length === 6 ? d : null;
  }
  const d = bruto.replace(/\D/g, '');
  if (!d || d.length > 11) return null;
  return d.padStart(11, '0').slice(3, 9);
}

// A partir dos 6 dígitos já extraídos (é o que o leitor do Portal guarda).
export function chaveDoMeio(cpf6: string, nome: string): string | null {
  const n = normalizarNome(nome);
  if (!/^\d{6}$/.test(cpf6) || !n) return null;
  return createHash('sha256').update(`${cpf6}|${n}`).digest('hex');
}

// A partir de um CPF completo (nossa base) ou mascarado (Portal).
export function chavePessoa(cpf: string, nome: string): string | null {
  const meio = cpfDoMeio(cpf);
  return meio ? chaveDoMeio(meio, nome) : null;
}

const primeiroDia = (mes: string, deslocamento = 0) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + deslocamento, 1));
  return d.toISOString().slice(0, 10);
};

// Recém-nomeado: entrou no cargo no mês do arquivo ou no anterior (o Portal publica com atraso,
// e quem toma posse no fim do mês pode só aparecer no arquivo seguinte).
export function tipoDoNovo(s: ServidorPortal, mes: string): TipoNovo {
  return s.ingressoCargo && s.ingressoCargo >= primeiroDia(mes, -1) ? 'recem-nomeado' : 'outro';
}

// Compara o mês atual com o anterior. "idsAnteriores" é só o conjunto de IDs do mês anterior:
// não precisamos guardar o resto do cadastro antigo. Na leitura em fluxo, "atual" pode vir já só com
// quem não estava no mês anterior; aí o total do mês é informado à parte.
export function compararMeses(
  mes: string,
  atual: readonly ServidorPortal[],
  idsAnteriores: ReadonlySet<string>,
  nossaBase: ReadonlySet<string>,
  totalServidores?: number,
): ResultadoMes {
  const vistos = new Set<string>();
  let entraram = 0;
  let jaClientes = 0;
  const acionaveis: ServidorNovo[] = [];
  for (const s of atual) {
    // Quem tem mais de um vínculo aparece em mais de uma linha: conta a pessoa uma vez.
    if (vistos.has(s.id)) continue;
    vistos.add(s.id);
    if (idsAnteriores.has(s.id)) continue;
    entraram++;
    const chave = chaveDoMeio(s.cpf6, s.nome);
    if (chave && nossaBase.has(chave)) {
      jaClientes++;
      continue;
    }
    acionaveis.push({ ...s, tipo: tipoDoNovo(s, mes), chave: chave ?? '' });
  }
  acionaveis.sort((a, b) => Number(b.tipo === 'recem-nomeado') - Number(a.tipo === 'recem-nomeado') || a.orgao.localeCompare(b.orgao) || a.nome.localeCompare(b.nome));
  return { mes, totalServidores: totalServidores ?? vistos.size, entraram, jaClientes, acionaveis };
}

export interface Faixa {
  rotulo: string;
  ate: number | null; // null = sem teto
}

export const FAIXAS_PADRAO: readonly Faixa[] = [
  { rotulo: 'Até R$ 5 mil', ate: 5_000 },
  { rotulo: 'R$ 5 mil a R$ 20 mil', ate: 20_000 },
  { rotulo: 'Acima de R$ 20 mil', ate: null },
];

export interface IndicadorLista {
  mes: string;
  acionaveis: number;
  tomadores: number;
  conversao: number; // % de tomadores sobre acionáveis
  valorTotal: number;
  porFaixa: { rotulo: string; tomadores: number; valor: number }[];
}

// Dos acionáveis de uma lista, quem fechou contrato a partir do mês da lista. Conta cada pessoa uma
// vez, pelo PRIMEIRO contrato depois da lista (é ele que mostra o efeito do acionamento); a faixa é
// a do valor desse contrato.
export function indicadorDaLista(
  mes: string,
  chavesAcionaveis: readonly string[],
  contratos: readonly ContratoBase[],
  faixas: readonly Faixa[] = FAIXAS_PADRAO,
): IndicadorLista {
  const desde = primeiroDia(mes);
  const alvo = new Set(chavesAcionaveis.filter(Boolean));
  const primeiro = new Map<string, ContratoBase>();
  for (const c of contratos) {
    if (!alvo.has(c.chave) || c.data < desde) continue;
    const atual = primeiro.get(c.chave);
    if (!atual || c.data < atual.data) primeiro.set(c.chave, c);
  }
  const porFaixa = faixas.map((f) => ({ rotulo: f.rotulo, tomadores: 0, valor: 0 }));
  let valorTotal = 0;
  for (const c of primeiro.values()) {
    const i = faixas.findIndex((f) => f.ate === null || c.valor <= f.ate);
    const alvoFaixa = porFaixa[i === -1 ? porFaixa.length - 1 : i];
    alvoFaixa.tomadores++;
    alvoFaixa.valor += c.valor;
    valorTotal += c.valor;
  }
  const arred = (v: number) => Math.round(v * 100) / 100;
  return {
    mes,
    acionaveis: alvo.size,
    tomadores: primeiro.size,
    conversao: alvo.size ? Math.round((10000 * primeiro.size) / alvo.size) / 100 : 0,
    valorTotal: arred(valorTotal),
    porFaixa: porFaixa.map((f) => ({ ...f, valor: arred(f.valor) })),
  };
}
