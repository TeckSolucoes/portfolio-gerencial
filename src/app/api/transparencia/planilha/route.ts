import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { carregarAcesso } from '@/lib/acesso';
import { podeAcessar } from '@/lib/permissoes';
import { linhasDoMes } from '@/lib/transparencia/painel';
import { gerarPlanilha } from '@/lib/transparencia/planilha';
import { registrarAuditoria } from '@/lib/auditoria';
import { restricaoOperacaoNominal } from '../autorizacao';

export const dynamic = 'force-dynamic';

// Planilha do comercial com os acionáveis de um mês. Só superadmin (tem nome de pessoa).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  const acesso = await carregarAcesso();
  if (!acesso) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  const restricao = restricaoOperacaoNominal(acesso.perfil);
  if (restricao) return NextResponse.json({ erro: restricao.erro }, { status: restricao.status });
  const usuario = session.user;
  if (!podeAcessar(acesso, 'transparencia')) return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 });

  const mes = new URL(req.url).searchParams.get('mes') ?? '';
  if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ erro: 'Mês inválido (use AAAA-MM).' }, { status: 400 });
  const linhas = await linhasDoMes(mes);
  await registrarAuditoria(usuario, {
    acao: 'Planilha nominal exportada',
    rota: '/transparencia',
    detalhes: `${mes} · ${linhas.length} linhas`,
  });
  return new NextResponse(gerarPlanilha(linhas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes-novos-${mes}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
