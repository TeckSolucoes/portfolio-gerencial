import type { Company as CompanyRow, Front as FrontRow, FrontItem as FrontItemRow } from '@/generated/prisma/client';
import {
  resolveItemStatus,
  resolveFrontProgress,
  resolveFrontStatus,
  formatRelativeUpdated,
  formatNextDate,
} from './status';
import type { Company, Front, FrontItem } from './types';

// Camada de mapeamento Prisma -> view-model (plano §4). As páginas públicas
// buscam fronts e itens já ordenados por sortOrder (orderBy na própria query),
// então as funções abaixo não reordenam nada.

type FrontWithItems = FrontRow & { items: FrontItemRow[] };
type CompanyWithFronts = CompanyRow & { fronts: FrontWithItems[] };

function mapFrontItem(item: FrontItemRow): FrontItem {
  // titleOverride é nulo apenas para um item futuro ainda não editado pela curadoria
  // (título viria do cache do Jira) — não acontece hoje, sem sync implementado.
  return {
    title: item.titleOverride ?? '',
    status: resolveItemStatus(item.statusOverride),
    updated: formatRelativeUpdated(item.updatedAt),
    note: item.note ?? undefined,
  };
}

export function mapFront(front: FrontWithItems): Front {
  const progress = resolveFrontProgress(front, front.items);
  const status = resolveFrontStatus(front, front.items, progress);

  return {
    id: front.slug,
    title: front.title,
    status,
    owner: front.ownerName,
    ownerInit: front.ownerInitials,
    prioritized: front.prioritized,
    progress,
    nextMilestone: front.nextMilestone ?? '—',
    nextDate: formatNextDate(front.nextDate),
    summary: front.summaryHtml,
    items: front.items.map(mapFrontItem),
  };
}

export function mapCompany(company: CompanyWithFronts): Company {
  return {
    slug: company.slug,
    name: company.name,
    tag: company.tag,
    tone: company.tone,
    tagline: company.tagline,
    fronts: company.fronts.map(mapFront),
  };
}
