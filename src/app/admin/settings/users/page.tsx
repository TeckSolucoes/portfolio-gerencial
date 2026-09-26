import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NewUserForm, UserRow } from './UserForms';

export default async function UsersPage() {
  const session = await auth();
  if (session?.user.role !== 'superadmin') redirect('/admin');

  const users = await prisma.user.findMany({ orderBy: { email: 'asc' } });

  return (
    <>
      <div className="kicker">Configurações · Superadmin</div>
      <h1>Usuários</h1>
      <p className="lede">
        Gerencie quem acessa o portfólio. Visualizadores só enxergam a visão pública; gerentes e superadmins acessam
        esta área administrativa.
      </p>
      <p className="admin-hint" style={{ marginBottom: 20 }}>
        Regra de acesso: o usuário só vê dados das empresas marcadas; sem empresa marcada ele não vê relatórios.
        &quot;Restringir à turma do gerente&quot; limita ainda mais; sem isso ele vê a empresa inteira.
      </p>

      <h2 className="admin-section-title">Novo usuário</h2>
      <NewUserForm />

      <h2 className="admin-section-title">Usuários cadastrados</h2>
      <div className="admin-list admin-list-items">
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
    </>
  );
}
