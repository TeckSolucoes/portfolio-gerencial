export const VALOR_MAXIMO = 1e12;

export type ResultadoValor = { ok: true; valor: number } | { ok: false; erro: string };

// Aceita '8.000.000,00', '8000000', '8000000.50', 'R$ 8.000,5'. Ponto isolado com grupos de 3
// dígitos ('8.000') é milhar em pt-BR; qualquer outro ponto único é decimal.
export function parseValorBR(entrada: string | null | undefined): ResultadoValor {
  const bruto = (entrada ?? '').replace(/R\$|\s/g, '');
  if (!bruto) return { ok: false, erro: 'Informe um valor.' };

  let normalizado: string;
  if (bruto.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(bruto)) return { ok: false, erro: 'Valor inválido.' };
    normalizado = bruto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(bruto)) {
    normalizado = bruto.replace(/\./g, '');
  } else if (/^\d+(\.\d+)?$/.test(bruto)) {
    normalizado = bruto;
  } else if (/^-/.test(bruto)) {
    return { ok: false, erro: 'A meta não pode ser negativa.' };
  } else {
    return { ok: false, erro: 'Valor inválido.' };
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor)) return { ok: false, erro: 'Valor inválido.' };
  if (valor <= 0) return { ok: false, erro: 'A meta precisa ser maior que zero (para remover, use Limpar).' };
  if (valor > VALOR_MAXIMO) return { ok: false, erro: 'Valor absurdo (acima de 1 trilhão).' };
  return { ok: true, valor };
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarBRL = (valor: number): string => brl.format(valor);

const numero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
// Para preencher o input: '8.000.000,00' sem o símbolo da moeda.
export const formatarInputBR = (valor: number): string => numero.format(valor);

export const mesValido = (mes: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);

export function mesAtual(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

export function somarMeses(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number);
  const idx = a * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

// Do mês informado para trás: [mes, mes-1, ..., mes-(n-1)].
export function ultimosMeses(mes: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => somarMeses(mes, -i));
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function rotuloMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${NOMES_MES[m - 1]} de ${a}`;
}
