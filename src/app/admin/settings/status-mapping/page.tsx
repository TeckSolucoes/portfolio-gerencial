import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NewMappingForm, MappingRow } from './StatusMappingForms';

export default async function StatusMappingPage() {
  const session = await auth();
  if (session?.user.role !== 'superadmin') redirect('/admin');

  const mappings = await prisma.jiraStatusMapping.findMany({ orderBy: { jiraStatusName: 'asc' } });

  return (
    <>
      <div className="kicker">Configurações · Superadmin</div>
      <h1>Mapeamento de status do Jira</h1>
      <p className="lede">
        Define como cada status de issue do Jira vira um dos 4 estados usados no portfólio. Um status do Jira sem
        mapeamento cai em &quot;A fazer&quot; por padrão quando a sincronização existir.
      </p>

      <NewMappingForm />

      <div className="admin-list admin-list-items">
        {mappings.length === 0 ? (
          <p className="admin-empty">Nenhum mapeamento cadastrado ainda.</p>
        ) : (
          mappings.map((mapping) => <MappingRow key={mapping.id} mapping={mapping} />)
        )}
      </div>
    </>
  );
}
