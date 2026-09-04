import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BackButton } from '@/components/BackButton';
import { FrontDetailHead } from '@/components/FrontDetailHead';
import { FrontSummary } from '@/components/FrontSummary';
import { ItemsList } from '@/components/ItemsList';
import { prisma } from '@/lib/prisma';
import { resolveShareCompany } from '@/lib/shareLink';
import { mapFront } from '@/lib/viewModel';
import type { Company } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ShareFrontPage({
  params,
}: {
  params: Promise<{ token: string; frontSlug: string }>;
}) {
  const { token, frontSlug } = await params;

  const companyRow = await resolveShareCompany(token);
  if (!companyRow) notFound();

  const frontRow = await prisma.front.findUnique({
    where: { companyId_slug: { companyId: companyRow.id, slug: frontSlug } },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
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
      <Breadcrumbs items={[{ label: company.name, href: `/share/${token}` }, { label: front.title }]} />

      <BackButton href={`/share/${token}`} label={company.name} />

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
