import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { formatarCnpj } from '@/lib/cnpj';
import { CadastroCnpj } from './CadastroCnpj';
import './juridico.css';

export const dynamic = 'force-dynamic';

const FONTES = ['cadastro', 'internet', 'processos', 'licitacoes', 'sancoes'];

function Sino({ quantidade }: { quantidade: number }) {
  return <span className={`jur-sino${quantidade ? ' ativo' : ''}`} aria-label={quantidade ? `${quantidade} alertas não vistos` : 'Sem alertas novos'}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
    {quantidade > 0 && <b>{quantidade > 99 ? '99+' : quantidade}</b>}
  </span>;
}

export default async function JuridicoPage() {
  await requireFuncionalidadeForPage('juridico');
  const empresas = await prisma.juridicoEmpresa.findMany({
    orderBy: { razaoSocial: 'asc' },
    include: {
      fontes: { orderBy: { fonte: 'asc' } },
      eventos: { where: { visto: false }, select: { id: true } },
      _count: { select: { eventos: true } },
    },
  });
  const totalEventos = await prisma.juridicoEvento.count();
  const naoVistos = empresas.reduce((total, empresa) => total + empresa.eventos.length, 0);
  return <div className="juridico">
    <header className="jur-head">
      <div><p className="jur-kicker">Risco e inteligência corporativa</p><h1>Jurídico</h1><p>Visão geral dos CNPJs monitorados. Abra uma empresa para consultar seu histórico completo.</p></div>
      <Link href="/admin/workers" className="jur-worker-link">Configurar workers</Link>
    </header>

    <section className="jur-kpis" aria-label="Resumo">
      <article><span>CNPJs monitorados</span><strong>{empresas.filter((e) => e.ativo).length}</strong></article>
      <article><span>Eventos encontrados</span><strong>{totalEventos}</strong></article>
      <article className={naoVistos ? 'alerta' : ''}><span>Novos alertas</span><strong>{naoVistos}</strong></article>
    </section>

    <CadastroCnpj />

    {empresas.length === 0 ? <section className="jur-vazio"><strong>Nenhum CNPJ cadastrado.</strong><p>Use o campo acima para começar. Os workers sempre leem esta lista; nenhum CNPJ fica fixo no código.</p></section> : <section className="jur-cards" aria-label="Empresas monitoradas">
      {empresas.map((empresa) => {
        const falhas = empresa.fontes.filter((fonte) => fonte.status === 'erro').length;
        const fontesOk = empresa.fontes.filter((fonte) => fonte.status === 'ok').length;
        return <Link href={`/juridico/${empresa.id}`} className={`jur-card${empresa.ativo ? '' : ' pausada'}${empresa.eventos.length ? ' com-alerta' : ''}`} key={empresa.id}>
          <div className="jur-card-topo"><span className={`jur-estado${empresa.ativo ? '' : ' pausado'}`}>{empresa.ativo ? 'Monitorando' : 'Pausado'}</span><Sino quantidade={empresa.eventos.length} /></div>
          <div className="jur-card-corpo"><p>{empresa.nomeFantasia || 'Empresa do grupo'}</p><h2>{empresa.razaoSocial}</h2><span>{formatarCnpj(empresa.cnpj)}</span><small>{[empresa.municipio, empresa.uf].filter(Boolean).join(' · ') || 'Local não informado'}</small></div>
          <div className="jur-card-fontes" aria-label="Estado das fontes">
            {FONTES.map((fonte) => {
              const estado = empresa.fontes.find((item) => item.fonte === fonte)?.status ?? 'pendente';
              return <i className={estado} key={fonte} title={`${fonte}: ${estado}`} />;
            })}
            <span>{falhas ? `${falhas} fonte${falhas > 1 ? 's' : ''} com falha` : `${fontesOk}/${FONTES.length} fontes consultadas`}</span>
          </div>
          <footer><span>{empresa._count.eventos} evento{empresa._count.eventos === 1 ? '' : 's'}</span><strong>Abrir histórico <b aria-hidden="true">→</b></strong></footer>
        </Link>;
      })}
    </section>}
  </div>;
}
