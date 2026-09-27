export const FUNCIONALIDADES = [
  { chave: 'relatorio', nome: 'Relatório Gerencial', rota: '/relatorio' },
  { chave: 'monitoramento', nome: 'Monitoramento', rota: '/monitoramento' },
  { chave: 'diario_oficial', nome: 'Diário Oficial', rota: '/diario-oficial' },
  { chave: 'transparencia', nome: 'Transparência', rota: '/transparencia' },
  { chave: 'custos', nome: 'Custos', rota: '/custos' },
  { chave: 'metas', nome: 'Metas', rota: '/admin/metas' },
  { chave: 'workers', nome: 'Workers', rota: '/admin/workers' },
] as const;

export type Funcionalidade = (typeof FUNCIONALIDADES)[number]['chave'];

export const CHAVES_FUNCIONALIDADES = FUNCIONALIDADES.map((item) => item.chave);

export function ehFuncionalidade(valor: string): valor is Funcionalidade {
  return CHAVES_FUNCIONALIDADES.includes(valor as Funcionalidade);
}

