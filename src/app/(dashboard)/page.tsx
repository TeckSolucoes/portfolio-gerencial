import { GroupStatRow } from '@/components/GroupStatRow';
import { CompanyCard } from '@/components/CompanyCard';
import { prisma } from '@/lib/prisma';
import { countBy } from '@/lib/countBy';
import { mapCompany } from '@/lib/viewModel';

// Dados vêm direto do Prisma a cada request — sem isso o Next poderia prerenderizar
// esta página estaticamente no build e nunca refletir empresas/frentes novas.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const companyRows = await prisma.company.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      fronts: {
        where: { archivedAt: null },
        orderBy: { sortOrder: 'asc' },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  const companies = companyRows.map(mapCompany);
  const allFronts = companies.flatMap((c) => c.fronts);
  const total = countBy(allFronts);

  return (
    <>
      <div className="kicker">Visão do Grupo</div>
      <h1>Como estão as frentes do grupo hoje?</h1>
      <p className="lede">
        Panorama consolidado das empresas do grupo. Selecione uma para ver as frentes macro e, dentro delas, o
        andamento traduzido a partir do Jira.
      </p>

      <GroupStatRow total={allFronts.length} ok={total.ok} attention={total.attention} blocked={total.blocked} />

      <div className="companies">
        {companies.map((company, i) => (
          <CompanyCard key={company.slug} slug={company.slug} company={company} index={i} />
        ))}
      </div>
    </>
  );
}
