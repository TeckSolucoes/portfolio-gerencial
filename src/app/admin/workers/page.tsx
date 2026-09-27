import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { agendaPadrao, estadoDosWorkers } from '@/lib/workers/motor';
import { Painel } from './painel';

export const dynamic = 'force-dynamic';

export default async function WorkersPage() {
  const session = await auth();
  if (session?.user?.role !== 'superadmin') redirect('/');

  const [workers, padrao] = await Promise.all([estadoDosWorkers(), agendaPadrao()]);
  return <Painel inicial={workers} padraoInicial={padrao} agoraInicial={new Date().toISOString()} />;
}
