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
