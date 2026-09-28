import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { dataExtenso } from '@/lib/tempo';
import { BLOCOS, Bolsa, BolsaSkeleton, BlocoNoticias, DiarioHome, DiarioHomeSkeleton, Indicadores, IndicadoresSkeleton, NoticiasSkeleton } from './secoes';
import './home.css';
import { carregarAcesso } from '@/lib/acesso';
import { podeAcessar } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

async function Saudacao() {
  const session = await auth();
  const nome = session?.user?.displayName?.trim().split(/\s+/)[0];
  return <>Bem-vindo{nome ? `, ${nome}` : ''}</>;
}

export default async function HomePage() {
  const acesso = await carregarAcesso();
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

      {acesso && podeAcessar(acesso, 'diario_oficial') && <div className="sec-diario">
        <Suspense fallback={<DiarioHomeSkeleton />}>
          <DiarioHome />
        </Suspense>
      </div>}

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
