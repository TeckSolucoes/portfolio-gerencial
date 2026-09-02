import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function AdminHomePage() {
  const [companies, frontCount, itemCount] = await Promise.all([
    prisma.company.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { fronts: true } } },
    }),
    prisma.front.count({ where: { archivedAt: null } }),
    prisma.frontItem.count(),
  ]);

  return (
    <>
      <div className="kicker">Curadoria</div>
      <h1>Painel administrativo</h1>
      <p className="lede">
        Visão geral do conteúdo cadastrado. Toda frente nasce em modo manual — os dados abaixo refletem o que foi
        cadastrado aqui, não uma sincronização automática.
      </p>

      <div className="admin-actions" style={{ marginBottom: 22 }}>
        <Link href="/admin/fronts/new" className="btn btn-primary">
          Nova frente completa
        </Link>
      </div>

      <div className="admin-notice">
        Nenhuma sincronização com o Jira configurada ainda. Frentes e itens são criados e mantidos manualmente nesta
        área até a integração existir.
      </div>

      <div className="admin-stat-row">
        <div className="admin-stat">
          <span className="asv">{companies.length}</span>
          <span className="asl">Empresas</span>
        </div>
        <div className="admin-stat">
          <span className="asv">{frontCount}</span>
          <span className="asl">Frentes ativas</span>
        </div>
        <div className="admin-stat">
          <span className="asv">{itemCount}</span>
          <span className="asl">Itens cadastrados</span>
        </div>
      </div>

      <h2 className="admin-section-title">Empresas</h2>
      <div className="admin-list">
        {companies.map((c) => (
          <Link key={c.id} href={`/admin/companies/${c.slug}/fronts`} className="admin-row">
            <div className="admin-row-main">
              <span className="admin-row-title">{c.name}</span>
              <span className="admin-row-meta">{c.tag}</span>
            </div>
            <span className="admin-row-count">
              {c._count.fronts} frente{c._count.fronts === 1 ? '' : 's'}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
