import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusPill } from '@/components/StatusPill';
import { toggleFrontPriority } from './actions';
import { generateCompanyShareLink, renewCompanyShareLink, revokeCompanyShareLink } from '../shareActions';
import { ShareLinkAutoCopy } from '@/components/ShareLinkAutoCopy';
import type { FrontStatus } from '@/generated/prisma/enums';
import type { Company as PrismaCompany, Front as PrismaFront } from '@/generated/prisma/client';

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

function formatExpiry(date: Date): string {
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Só superadmin vê este painel (checado antes de renderizar, em AdminFrontsPage)
// — o link dá acesso público (sem login) aos dados desta empresa, então quem
// pode gerá-lo/revogá-lo é a mesma decisão de negócio de "quem pode priorizar".
function ShareLinkPanel({ companySlug, company }: { companySlug: string; company: PrismaCompany }) {
  const origin = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  const expired = company.shareExpiresAt ? company.shareExpiresAt.getTime() < Date.now() : true;

  return (
    <div className="admin-notice" style={{ marginBottom: 26 }}>
      <strong>Link externo (sem login)</strong>
      <p style={{ margin: '6px 0 12px' }}>
        {company.shareToken && !expired
          ? `Válido até ${formatExpiry(company.shareExpiresAt!)}.`
          : company.shareToken && expired
            ? 'O link anterior expirou — gere um novo para compartilhar de novo.'
            : 'Nenhum link ativo. Gere um para compartilhar esta empresa com alguém de fora, sem exigir login.'}
      </p>
      {company.shareToken && !expired && <ShareLinkAutoCopy shareUrl={`${origin}/share/${company.shareToken}`} />}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <form action={generateCompanyShareLink.bind(null, companySlug)}>
          <button type="submit" className="btn btn-secondary">
            {company.shareToken ? 'Gerar novo link' : 'Gerar link'}
          </button>
        </form>
        {company.shareToken && !expired && (
          <>
            <form action={renewCompanyShareLink.bind(null, companySlug)}>
              <button type="submit" className="btn btn-secondary">
                Renovar (+5 dias)
              </button>
            </form>
            <form action={revokeCompanyShareLink.bind(null, companySlug)}>
              <button type="submit" className="btn btn-danger">
                Revogar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
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
  const session = await auth();

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

      {session?.user.role === 'superadmin' && <ShareLinkPanel companySlug={companySlug} company={company} />}

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
