import type { Alerta, TipoAlerta } from './detectar';

export interface LinhaUnidade {
  unidade: string;
  alertas: number;
  INÉDITO: number;
  RARO: number;
  PICO: number;
}

export const filtrarPorTipo = (alertas: Alerta[], tipo: TipoAlerta | null) =>
  tipo ? alertas.filter((a) => a.tipos.includes(tipo)) : alertas;

export function porUnidade(alertas: Alerta[], n = 8): LinhaUnidade[] {
  const m = new Map<string, LinhaUnidade>();
  for (const a of alertas) {
    const l = m.get(a.unidade) ?? { unidade: a.unidade, alertas: 0, INÉDITO: 0, RARO: 0, PICO: 0 };
    l.alertas += 1;
    for (const t of a.tipos) l[t] += 1;
    m.set(a.unidade, l);
  }
  return [...m.values()].sort((a, b) => b.alertas - a.alertas || a.unidade.localeCompare(b.unidade)).slice(0, n);
}
