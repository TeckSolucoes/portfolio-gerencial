import type { FrontStatus, ItemStatus } from './types';

export const STATUS_LABEL: Record<FrontStatus, string> = {
  ok: 'Em dia',
  attention: 'Atenção',
  blocked: 'Bloqueada',
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  done: 'Concluído',
  doing: 'Em andamento',
  todo: 'A fazer',
  blocked: 'Bloqueado',
};

/** Maps an item status onto the shared `.pill-status` tone classes; '' means the neutral/todo look. */
export function itemPillClass(status: ItemStatus): '' | 'ok' | 'attention' | 'blocked' {
  if (status === 'done') return 'ok';
  if (status === 'doing') return 'attention';
  if (status === 'blocked') return 'blocked';
  return '';
}

// --- Derivação Prisma -> view-model (plano §1, ver prisma/schema.prisma) ---

type DerivationMode = 'manual' | 'auto';

/** `statusOverride` nulo só ocorreria para um item ainda não tocado por um sync do Jira, que não existe hoje. */
export function resolveItemStatus(statusOverride: ItemStatus | null): ItemStatus {
  return statusOverride ?? 'todo';
}

function utcDayFloor(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Inverso exato do `parseUpdated` de prisma/seed.ts: mesmos buckets, mesma âncora em dias UTC. */
export function formatRelativeUpdated(date: Date | null, now: Date = new Date()): string {
  if (!date) return '—';
  const diffDays = Math.round((utcDayFloor(now) - utcDayFloor(date)) / 86400000);
  if (diffDays <= 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  return `há ${diffDays} dias`;
}

/** Inverso exato do `parseNextDate` de prisma/seed.ts: dia/mês em UTC. */
export function formatNextDate(date: Date | null): string {
  if (!date) return '—';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function resolveFrontProgress(
  front: { progressMode: DerivationMode; progressManual: number | null },
  items: { statusOverride: ItemStatus | null; hidden: boolean }[],
): number {
  if (front.progressMode === 'manual') return front.progressManual ?? 0;

  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return 0;
  const done = visible.filter((i) => resolveItemStatus(i.statusOverride) === 'done').length;
  return Math.round((done / visible.length) * 100);
}

const STALE_DOING_DAYS = 10;

export function resolveFrontStatus(
  front: { statusMode: DerivationMode; statusManual: FrontStatus | null; nextDate: Date | null },
  items: { statusOverride: ItemStatus | null; hidden: boolean; updatedAt: Date }[],
  progress: number,
  now: Date = new Date(),
): FrontStatus {
  // Sem sync do Jira ainda, statusMode é sempre 'manual' na prática — o ramo 'auto'
  // abaixo existe para não deixar a intenção do schema sem implementação.
  if (front.statusMode === 'manual') return front.statusManual ?? 'attention';

  const visible = items.filter((i) => !i.hidden);
  if (visible.some((i) => resolveItemStatus(i.statusOverride) === 'blocked')) return 'blocked';

  const overdue = front.nextDate !== null && front.nextDate.getTime() < now.getTime() && progress < 100;
  const staleDoing = visible.some((i) => {
    if (resolveItemStatus(i.statusOverride) !== 'doing') return false;
    return (now.getTime() - i.updatedAt.getTime()) / 86400000 > STALE_DOING_DAYS;
  });

  return overdue || staleDoing ? 'attention' : 'ok';
}
