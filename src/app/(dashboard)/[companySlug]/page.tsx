import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { FrontsSection } from '@/components/FrontsSection';
import { prisma } from '@/lib/prisma';
import { mapCompany } from '@/lib/viewModel';

export const dynamic = 'force-dynamic';

export default async function CompanyPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;

  const [companyRow, allCompanies] = await Promise.all([
    prisma.company.findUnique({
      where: { slug: companySlug },
      include: {
        fronts: {
          where: { archivedAt: null },
          orderBy: [{ prioritized: 'desc' }, { sortOrder: 'asc' }],
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    }),
    prisma.company.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true } }),
  ]);
  if (!companyRow) notFound();

  const company = mapCompany(companyRow);
  const otherCompanies = allCompanies.filter((c) => c.slug !== companySlug);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Grupo Teck', href: '/' }, { label: company.name }]} />

      <div className="toprow">
        <div>
          <h1 style={{ marginBottom: 4 }}>{company.name}</h1>
          <p className="lede" style={{ marginBottom: 0 }}>
            {company.tagline}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {otherCompanies.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="fchip" style={{ whiteSpace: 'nowrap' }}>
              {c.name} →
            </Link>
          ))}
        </div>
      </div>

      {company.fronts.length === 0 ? (
        <p className="admin-empty">Nenhuma frente cadastrada ainda.</p>
      ) : (
        <FrontsSection companySlug={companySlug} fronts={company.fronts} />
      )}
    </>
  );
}
