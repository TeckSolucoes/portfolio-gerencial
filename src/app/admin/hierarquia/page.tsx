import { requireFuncionalidadeForPage } from '@/lib/authz';
import { redirect } from 'next/navigation';
import { listarEstruturaComercial } from '@/lib/hierarquia/servico';
import { EstruturaComercialClient } from './EstruturaComercialClient';
import './hierarquia.css';

export const dynamic = 'force-dynamic';

export default async function HierarquiaPage() {
  const acesso = await requireFuncionalidadeForPage('hierarquia');
  if (acesso.perfil !== 'superadmin') redirect('/');
  const dados = await listarEstruturaComercial();

  return <EstruturaComercialClient dados={dados} />;
}
