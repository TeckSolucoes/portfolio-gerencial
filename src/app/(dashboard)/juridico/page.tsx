import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { formatarCnpj } from '@/lib/cnpj';
import { CadastroCnpj } from './CadastroCnpj';
import { alternarCnpj, marcarEventosVistos } from './actions';
import './juridico.css';

export const dynamic = 'force-dynamic';

const quando = (data: Date | null) => data ? data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Ainda não consultado';
const nomesFonte: Record<string, string> = { cadastro: 'Cadastro', internet: 'Internet', processos: 'Processos', licitacoes: 'Licitações', sancoes: 'Sanções' };

export default async function JuridicoPage() {
  await requireFuncionalidadeForPage('juridico');
  const empresas = await prisma.juridicoEmpresa.findMany({
    orderBy: { razaoSocial: 'asc' },
    include: { fontes: { orderBy: { fonte: 'asc' } }, eventos: { orderBy: { encontradoEm: 'desc' }, take: 8 } },
  });
  const totalEventos = await prisma.juridicoEvento.count();
  const naoVistos = await prisma.juridicoEvento.count({ where: { visto: false } });
  return <div className="juridico">
    <header className="jur-head">
      <div><p className="jur-kicker">Risco e inteligência corporativa</p><h1>Jurídico</h1><p>Cadastre os CNPJs do grupo e acompanhe alterações cadastrais, menções, processos, licitações e sanções.</p></div>
      <Link href="/admin/workers" className="jur-worker-link">Configurar workers</Link>
    </header>

    <section className="jur-kpis" aria-label="Resumo">
      <article><span>CNPJs monitorados</span><strong>{empresas.filter((e) => e.ativo).length}</strong></article>
      <article><span>Eventos encontrados</span><strong>{totalEventos}</strong></article>
      <article className={naoVistos ? 'alerta' : ''}><span>Novos alertas</span><strong>{naoVistos}</strong></article>
    </section>

    <CadastroCnpj />

    {empresas.length === 0 ? <section className="jur-vazio"><strong>Nenhum CNPJ cadastrado.</strong><p>Use o campo acima para começar. Os workers sempre leem esta lista; nenhum CNPJ fica fixo no código.</p></section> : <div className="jur-lista">
      {empresas.map((empresa) => <article className={`jur-empresa${empresa.ativo ? '' : ' pausada'}`} key={empresa.id}>
        <div className="jur-empresa-head">
          <div><span className="jur-situacao">{empresa.situacaoCadastral ?? 'Situação não informada'}</span><h2>{empresa.razaoSocial}</h2><p>{empresa.nomeFantasia || formatarCnpj(empresa.cnpj)} · {formatarCnpj(empresa.cnpj)}</p></div>
          <form action={alternarCnpj}><input type="hidden" name="id" value={empresa.id} /><input type="hidden" name="ativo" value={String(!empresa.ativo)} /><button>{empresa.ativo ? 'Pausar' : 'Ativar'}</button></form>
        </div>
        <dl className="jur-dados"><div><dt>Local</dt><dd>{[empresa.municipio, empresa.uf].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt>Natureza</dt><dd>{empresa.naturezaJuridica || '—'}</dd></div><div><dt>Atividade principal</dt><dd>{empresa.atividadePrincipal || '—'}</dd></div><div><dt>Cadastro atualizado</dt><dd>{quando(empresa.dadosAtualizadosEm)}</dd></div></dl>
        <div className="jur-fontes">{['cadastro', 'internet', 'processos', 'licitacoes', 'sancoes'].map((fonte) => {
          const estado = empresa.fontes.find((f) => f.fonte === fonte);
          return <div className={`jur-fonte ${estado?.status ?? 'pendente'}`} key={fonte}><span>{nomesFonte[fonte]}</span><strong>{estado?.status === 'ok' ? 'Monitorando' : estado?.status === 'erro' ? 'Falha' : 'Aguardando worker'}</strong><small>{estado?.mensagem ?? 'Sem execução registrada.'}</small></div>;
        })}</div>
        <div className="jur-eventos-head"><h3>Últimos eventos</h3>{empresa.eventos.some((e) => !e.visto) && <form action={marcarEventosVistos}><input type="hidden" name="empresaId" value={empresa.id} /><button>Marcar como vistos</button></form>}</div>
        {empresa.eventos.length === 0 ? <p className="jur-sem-evento">Nenhum evento encontrado até agora.</p> : <ul className="jur-eventos">{empresa.eventos.map((evento) => <li className={evento.visto ? '' : 'novo'} key={evento.id}><span>{evento.tipo}</span><div><strong>{evento.url ? <a href={evento.url} target="_blank" rel="noreferrer">{evento.titulo}</a> : evento.titulo}</strong><small>{evento.resumo} · encontrado em {quando(evento.encontradoEm)}</small></div></li>)}</ul>}
      </article>)}
    </div>}
  </div>;
}
