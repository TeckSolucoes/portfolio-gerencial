import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BackButton } from '@/components/BackButton';
import { FrontDetailHead } from '@/components/FrontDetailHead';
import { FrontSummary } from '@/components/FrontSummary';
import { ItemsList } from '@/components/ItemsList';
import { prisma } from '@/lib/prisma';
import { mapFront } from '@/lib/viewModel';
import type { Company } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FrontPage({
  params,
}: {
  params: Promise<{ companySlug: string; frontSlug: string }>;
}) {
  const { companySlug, frontSlug } = await params;

  const companyRow = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!companyRow) notFound();

  const frontRow = await prisma.front.findUnique({
    where: { companyId_slug: { companyId: companyRow.id, slug: frontSlug } },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  // Frente arquivada não existe para a visão pública, mesmo por URL direta.
  if (!frontRow || frontRow.archivedAt) notFound();

  const front = mapFront(frontRow);
  const company: Company = {
    slug: companyRow.slug,
    name: companyRow.name,
    tag: companyRow.tag,
    tone: companyRow.tone,
    tagline: companyRow.tagline,
    fronts: [],
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Grupo Teck', href: '/' },
          { label: company.name, href: `/${companySlug}` },
          { label: front.title },
        ]}
      />

      <BackButton href={`/${companySlug}`} label={company.name} />

      <FrontDetailHead front={front} company={company} />

      <FrontSummary html={front.summary} />

      <div className="items-head">
        <h3>Itens da frente</h3>
        <span className="src">Fonte: Jira · traduzido para linguagem de negócio</span>
      </div>
      <ItemsList items={front.items} />
    </>
  );
}
