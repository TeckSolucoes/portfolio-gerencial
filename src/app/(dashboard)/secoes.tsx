import { ibovespa, indicadores, noticias } from '@/lib/mercado';
import type { Noticia } from '@/lib/mercado';
import { tempoRelativo } from '@/lib/tempo';
import { atosConsolidados } from '@/lib/diarios';
import Link from 'next/link';

const numero = (n: number, casas = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const horario = (d: Date) =>
  d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

const TOM_INDICADOR: Record<string, string> = { 'Selic (meta)': 't-azul', CDI: 't-roxo', IPCA: 't-laranja' };

export const BLOCOS = [
  { id: 'h-mercado', titulo: 'Mercado financeiro', consulta: 'mercado financeiro', tom: 't-azul' },
  { id: 'h-bancos', titulo: 'Bancos', consulta: 'bancos', tom: 't-roxo' },
  { id: 'h-invest', titulo: 'Investimentos', consulta: 'investimentos', tom: 't-verde' },
  { id: 'h-consig', titulo: 'Crédito consignado', consulta: 'crédito consignado', tom: 't-laranja' },
] as const;

export async function Bolsa() {
  const bolsa = await ibovespa();
  const sobe = bolsa?.variacaoPct != null && bolsa.variacaoPct >= 0;
  const tom = bolsa?.variacaoPct == null ? 't-azul' : sobe ? 't-verde' : 't-vermelho';
  return (
    <section className={`kpi kpi-bolsa ${tom}`} aria-labelledby="h-bolsa">
      <h2 id="h-bolsa" className="kpi-rot">Bolsa · Ibovespa</h2>
      {bolsa ? (
        <>
          <div className="kpi-val kpi-val-grande">
            {numero(bolsa.pontos, 0)} <small>pts</small>
          </div>
          {bolsa.variacaoPct != null && (
            <div className="variacao">
              <span aria-hidden="true">{sobe ? '▲' : '▼'}</span>
              <span className="sr">{sobe ? 'Alta de' : 'Queda de'}</span> {numero(Math.abs(bolsa.variacaoPct))}% no dia
            </div>
          )}
          <p className="kpi-meta">Atualizado em {horario(bolsa.em)} · pode ter atraso</p>
        </>
      ) : (
        <p className="vazio">Cotação indisponível no momento.</p>
      )}
    </section>
  );
}

export async function Indicadores() {
  const taxas = await indicadores();
  return (
    <section className="taxas" aria-labelledby="h-taxas">
      <h2 id="h-taxas" className="sec-titulo">Indicadores · Banco Central</h2>
      {taxas.length === 0 ? (
        <p className="vazio vazio-caixa">Indicadores indisponíveis no momento.</p>
      ) : (
        <div className="kpis">
          {taxas.map((t) => (
            <div key={t.rotulo} className={`kpi ${TOM_INDICADOR[t.rotulo] ?? 't-azul'}`}>
              <div className="kpi-rot">{t.rotulo}</div>
              <div className="kpi-val">
                {numero(t.valor)} <small>{t.unidade}</small>
              </div>
              <p className="kpi-meta">Ref. {t.data}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Lista({ itens, agora }: { itens: Noticia[]; agora: Date }) {
  return (
    <ol className="noticias">
      {itens.map((n) => {
        const rel = tempoRelativo(n.publicadaEm, agora);
        return (
          <li key={n.link}>
            <a href={n.link} target="_blank" rel="noopener noreferrer">
              {n.titulo}
              <span className="sr"> (abre em nova aba)</span>
            </a>
            <span className="noticia-meta">
              {n.fonte && <b>{n.fonte}</b>}
              {rel && n.publicadaEm && (
                <time dateTime={n.publicadaEm.toISOString()} title={horario(n.publicadaEm)}>
                  {rel}
                </time>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export async function BlocoNoticias({ id, titulo, consulta, tom }: { id: string; titulo: string; consulta: string; tom: string }) {
  const itens = await noticias(consulta);
  return (
    <section className={`bloco ${tom}`} aria-labelledby={id}>
      <h2 id={id} className="bloco-titulo">
        <span className="dot" aria-hidden="true" />
        {titulo}
      </h2>
      {itens === null || itens.length === 0 ? (
        <p className="vazio">Notícias indisponíveis no momento.</p>
      ) : (
        <Lista itens={itens} agora={new Date()} />
      )}
    </section>
  );
}

export function BolsaSkeleton() {
  return (
    <section className="kpi kpi-bolsa t-azul" aria-labelledby="h-bolsa" aria-busy="true">
      <h2 id="h-bolsa" className="kpi-rot">Bolsa · Ibovespa</h2>
      <div className="sk" style={{ width: '70%', height: 44, marginTop: 8 }} />
      <div className="sk" style={{ width: 120, height: 22, marginTop: 12 }} />
      <div className="sk" style={{ width: '55%', height: 12, marginTop: 14 }} />
      <span className="sr" role="status">Carregando cotação</span>
    </section>
  );
}

export function IndicadoresSkeleton() {
  return (
    <section className="taxas" aria-labelledby="h-taxas" aria-busy="true">
      <h2 id="h-taxas" className="sec-titulo">Indicadores · Banco Central</h2>
      <div className="kpis">
        {['t-azul', 't-roxo', 't-laranja'].map((t) => (
          <div key={t} className={`kpi ${t}`}>
            <div className="sk" style={{ width: '45%', height: 11 }} />
            <div className="sk" style={{ width: '75%', height: 30, marginTop: 8 }} />
            <div className="sk" style={{ width: '50%', height: 11, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <span className="sr" role="status">Carregando indicadores</span>
    </section>
  );
}

export function NoticiasSkeleton({ id, titulo, tom }: { id: string; titulo: string; tom: string }) {
  return (
    <section className={`bloco ${tom}`} aria-labelledby={id} aria-busy="true">
      <h2 id={id} className="bloco-titulo">
        <span className="dot" aria-hidden="true" />
        {titulo}
      </h2>
      <ol className="noticias">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i}>
            <div className="sk" style={{ width: `${92 - i * 6}%`, height: 14 }} />
            <div className="sk" style={{ width: '38%', height: 10, marginTop: 8 }} />
          </li>
        ))}
      </ol>
      <span className="sr" role="status">Carregando notícias</span>
    </section>
  );
}

const dataCurta = (ymd: string) => ymd.split('-').reverse().join('/');

export async function DiarioHome() {
  const consolidado = await atosConsolidados('mes');
  const atos = consolidado.fontes.every((f) => f.situacao === 'indisponivel') ? null : consolidado.atos;
  const destaque = atos?.slice(0, 4) ?? [];
  return (
    <section className="bloco bloco-diario t-vermelho" aria-labelledby="h-diario">
      <div className="diario-cab">
        <h2 id="h-diario" className="bloco-titulo">
          <span className="dot" aria-hidden="true" />
          Diário Oficial · consignado
        </h2>
        <Link href="/diario-oficial" className="diario-todos">
          Ver todos <span aria-hidden="true">→</span>
        </Link>
      </div>
      {atos === null ? (
        <p className="vazio">Diário Oficial indisponível no momento.</p>
      ) : destaque.length === 0 ? (
        <p className="vazio">Nenhum ato relevante neste mês.</p>
      ) : (
        <ol className="atos-home">
          {destaque.map((a) => (
            <li key={a.id}>
              <a href={a.link} target="_blank" rel="noopener noreferrer">
                {a.titulo}
                <span className="sr"> (abre em nova aba)</span>
              </a>
              <span className="noticia-meta">
                <time dateTime={a.data}>{dataCurta(a.data)}</time>
                <b>{a.orgao}</b>
                {a.convenios.map((c) => (
                  <span key={c} className="chip-home">{c}</span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function DiarioHomeSkeleton() {
  return (
    <section className="bloco bloco-diario t-vermelho" aria-labelledby="h-diario" aria-busy="true">
      <div className="diario-cab">
        <h2 id="h-diario" className="bloco-titulo">
          <span className="dot" aria-hidden="true" />
          Diário Oficial · consignado
        </h2>
      </div>
      <ol className="atos-home">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <div className="sk" style={{ width: `${94 - i * 8}%`, height: 14 }} />
            <div className="sk" style={{ width: '40%', height: 10, marginTop: 8 }} />
          </li>
        ))}
      </ol>
      <span className="sr" role="status">Carregando atos do Diário Oficial</span>
    </section>
  );
}
