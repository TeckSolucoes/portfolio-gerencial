import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StatusPill } from '@/components/StatusPill';
import { toggleFrontPriority } from './actions';
import type { FrontStatus } from '@/generated/prisma/enums';
import type { Front as PrismaFront } from '@/generated/prisma/client';

type FrontWithCount = PrismaFront & { _count: { items: number } };

function AdminStatusBadge({ status }: { status: FrontStatus | null }) {
  if (!status) {
    return (
      <span className="pill-status" style={{ background: 'var(--hair)', color: 'var(--text-dim)' }}>
        <span className="d" style={{ background: 'var(--text-faint)' }}></span>
        Sem status
      </span>
    );
  }
  return <StatusPill status={status} />;
}

function FrontRow({ companySlug, front }: { companySlug: string; front: FrontWithCount }) {
  return (
    <div className="admin-row">
      <form action={toggleFrontPriority.bind(null, companySlug, front.id)}>
        <button
          type="submit"
          className={`admin-priority-toggle ${front.prioritized ? 'on' : 'off'}`}
          title={
            front.prioritized
              ? 'Priorizada pela diretoria — clique para remover'
              : 'Sem prioridade — clique para priorizar'
          }
        >
          <span className="apt-star">{front.prioritized ? '★' : '☆'}</span>
          <span className="apt-label">{front.prioritized ? 'Priorizada' : 'Priorizar'}</span>
        </button>
      </form>

      <Link href={`/admin/companies/${companySlug}/fronts/${front.slug}`} className="admin-row-link">
        <div className="admin-row-main">
          <span className="admin-row-title">{front.title}</span>
          <span className="admin-row-meta">
            {front._count.items} iten{front._count.items === 1 ? '' : 's'} · {front.ownerName}
          </span>
        </div>
        <div className="admin-row-tags">
          <AdminStatusBadge status={front.statusManual} />
        </div>
        <span className="admin-row-count">→</span>
      </Link>
    </div>
  );
}

export default async function AdminFrontsPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;

  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    include: {
      fronts: {
        where: { archivedAt: null },
        orderBy: [{ prioritized: 'desc' }, { sortOrder: 'asc' }],
        include: { _count: { select: { items: true } } },
      },
    },
  });
  if (!company) notFound();

  const prioritized = company.fronts.filter((f) => f.prioritized);
  const others = company.fronts.filter((f) => !f.prioritized);

  return (
    <>
      <div className="kicker">Curadoria · {company.name}</div>
      <h1>Frentes de {company.name}</h1>
      <p className="lede">
        Toda frente nasce em modo manual — status, progresso e priorização são definidos na tela de edição de cada
        uma. Clique na estrela para priorizar ou despriorizar direto na lista.
      </p>

      <Link href={`/admin/fronts/new?company=${companySlug}`} className="btn btn-primary" style={{ marginBottom: 22 }}>
        Nova frente completa
      </Link>

      {company.fronts.length === 0 ? (
        <p className="admin-empty">Nenhuma frente cadastrada ainda.</p>
      ) : (
        <>
          <div className="admin-group-header admin-group-header-priority">
            <span className="apt-star">★</span> Priorizadas pela diretoria ({prioritized.length})
          </div>
          {prioritized.length === 0 ? (
            <p className="admin-empty admin-empty-group">Nenhuma frente priorizada no momento.</p>
          ) : (
            <div className="admin-list admin-list-priority">
              {prioritized.map((front) => (
                <FrontRow key={front.id} companySlug={companySlug} front={front} />
              ))}
            </div>
          )}

          <div className="admin-group-header">
            <span className="apt-star">☆</span> Sem prioridade ({others.length})
          </div>
          {others.length === 0 ? (
            <p className="admin-empty admin-empty-group">Todas as frentes estão priorizadas.</p>
          ) : (
            <div className="admin-list">
              {others.map((front) => (
                <FrontRow key={front.id} companySlug={companySlug} front={front} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
