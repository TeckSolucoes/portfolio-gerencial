import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NewItemForm, ItemRow } from './ItemForms';

export default async function AdminItemsPage({
  params,
}: {
  params: Promise<{ companySlug: string; frontSlug: string }>;
}) {
  const { companySlug, frontSlug } = await params;

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) notFound();
  const front = await prisma.front.findUnique({
    where: { companyId_slug: { companyId: company.id, slug: frontSlug } },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!front) notFound();

  return (
    <>
      <div className="kicker">Curadoria · {company.name}</div>
      <h1>Itens de {front.title}</h1>
      <p className="lede">
        Sem sincronização com o Jira ainda, os itens são cadastrados aqui manualmente. Um item marcado como
        bloqueado precisa de uma observação explicando o motivo.
      </p>

      <Link href={`/admin/companies/${companySlug}/fronts/${frontSlug}`} className="btn-ghost" style={{ marginBottom: 22 }}>
        ← Voltar para a frente
      </Link>

      <NewItemForm companySlug={companySlug} frontSlug={frontSlug} />

      <div className="admin-list admin-list-items">
        {front.items.length === 0 ? (
          <p className="admin-empty">Nenhum item cadastrado ainda.</p>
        ) : (
          front.items.map((item) => (
            <ItemRow key={item.id} companySlug={companySlug} frontSlug={frontSlug} item={item} />
          ))
        )}
      </div>
    </>
  );
}
