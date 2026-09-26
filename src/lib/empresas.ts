export const EMPRESAS = ['AKRK', 'DIG'] as const;
export type Empresa = (typeof EMPRESAS)[number];

export const ROTULO_EMPRESA: Record<Empresa, string> = { AKRK: 'AKRK', DIG: 'DIG' };

// O Front nomeia a equipe como "AKRK - PRAIA DO FLAMENGO": o prefixo antes do " - " é a empresa.
// Equipe sem prefixo reconhecido devolve null e, para quem não é superadmin, fica invisível
// (falha fechada: melhor esconder do que mostrar a empresa errada).
// ASSUNÇÃO A CONFIRMAR: o prefixo da DIG começa com "DIG" (o export atual só tem AKRK).
export function empresaDaEquipe(equipe: string): Empresa | null {
  const prefixo = equipe.split(/\s+-\s+/)[0]?.trim().toUpperCase() ?? '';
  if (prefixo === 'AKRK') return 'AKRK';
  if (prefixo.startsWith('DIG')) return 'DIG';
  return null;
}

export function lerEmpresas(csv: string | null | undefined): Empresa[] {
  const pedidas = new Set((csv ?? '').split(',').map((s) => s.trim().toUpperCase()));
  return EMPRESAS.filter((e) => pedidas.has(e));
}

export const gravarEmpresas = (empresas: readonly string[]): string => lerEmpresas(empresas.join(',')).join(',');
