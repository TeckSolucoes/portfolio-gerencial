import { requireFuncionalidadeForPage } from '@/lib/authz';
import { agendaPadrao, estadoDosWorkers } from '@/lib/workers/motor';
import { Painel } from './painel';

export const dynamic = 'force-dynamic';

export default async function WorkersPage() {
  await requireFuncionalidadeForPage('workers');

  const [workers, padrao] = await Promise.all([estadoDosWorkers(), agendaPadrao()]);
  return <Painel inicial={workers} padraoInicial={padrao} agoraInicial={new Date().toISOString()} />;
}
