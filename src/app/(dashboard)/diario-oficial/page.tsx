import { requireFuncionalidadeForPage } from '@/lib/authz';
import { Suspense } from 'react';
import Link from 'next/link';
import { atosDoCache } from '@/lib/workers/leitura';
import { Lista } from './lista';
import './diario-oficial.css';

export const dynamic = 'force-dynamic';

const PERIODOS = [
  { id: 'semana', nome: 'Semana' },
  { id: 'mes', nome: 'Mês' },
  { id: 'ano', nome: 'Ano' },
] as const;
type Periodo = (typeof PERIODOS)[number]['id'];

const periodoValido = (v: string | string[] | undefined): Periodo =>
  PERIODOS.find((p) => p.id === (Array.isArray(v) ? v[0] : v))?.id ?? 'mes';

const dataBr = (ymd: string) => ymd.split('-').reverse().join('/');

async function Conteudo({ periodo }: { periodo: Periodo }) {
  const { atos, fontes } = await atosDoCache(periodo);
  const fontesNoAr = fontes.filter((f) => f.situacao === 'ok').length;
  if (fontesNoAr === 0) {
    return (
      <div className="aviso-estado" role="status">
        <b>Diário Oficial indisponível no momento</b>
        <span>Nenhuma das fontes respondeu agora. Tente novamente em alguns minutos.</span>
      </div>
    );
  }
  if (atos.length === 0) {
    return (
      <div className="aviso-estado" role="status">
        <b>Nenhum ato relevante neste período</b>
        <span>As fontes responderam, mas não há ato sobre consignado no intervalo escolhido.</span>
      </div>
    );
  }
  const recente = atos.reduce((m, a) => (a.data > m ? a.data : m), '');
  return (
    <>
      <div className="kpis">
        <div className="kpi t-azul">
          <span className="kpi-rot">Atos no período</span>
          <span className="kpi-val">{atos.length.toLocaleString('pt-BR')}</span>
          <span className="kpi-meta">Federais e dos estados/prefeituras que operamos.</span>
        </div>
        <div className="kpi t-laranja">
          <span className="kpi-rot">De órgão regulador</span>
          <span className="kpi-val">{atos.filter((a) => a.prioritario).length.toLocaleString('pt-BR')}</span>
          <span className="kpi-meta">Diários oficiais dos entes dos convênios e órgãos federais.</span>
        </div>
        <div className="kpi t-verde">
          <span className="kpi-rot">Ato mais recente</span>
          <span className="kpi-val">{dataBr(recente)}</span>
          <span className="kpi-meta">Data de publicação.</span>
        </div>
      </div>
      <Lista atos={atos} />
      <section className="fontes" aria-label="Fontes consultadas">
        <h2>Fontes consultadas</h2>
        <ul>
          {fontes.map((f) => (
            <li key={f.id}>
              <b>{f.nome}</b> · {f.situacao === 'ok' ? `${f.qtd} ato(s)` : 'indisponível agora'}
              <span>{f.cobertura}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true">
      <div className="kpis">
        {['t-azul', 't-laranja', 't-verde'].map((t) => (
          <div key={t} className={`kpi ${t}`}>
            <div className="sk" style={{ width: '50%', height: 11 }} />
            <div className="sk" style={{ width: '40%', height: 30, marginTop: 8 }} />
            <div className="sk" style={{ width: '60%', height: 11, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <ul className="atos">
        {[0, 1, 2].map((i) => (
          <li key={i} className="ato t-azul">
            <div className="sk" style={{ width: 90, height: 12 }} />
            <div className="sk" style={{ width: '85%', height: 18, marginTop: 10 }} />
            <div className="sk" style={{ width: '100%', height: 12, marginTop: 10 }} />
            <div className="sk" style={{ width: '70%', height: 12, marginTop: 6 }} />
          </li>
        ))}
      </ul>
      <span className="sr" role="status">Carregando atos do Diário Oficial</span>
    </div>
  );
}

export default async function DiarioOficialPage({ searchParams }: { searchParams: Promise<{ periodo?: string | string[] }> }) {
  await requireFuncionalidadeForPage('diario_oficial');
  const periodo = periodoValido((await searchParams).periodo);
  return (
    <div className="diario">
      <header className="cab">
        <div>
          <div className="kicker">Diário Oficial</div>
          <h1>Diário Oficial · alterações que afetam o consignado</h1>
          <p className="sub">Atos publicados que mexem em margem, juros, prazo, habilitação e regras dos convênios que operamos.</p>
        </div>
        <nav className="periodos" aria-label="Período">
          {PERIODOS.map((p) => (
            <Link key={p.id} href={`/diario-oficial?periodo=${p.id}`} className="pill" aria-current={p.id === periodo ? 'page' : undefined} scroll={false}>
              {p.nome}
            </Link>
          ))}
        </nav>
      </header>

      <p className="fonte">
        Fonte: Imprensa Nacional (DOU). Cobre só o nível federal (INSS, SIAPE/Ministério da Gestão, CNPS, Banco Central). Diários estaduais e municipais
        entram em outra etapa. Este painel indica onde olhar: leia sempre o ato oficial.
      </p>

      <Suspense key={periodo} fallback={<Skeleton />}>
        <Conteudo periodo={periodo} />
      </Suspense>
    </div>
  );
}
