import { redirect } from 'next/navigation';
import { carregarAcesso } from '@/lib/acesso';
import { podeAcessar } from '@/lib/permissoes';

// Sem tela de "Painel administrativo": quem administra cai direto na gestão de usuários.
// (O layout já barra visitante e visualizador; quem não é superadmin volta ao início.)
export default async function AdminIndex() {
  const acesso = await carregarAcesso();
  if (!acesso) redirect('/login');
  if (acesso.perfil === 'superadmin') redirect('/admin/settings/users');
  if (podeAcessar(acesso, 'metas')) redirect('/admin/metas');
  if (podeAcessar(acesso, 'workers')) redirect('/admin/workers');
  redirect('/');
}
