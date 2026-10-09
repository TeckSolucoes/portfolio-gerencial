import { requireFuncionalidadeForPage } from '@/lib/authz';
import { redirect } from 'next/navigation';
import { listarEstruturaComercial } from '@/lib/hierarquia/servico';
import { EstruturaComercialClient } from './EstruturaComercialClient';
import './hierarquia.css';
import { listarPromotoras } from '@/lib/promotoras/servico';
import { PromotorasClient } from './promotoras/PromotorasClient';
import './promotoras/promotoras.css';

export const dynamic = 'force-dynamic';

export default async function HierarquiaPage() {
  const acesso = await requireFuncionalidadeForPage('hierarquia');
  if (acesso.perfil !== 'superadmin') redirect('/');
  const [dados, promotoras] = await Promise.all([listarEstruturaComercial(), listarPromotoras()]);

  return <EstruturaComercialClient dados={dados} organograma={<PromotorasClient dados={promotoras} compacto />} />;
}
