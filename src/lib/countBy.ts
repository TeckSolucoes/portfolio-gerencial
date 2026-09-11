import type { Front } from './types';

// "concluido" conta como "ok" nesse resumo agregado (barra de 3 segmentos por
// empresa, stats da home) — front concluída não é um problema, mesma família
// de "sem risco" que "em dia" pra esse recorte. O pill individual de cada
// frente continua mostrando "Concluído" à parte (StatusPill).
export function countBy(fronts: Front[]): { ok: number; attention: number; blocked: number } {
  const c = { ok: 0, attention: 0, blocked: 0 };
  fronts.forEach((f) => {
    c[f.status === 'concluido' ? 'ok' : f.status]++;
  });
  return c;
}
