import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { agendaPadrao, estadoDosWorkers } from '@/lib/workers/motor';

export const dynamic = 'force-dynamic';

// Consultada pela tela /admin/workers a cada poucos segundos. Só superadmin.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (session.user.role !== 'superadmin') return NextResponse.json({ erro: 'Restrito a superadmin.' }, { status: 403 });
  const [workers, padrao] = await Promise.all([estadoDosWorkers(), agendaPadrao()]);
  return NextResponse.json({ agora: new Date().toISOString(), workers, padrao }, { headers: { 'Cache-Control': 'no-store' } });
}
