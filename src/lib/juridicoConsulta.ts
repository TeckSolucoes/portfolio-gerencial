import { formatarCnpj } from './cnpj';

export type EmpresaMonitorada = { cnpj: string; razaoSocial: string; nomeFantasia: string | null };

export const TERMOS_FONTE = {
  internet: '',
  processos: '(processo OR tribunal OR justiça OR ação judicial)',
  licitacoes: '(licitação OR pregão OR contrato público OR PNCP)',
} as const;

export type FonteMonitoramento = keyof typeof TERMOS_FONTE;

export function termosMonitorados(empresa: EmpresaMonitorada): string[] {
  return [...new Set([
    empresa.razaoSocial.trim(),
    empresa.nomeFantasia?.trim() ?? '',
    formatarCnpj(empresa.cnpj),
    empresa.cnpj,
  ].filter(Boolean))];
}

export function consultaMonitoramento(empresa: EmpresaMonitorada, fonte: FonteMonitoramento): string {
  const identificadores = termosMonitorados(empresa).map((termo) => `"${termo}"`).join(' OR ');
  return `(${identificadores}) ${TERMOS_FONTE[fonte]}`.trim();
}
