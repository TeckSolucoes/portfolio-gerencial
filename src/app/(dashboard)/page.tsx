import { Suspense } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { dataExtenso } from '@/lib/tempo';
import { BLOCOS, Bolsa, BolsaSkeleton, BlocoNoticias, DiarioHome, DiarioHomeSkeleton, Indicadores, IndicadoresSkeleton, NoticiasSkeleton } from './secoes';
import './home.css';

export const dynamic = 'force-dynamic';

async function Saudacao() {
  const session = await auth();
  const nome = session?.user?.displayName?.trim().split(/\s+/)[0];
  return <>Bem-vindo{nome ? `, ${nome}` : ''}</>;
}

export default function HomePage() {
  return (
    <div className="home">
      <section className="abertura" aria-label="Boas-vindas">
        <h1>
          <Suspense fallback="Bem-vindo">
            <Saudacao />
          </Suspense>
        </h1>
        <p className="abertura-data">{dataExtenso(new Date())}</p>
        <p className="sub">Mercado, bancos, investimentos e consignado reunidos, com os relatórios da operação a um clique.</p>
      </section>

      <div className="topo">
        <Suspense fallback={<BolsaSkeleton />}>
          <Bolsa />
        </Suspense>
        <Suspense fallback={<IndicadoresSkeleton />}>
          <Indicadores />
        </Suspense>
      </div>

      <section className="acesso" aria-labelledby="h-acesso">
        <h2 id="h-acesso" className="sec-titulo">Acesso rápido</h2>
        <div className="atalhos">
          <Link href="/relatorio" className="atalho t-azul">
            <span className="atalho-nome">Relatório Gerencial</span>
            <span className="atalho-desc">Metas, ranking e churn por equipe, com a leitura do dia.</span>
            <span className="atalho-ir">
              Abrir relatório <span aria-hidden="true">→</span>
            </span>
          </Link>
          <Link href="/monitoramento" className="atalho t-laranja">
            <span className="atalho-nome">Monitoramento</span>
            <span className="atalho-desc">Alertas de propostas em convênios fora do padrão de cada equipe.</span>
            <span className="atalho-ir">
              Abrir monitoramento <span aria-hidden="true">→</span>
            </span>
          </Link>
          <Link href="/transparencia" className="atalho t-verde">
            <span className="atalho-nome">Transparência</span>
            <span className="atalho-desc">Servidores federais por órgão, pelo Portal da Transparência.</span>
            <span className="atalho-ir">
              Abrir transparência <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>

      <div className="sec-diario">
        <Suspense fallback={<DiarioHomeSkeleton />}>
          <DiarioHome />
        </Suspense>
      </div>

      <h2 className="sec-titulo sec-noticias">Notícias</h2>
      <div className="blocos">
        {BLOCOS.map((b) => (
          <Suspense key={b.id} fallback={<NoticiasSkeleton id={b.id} titulo={b.titulo} tom={b.tom} />}>
            <BlocoNoticias {...b} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
