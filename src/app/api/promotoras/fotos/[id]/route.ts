import { carregarAcesso } from '@/lib/acesso';
import { podeAcessar } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';
import { carregarFoto, ErroFoto, lerCorpoFoto, lerIdFoto, origemPermitida, salvarFoto } from '@/lib/promotoras/fotos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Contexto = { params: Promise<{ id: string }> };
const headersPrivados = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

function respostaErro(erro: unknown) {
  return Response.json({ erro: erro instanceof ErroFoto ? erro.message : 'Não foi possível acessar a foto.' }, { status: erro instanceof ErroFoto ? erro.status : 500, headers: headersPrivados });
}

async function autorizar(id: string) {
  const acesso = await carregarAcesso();
  if (!acesso) throw new ErroFoto('Não autenticado.', 401);
  if (acesso.perfil !== 'superadmin' || !podeAcessar(acesso, 'hierarquia')) throw new ErroFoto('Sem permissão.', 403);
  const { tipo, cadastroId } = lerIdFoto(id);
  const existe = tipo === 'ceo' || (tipo === 'gerente'
    ? await prisma.gerenteComercial.findUnique({ where: { id: cadastroId! }, select: { id: true } })
    : await prisma.promotora.findUnique({ where: { id: cadastroId! }, select: { id: true } }));
  if (!existe) throw new ErroFoto('Cadastro não encontrado.', 404);
}

export async function GET(_req: Request, contexto: Contexto) {
  try {
    const { id } = await contexto.params;
    await autorizar(id);
    const foto = await carregarFoto(id);
    if (!foto) throw new ErroFoto('Foto não encontrada.', 404);
    return new Response(new Uint8Array(foto.bytes), { headers: { ...headersPrivados, 'Content-Type': foto.mime } });
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function PUT(req: Request, contexto: Contexto) {
  try {
    const { id } = await contexto.params;
    await autorizar(id);
    const origem = req.headers.get('origin');
    const contextoOrigem = req.headers.get('sec-fetch-site');
    if (!origemPermitida(req.url, origem, contextoOrigem, process.env.AUTH_URL || process.env.NEXTAUTH_URL)) throw new ErroFoto('Origem não permitida.', 403);
    const bytes = await lerCorpoFoto(req);
    await salvarFoto(id, bytes, req.headers.get('content-type'));
    return Response.json({ ok: true }, { headers: headersPrivados });
  } catch (erro) {
    return respostaErro(erro);
  }
}
