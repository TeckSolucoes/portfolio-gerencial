import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { estadoDosWorkers } from '@/lib/workers/motor';
import { Painel } from './painel';

export const dynamic = 'force-dynamic';

export default async function WorkersPage() {
  const session = await auth();
  if (session?.user?.role !== 'superadmin') redirect('/');

  const workers = await estadoDosWorkers();
  return <Painel inicial={workers} agoraInicial={new Date().toISOString()} />;
}
