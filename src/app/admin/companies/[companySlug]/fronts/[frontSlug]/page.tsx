import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EditFrontForm } from './EditFrontForm';
import { archiveFront, unarchiveFront } from './actions';

export default async function EditFrontPage({
  params,
}: {
  params: Promise<{ companySlug: string; frontSlug: string }>;
}) {
  const { companySlug, frontSlug } = await params;
  const session = await auth();

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) notFound();
  const front = await prisma.front.findUnique({
    where: { companyId_slug: { companyId: company.id, slug: frontSlug } },
  });
  if (!front) notFound();

  const isSuperadmin = session?.user.role === 'superadmin';

  return (
    <>
      <div className="kicker">Curadoria · {company.name}</div>
      <h1>{front.title}</h1>

      {front.archivedAt && (
        <div className="admin-notice admin-notice-warn">
          Esta frente está arquivada e não aparece na visão pública.
        </div>
      )}

      <EditFrontForm companySlug={companySlug} frontSlug={frontSlug} front={front} />

      <Link href={`/admin/companies/${companySlug}/fronts/${frontSlug}/items`} className="btn btn-secondary btn-anchor">
        Gerenciar itens desta frente →
      </Link>

      {isSuperadmin && (
        <div className="admin-danger-zone">
          <h2 className="admin-section-title">Zona de risco</h2>
          {front.archivedAt ? (
            <form action={unarchiveFront.bind(null, companySlug, frontSlug)}>
              <button type="submit" className="btn btn-secondary">
                Reativar frente
              </button>
            </form>
          ) : (
            <form action={archiveFront.bind(null, companySlug, frontSlug)}>
              <button type="submit" className="btn btn-danger">
                Arquivar frente
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
