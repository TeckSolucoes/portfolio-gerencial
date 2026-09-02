import { prisma } from '@/lib/prisma';
import { NewFrontWithItemsForm } from './NewFrontWithItemsForm';

export default async function NewFrontPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;

  const companies = await prisma.company.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <>
      <div className="kicker">Curadoria</div>
      <h1>Nova frente completa</h1>
      <p className="lede">
        Escolha a empresa, preencha os dados da frente e já cadastre as atividades iniciais — tudo em uma única
        tela. A frente nasce em modo manual; ajustes finos ficam disponíveis na tela de edição depois de salvar.
      </p>

      <NewFrontWithItemsForm companies={companies} selectedCompanySlug={company ?? ''} />
    </>
  );
}
