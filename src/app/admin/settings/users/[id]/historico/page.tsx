import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import '../../../../admin-forms.css';

const POR_PAGINA = 100;
const formatarData = (data: Date) => data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export default async function HistoricoUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== 'superadmin') redirect('/admin');
  const { id } = await params;
  const paginaPedida = Number((await searchParams).pagina ?? '1');
  const pagina = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;

  const usuario = await prisma.user.findUnique({ where: { id }, select: { id: true, displayName: true, email: true } });
  if (!usuario) notFound();
  const [total, eventos, ultimaLocalizacao] = await prisma.$transaction([
    prisma.auditoriaUsuario.count({ where: { userId: id } }),
    prisma.auditoriaUsuario.findMany({
      where: { userId: id },
      orderBy: { criadoEm: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.auditoriaUsuario.findFirst({
      where: { userId: id, latitude: { not: null }, longitude: { not: null } },
      orderBy: { criadoEm: 'desc' },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (pagina > paginas) redirect(`/admin/settings/users/${id}/historico?pagina=${paginas}`);

  return (
    <div className="adm">
      <div className="adm-history-head">
        <div>
          <div className="kicker">Usuários · Histórico</div>
          <h1>{usuario.displayName}</h1>
          <p className="lede">{usuario.email}</p>
        </div>
        <Link className="btn btn-secondary" href="/admin/settings/users">← Voltar aos usuários</Link>
      </div>

      <div className="adm-history-summary">
        <span>{total} {total === 1 ? 'movimentação' : 'movimentações'}</span>
        <span>Última localização: {ultimaLocalizacao ? `${ultimaLocalizacao.latitude!.toFixed(6)}, ${ultimaLocalizacao.longitude!.toFixed(6)}` : 'não informada'}</span>
      </div>

      {eventos.length === 0 ? (
        <div className="adm-empty-state"><strong>Nenhuma movimentação registrada</strong><span>Os novos acessos e alterações aparecerão aqui.</span></div>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-utable">
            <caption className="adm-sr">Histórico de movimentações de {usuario.displayName}</caption>
            <thead><tr><th>Data e hora</th><th>Movimento</th><th>Rota</th><th>Latitude</th><th>Longitude</th><th>Detalhes</th></tr></thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td data-label="Data e hora">{formatarData(evento.criadoEm)}</td>
                  <td data-label="Movimento">{evento.acao}</td>
                  <td data-label="Rota">{evento.rota ?? '—'}</td>
                  <td data-label="Latitude">{evento.latitude?.toFixed(6) ?? '—'}</td>
                  <td data-label="Longitude">{evento.longitude?.toFixed(6) ?? '—'}</td>
                  <td data-label="Detalhes" className="adm-history-details">{evento.detalhes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && <nav className="adm-pagination" aria-label="Paginação do histórico">
        {pagina > 1 ? <Link className="btn btn-secondary" href={`?pagina=${pagina - 1}`}>← Anterior</Link> : <span />}
        <span>Página {pagina} de {paginas}</span>
        {pagina < paginas ? <Link className="btn btn-secondary" href={`?pagina=${pagina + 1}`}>Próxima →</Link> : <span />}
      </nav>}
    </div>
  );
}
