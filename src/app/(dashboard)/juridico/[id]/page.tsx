import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { formatarCnpj } from '@/lib/cnpj';
import { termosMonitorados } from '@/lib/juridicoConsulta';
import { alternarCnpj, marcarEventosVistos } from '../actions';
import '../juridico.css';

export const dynamic = 'force-dynamic';

const quando = (data: Date | null) => data ? data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Ainda não consultado';
const nomesFonte: Record<string, string> = { cadastro: 'Cadastro', internet: 'Internet', processos: 'Processos', licitacoes: 'Licitações', sancoes: 'Sanções' };

export default async function JuridicoEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFuncionalidadeForPage('juridico');
  const { id } = await params;
  const empresa = await prisma.juridicoEmpresa.findUnique({
    where: { id },
    include: { fontes: { orderBy: { fonte: 'asc' } }, eventos: { orderBy: { encontradoEm: 'desc' }, take: 200 } },
  });
  if (!empresa) notFound();
  const totalEventos = await prisma.juridicoEvento.count({ where: { empresaId: id } });
  const novos = await prisma.juridicoEvento.count({ where: { empresaId: id, visto: false } });

  return <div className="juridico jur-detalhe">
    <nav className="jur-voltar"><Link href="/juridico">← Todas as empresas</Link><Link href="/admin/workers">Configurar workers</Link></nav>
    <header className="jur-empresa-head jur-detalhe-head">
      <div><span className="jur-situacao">{empresa.situacaoCadastral ?? 'Situação não informada'}</span><h1>{empresa.razaoSocial}</h1><p>{empresa.nomeFantasia || formatarCnpj(empresa.cnpj)} · {formatarCnpj(empresa.cnpj)}</p></div>
      <form action={alternarCnpj}><input type="hidden" name="id" value={empresa.id} /><input type="hidden" name="ativo" value={String(!empresa.ativo)} /><button>{empresa.ativo ? 'Pausar monitoramento' : 'Ativar monitoramento'}</button></form>
    </header>

    <section className="jur-kpis jur-kpis-detalhe"><article><span>Eventos</span><strong>{totalEventos}</strong></article><article className={novos ? 'alerta' : ''}><span>Não vistos</span><strong>{novos}</strong></article><article><span>Estado</span><strong className="jur-kpi-texto">{empresa.ativo ? 'Ativo' : 'Pausado'}</strong></article></section>

    <dl className="jur-dados"><div><dt>Local</dt><dd>{[empresa.municipio, empresa.uf].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt>Natureza</dt><dd>{empresa.naturezaJuridica || '—'}</dd></div><div><dt>Atividade principal</dt><dd>{empresa.atividadePrincipal || '—'}</dd></div><div><dt>Consulta cadastral</dt><dd>{quando(empresa.dadosAtualizadosEm)}<a className="jur-registro-link" href={`https://brasilapi.com.br/api/cnpj/v1/${empresa.cnpj}`} target="_blank" rel="noreferrer">Abrir registro na BrasilAPI</a></dd></div></dl>
    <div className="jur-termos"><strong>Termos monitorados</strong><div>{termosMonitorados(empresa).map((termo) => <span key={termo}>{termo}</span>)}</div><small>Referência Google Alerts: razão social, nome fantasia e CNPJ.</small></div>
    <div className="jur-fontes">{['cadastro', 'internet', 'processos', 'licitacoes', 'sancoes'].map((fonte) => {
      const estado = empresa.fontes.find((item) => item.fonte === fonte);
      return <div className={`jur-fonte ${estado?.status ?? 'pendente'}`} key={fonte}><span>{nomesFonte[fonte]}</span><strong>{estado?.status === 'ok' ? 'Monitorando' : estado?.status === 'erro' ? 'Falha' : 'Aguardando worker'}</strong><small>{estado?.mensagem ?? 'Sem execução registrada.'}</small>{estado && <small>Última consulta: {quando(estado.consultadoEm)}</small>}</div>;
    })}</div>

    <section className="jur-historico">
      <div className="jur-eventos-head"><div><p className="jur-kicker">Linha do tempo</p><h2>Histórico de monitoramento</h2></div>{novos > 0 && <form action={marcarEventosVistos}><input type="hidden" name="empresaId" value={empresa.id} /><button>Marcar todos como vistos</button></form>}</div>
      {empresa.eventos.length === 0 ? <p className="jur-sem-evento">Nenhum evento encontrado até agora.</p> : <ul className="jur-eventos">{empresa.eventos.map((evento) => <li className={evento.visto ? '' : 'novo'} key={evento.id}><span>{evento.tipo}</span><div><strong>{evento.url ? <a href={evento.url} target="_blank" rel="noreferrer">{evento.titulo}</a> : evento.titulo}</strong><small>{evento.resumo || 'Sem resumo'} · encontrado em {quando(evento.encontradoEm)}</small></div></li>)}</ul>}
      {totalEventos > empresa.eventos.length && <p className="jur-limite">Exibindo os 200 eventos mais recentes de {totalEventos}.</p>}
    </section>
  </div>;
}
