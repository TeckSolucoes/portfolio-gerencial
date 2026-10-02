import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { dataExtenso } from '@/lib/tempo';
import { BLOCOS, Bolsa, BolsaSkeleton, BlocoNoticias, DiarioHome, DiarioHomeSkeleton, Indicadores, IndicadoresSkeleton, NoticiasSkeleton } from './secoes';
import { OctaChat } from '@/components/OctaChat';
import './home.css';
import { carregarAcesso } from '@/lib/acesso';
import { podeAcessar } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

async function Saudacao() {
  const session = await auth();
  const nome = session?.user?.displayName?.trim().split(/\s+/)[0];
  return <>Bem-vindo{nome ? `, ${nome}` : ''}</>;
}

// Isolado num componente à parte, em Suspense próprio: assim a checagem de acesso (banco) não
// atrasa o resto da home, que já tem tudo em Suspense — antes ficava num `await` solto no topo
// de HomePage, na frente de qualquer streaming, então qualquer lentidão travava a página inteira.
async function SecaoDiario() {
  const acesso = await carregarAcesso();
  if (!acesso || !podeAcessar(acesso, 'diario_oficial')) return null;
  return (
    <div className="sec-diario">
      <Suspense fallback={<DiarioHomeSkeleton />}>
        <DiarioHome />
      </Suspense>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="home">
      <OctaChat />
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

      <Suspense fallback={null}>
        <SecaoDiario />
      </Suspense>

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
