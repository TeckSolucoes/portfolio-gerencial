import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { agendaPadrao, estadoDosWorkers } from '@/lib/workers/motor';
import { carregarAcesso } from '@/lib/acesso';
import { podeAcessar } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

// Consultada pela tela /admin/workers a cada poucos segundos. Só superadmin.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  const acesso = await carregarAcesso();
  if (!acesso || !podeAcessar(acesso, 'workers')) return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 });
  const [workers, padrao] = await Promise.all([estadoDosWorkers(), agendaPadrao()]);
  return NextResponse.json({ agora: new Date().toISOString(), workers, padrao }, { headers: { 'Cache-Control': 'no-store' } });
}
