import { auth } from '@/lib/auth';
import { ibovespa, indicadores, noticias } from '@/lib/mercado';
import type { Noticia } from '@/lib/mercado';

export const dynamic = 'force-dynamic';

const numero = (n: number, casas = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const quando = (d: Date | null) =>
  d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';

function Noticias({ titulo, itens, id }: { titulo: string; itens: Noticia[] | null; id: string }) {
  return (
    <section className="home-card" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      {itens === null || itens.length === 0 ? (
        <p className="home-vazio">Notícias indisponíveis no momento.</p>
      ) : (
        <ol className="home-noticias">
          {itens.map((n) => (
            <li key={n.link}>
              <a href={n.link} target="_blank" rel="noopener noreferrer">
                {n.titulo}
              </a>
              <span>
                {[n.fonte, quando(n.publicadaEm)].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function HomePage() {
  const [session, bolsa, taxas, mercado, bancos, investimentos, consignado] = await Promise.all([
    auth(),
    ibovespa(),
    indicadores(),
    noticias('mercado financeiro'),
    noticias('bancos'),
    noticias('investimentos'),
    noticias('crédito consignado'),
  ]);

  const primeiroNome = session?.user?.displayName?.trim().split(/\s+/)[0];
  const sobe = bolsa?.variacaoPct != null && bolsa.variacaoPct >= 0;

  return (
    <>
      <div className="kicker">Início</div>
      <h1>Bem-vindo{primeiroNome ? `, ${primeiroNome}` : ''}</h1>
      <p className="lede">Mercado financeiro, bancos, investimentos e consignado em um só lugar.</p>

      <div className="home-topo">
        <section className="home-card home-bolsa" aria-labelledby="h-bolsa">
          <h2 id="h-bolsa">Bolsa · Ibovespa</h2>
          {bolsa ? (
            <>
              <div className="home-valor">{numero(bolsa.pontos, 0)} pts</div>
              {bolsa.variacaoPct != null && (
                <div className={sobe ? 'home-var alta' : 'home-var baixa'}>
                  {sobe ? '▲' : '▼'} {numero(Math.abs(bolsa.variacaoPct))}% no dia
                </div>
              )}
              <div className="home-fonte">Atualizado em {quando(bolsa.em)} · pode ter atraso</div>
            </>
          ) : (
            <p className="home-vazio">Cotação indisponível no momento.</p>
          )}
        </section>

        <section className="home-card home-taxas" aria-labelledby="h-taxas">
          <h2 id="h-taxas">Indicadores · Banco Central</h2>
          {taxas.length === 0 ? (
            <p className="home-vazio">Indicadores indisponíveis no momento.</p>
          ) : (
            <div className="home-indicadores">
              {taxas.map((t) => (
                <div key={t.rotulo}>
                  <span className="home-rot">{t.rotulo}</span>
                  <span className="home-num">{numero(t.valor)}</span>
                  <span className="home-fonte">
                    {t.unidade} · ref. {t.data}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="home-grade">
        <Noticias id="h-mercado" titulo="Mercado financeiro" itens={mercado} />
        <Noticias id="h-bancos" titulo="Bancos" itens={bancos} />
        <Noticias id="h-invest" titulo="Investimentos" itens={investimentos} />
        <Noticias id="h-consig" titulo="Crédito consignado" itens={consignado} />
      </div>
    </>
  );
}
