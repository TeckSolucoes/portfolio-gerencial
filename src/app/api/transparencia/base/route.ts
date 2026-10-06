import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { efetivado } from '@/lib/transparencia/baseClientes';
import { gravarBase, origemValida } from '@/lib/transparencia/painel';
import { registrarAuditoria } from '@/lib/auditoria';
import { carregarAcesso } from '@/lib/acesso';
import { podeAcessar } from '@/lib/permissoes';
import { restricaoOperacaoNominal } from '../autorizacao';

export const dynamic = 'force-dynamic';

const LIMITE_BYTES = 50 * 1024 * 1024; // igual ao proxyClientMaxBodySize do next.config.ts

// Export do Front ou SELECT do Função: tenta UTF-8; se vier caractere inválido, é Latin-1 (Excel antigo).
function decodificar(bytes: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  return utf8.includes('�') ? new TextDecoder('latin1').decode(bytes) : utf8;
}

// Upload da nossa base (substitui a base daquela origem). Só superadmin.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  const acesso = await carregarAcesso();
  if (!acesso) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  const restricao = restricaoOperacaoNominal(acesso.perfil);
  if (restricao) return NextResponse.json({ erro: restricao.erro }, { status: restricao.status });
  const usuario = session.user;
  if (!podeAcessar(acesso, 'transparencia')) return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const origem = form?.get('origem');
  const arquivo = form?.get('arquivo');
  if (!origemValida(origem)) return NextResponse.json({ erro: 'Escolha a origem: Front ou Função.' }, { status: 400 });
  if (!(arquivo instanceof File) || arquivo.size === 0) return NextResponse.json({ erro: 'Escolha o arquivo (CSV).' }, { status: 400 });
  if (arquivo.size > LIMITE_BYTES) return NextResponse.json({ erro: 'Arquivo acima de 50 MB. Exporte só as colunas necessárias.' }, { status: 413 });

  try {
    const r = await gravarBase(origem, arquivo.name, decodificar(await arquivo.arrayBuffer()), usuario.email ?? null);
    await registrarAuditoria(usuario, {
      acao: 'Base de clientes importada',
      rota: '/transparencia',
      detalhes: `${origem} · ${arquivo.name} · ${r.linhas.length} linhas`,
    });
    return NextResponse.json({
      linhas: r.linhas.length,
      ignoradas: r.ignoradas,
      colunas: r.colunas,
      status: r.status.map((s) => ({ ...s, contaComoFechado: efetivado(s.status === '(sem status)' ? '' : s.status) })),
    });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Falha ao importar.' }, { status: 400 });
  }
}
