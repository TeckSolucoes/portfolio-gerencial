import { redirect } from 'next/navigation';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { listarPromotoras } from '@/lib/promotoras/servico';
import { PromotorasClient } from './PromotorasClient';
import './promotoras.css';

export const dynamic = 'force-dynamic';

export default async function PromotorasPage() {
  const acesso = await requireFuncionalidadeForPage('hierarquia');
  if (acesso.perfil !== 'superadmin') redirect('/');
  return <PromotorasClient dados={await listarPromotoras()} />;
}
