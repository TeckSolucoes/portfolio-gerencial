import type { Front } from './types';

export function countBy(fronts: Front[]): { ok: number; attention: number; blocked: number } {
  const c = { ok: 0, attention: 0, blocked: 0 };
  fronts.forEach((f) => {
    c[f.status]++;
  });
  return c;
}
