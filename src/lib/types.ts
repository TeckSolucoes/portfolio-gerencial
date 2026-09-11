// Shape mirrors the approved mockup's `DATA` object exactly (company -> fronts[] -> items[]).
// Temporary/hardcoded stage: this file stays stable across the future Prisma swap.

export type Tone = 'violet' | 'ember' | 'teal' | 'rose' | 'sky';
export type FrontStatus = 'ok' | 'attention' | 'blocked' | 'concluido';
export type ItemStatus = 'done' | 'doing' | 'todo' | 'blocked';

export interface FrontItem {
  title: string;
  status: ItemStatus;
  updated: string;
  note?: string;
}

export interface Front {
  id: string;
  title: string;
  status: FrontStatus;
  owner: string;
  ownerInit: string;
  /** Ausente no mockData.ts (conceito só existe a partir do banco) — sempre presente vindo do Prisma via mapFront. */
  requester?: string;
  prioritized: boolean;
  progress: number;
  nextMilestone: string;
  nextDate: string;
  /** HTML string (may contain <strong>) rendered via dangerouslySetInnerHTML, same as the mockup. */
  summary: string;
  items: FrontItem[];
}

export interface Company {
  slug: string;
  name: string;
  tag: string;
  tone: Tone;
  tagline: string;
  fronts: Front[];
}
