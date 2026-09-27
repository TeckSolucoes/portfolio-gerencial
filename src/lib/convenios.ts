const chave = (valor: string) => valor
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[^A-Z0-9]+/gi, ' ')
  .trim()
  .replace(/\s+/g, ' ')
  .toUpperCase();

const CANONICOS: Record<string, string> = {
  'GOV SAO PAULO': 'GOV SÃO PAULO',
  'GOV SAO PAULO SPPREV': 'GOV SÃO PAULO SPPREV',
  'PREF SAO PAULO SP': 'PREF SÃO PAULO SP',
  'GOV PARAIBA': 'GOV PARAÍBA',
  'GOV MARANHAO': 'GOV MARANHÃO',
  'GOV GOIAS': 'GOV GOIÁS',
  'GOV CEARA': 'GOV CEARÁ',
};

// Unifica caixa, espaços, pontuação e as variantes com/sem acento usadas pelo Front.
export function normalizarConvenio(valor: string): string {
  const id = chave(valor);
  return CANONICOS[id] ?? id;
}
