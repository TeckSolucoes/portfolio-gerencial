import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

// Sem tela de "Painel administrativo": quem administra cai direto na gestão de usuários.
// (O layout já barra visitante e visualizador; quem não é superadmin volta ao início.)
export default async function AdminIndex() {
  const session = await auth();
  redirect(session?.user?.role === 'superadmin' ? '/admin/settings/users' : '/');
}
