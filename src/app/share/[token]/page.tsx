import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { FrontsSection } from '@/components/FrontsSection';
import { prisma } from '@/lib/prisma';
import { resolveShareCompany } from '@/lib/shareLink';
import { mapCompany } from '@/lib/viewModel';

export const dynamic = 'force-dynamic';

export default async function ShareCompanyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const company = await resolveShareCompany(token);
  if (!company) notFound();

  const companyRow = await prisma.company.findUnique({
    where: { id: company.id },
    include: {
      fronts: {
        where: { archivedAt: null },
        orderBy: { sortOrder: 'asc' },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
  if (!companyRow) notFound();

  const view = mapCompany(companyRow);
  // FrontCard/FrontsSection só usam este prop como prefixo de URL (não validam
  // slug de empresa de verdade), então passar "share/token" aqui faz os links
  // internos apontarem pra /share/[token]/[frontSlug] sem tocar nesses componentes.
  const linkPrefix = `share/${token}`;

  return (
    <>
      <Breadcrumbs items={[{ label: view.name }]} />

      <div className="admin-notice" style={{ marginBottom: 26 }}>
        Link de visualização externa — sem necessidade de login. Válido até{' '}
        {company.shareExpiresAt!.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}.
      </div>

      <div className="toprow">
        <div>
          <h1 style={{ marginBottom: 4 }}>{view.name}</h1>
          <p className="lede" style={{ marginBottom: 0 }}>
            {view.tagline}
          </p>
        </div>
      </div>

      {view.fronts.length === 0 ? (
        <p className="admin-empty">Nenhuma frente cadastrada ainda.</p>
      ) : (
        <FrontsSection companySlug={linkPrefix} fronts={view.fronts} />
      )}
    </>
  );
}
