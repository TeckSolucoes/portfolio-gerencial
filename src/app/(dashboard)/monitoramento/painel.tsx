'use client';

import { useMemo, useState } from 'react';
import { maisSuspeitos, porSemana } from '@/lib/monitoramento/detectar';
import type { Alerta, TipoAlerta } from '@/lib/monitoramento/detectar';
import { filtrarPorTipo, porUnidade } from '@/lib/monitoramento/resumo';
import { ORDEM, TIPOS } from './tipos';

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/');
const pct = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function Painel({ alertas, nomes }: { alertas: Alerta[]; nomes: Record<string, string> }) {
  const [filtro, setFiltro] = useState<TipoAlerta | null>(null);
  const visiveis = useMemo(() => filtrarPorTipo(alertas, filtro), [alertas, filtro]);
  const tiposVisiveis = filtro ? [filtro] : ORDEM;
  const semanas = useMemo(() => porSemana(visiveis), [visiveis]);
  const equipes = useMemo(() => porUnidade(visiveis, 8), [visiveis]);
  const casos = useMemo(() => maisSuspeitos(visiveis, 10), [visiveis]);

  const somaSemana = (s: (typeof semanas)[number]) => tiposVisiveis.reduce((t, k) => t + s[k], 0);
  const maxSemana = Math.max(1, ...semanas.map(somaSemana));
  const somaEquipe = (e: (typeof equipes)[number]) => tiposVisiveis.reduce((t, k) => t + e[k], 0);
  const maxEquipe = Math.max(1, ...equipes.map(somaEquipe));

  return (
    <>
      <div className="filtro" role="group" aria-label="Filtrar por tipo de alerta">
        <button type="button" className="pill" aria-pressed={filtro === null} onClick={() => setFiltro(null)}>
          Todos <b>{alertas.length}</b>
        </button>
        {ORDEM.map((t) => (
          <button
            key={t}
            type="button"
            className={`pill ${TIPOS[t].classe}`}
            aria-pressed={filtro === t}
            onClick={() => setFiltro(filtro === t ? null : t)}
          >
            <i className="dot" aria-hidden />
            {TIPOS[t].nome} <b>{filtrarPorTipo(alertas, t).length}</b>
          </button>
        ))}
      </div>

      <section className="card" aria-labelledby="h-semana">
        <h2 id="h-semana">Alertas por semana</h2>
        <p className="sec-s">Semana começando na segunda-feira. Um alerta com dois tipos conta uma vez em cada.</p>
        {semanas.length === 0 ? (
          <p className="vazio">Nenhum alerta neste filtro.</p>
        ) : (
          <>
            <div className="legenda" aria-hidden>
              {tiposVisiveis.map((t) => (
                <span key={t} className={TIPOS[t].classe}>
                  <i className="dot" />
                  {TIPOS[t].nome}
                </span>
              ))}
            </div>
            <ul className="colunas" aria-label="Gráfico de barras empilhadas: alertas por semana e tipo">
              {semanas.map((s) => (
                <li
                  key={s.semana}
                  className="coluna"
                  aria-label={`Semana de ${dataBr(s.semana)}: ${tiposVisiveis.map((t) => `${s[t]} ${TIPOS[t].curto}`).join(', ')}`}
                >
                  <span className="topo">{somaSemana(s)}</span>
                  <span className="area">
                    <span className="pilha" style={{ height: `${(somaSemana(s) / maxSemana) * 100}%` }}>
                      {[...tiposVisiveis].reverse().map((t) =>
                        s[t] > 0 ? (
                          <span
                            key={t}
                            className={`seg ${TIPOS[t].classe}`}
                            style={{ flexGrow: s[t] }}
                            title={`${TIPOS[t].nome}: ${s[t]}`}
                          >
                            {s[t]}
                          </span>
                        ) : null,
                      )}
                    </span>
                  </span>
                  <span className="rot">{dataBr(s.semana)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="h-equipes">
        <h2 id="h-equipes">Equipes com mais alertas</h2>
        <p className="sec-s">Top 8. O comprimento da barra soma os tipos exibidos.</p>
        {equipes.length === 0 ? (
          <p className="vazio">Nenhum alerta neste filtro.</p>
        ) : (
          <ol className="ranking" aria-label="Equipes com mais alertas">
            {equipes.map((e) => (
              <li key={e.unidade}>
                <span className="eq-nome">{nomes[e.unidade] ?? e.unidade}</span>
                <span className="eq-trilho">
                  <span className="eq-barra" style={{ width: `${(somaEquipe(e) / maxEquipe) * 100}%` }}>
                    {tiposVisiveis.map((t) =>
                      e[t] > 0 ? (
                        <span
                          key={t}
                          className={`seg ${TIPOS[t].classe}`}
                          style={{ flexGrow: e[t] }}
                          title={`${TIPOS[t].nome}: ${e[t]}`}
                        />
                      ) : null,
                    )}
                  </span>
                </span>
                <span className="eq-num">
                  <b>{e.alertas}</b>
                  <small>
                    {tiposVisiveis
                      .filter((t) => e[t] > 0)
                      .map((t) => `${e[t]} ${TIPOS[t].curto.toLowerCase()}`)
                      .join(' · ')}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="h-casos">
        <h2 id="h-casos" className="h-solto">
          Casos mais suspeitos
        </h2>
        <p className="sec-s">
          Ordenados por gravidade (convênio novo pesa mais) e, no empate, por valor. Quanto menor a barra do histórico,
          mais fora do padrão.
        </p>
        {casos.length === 0 ? (
          <p className="vazio">Nenhum alerta neste filtro.</p>
        ) : (
          <ol className="casos" aria-label="Casos mais suspeitos">
            {casos.map((a) => (
              <li key={`${a.unidade}|${a.convenio}|${a.dia}`} className={`caso ${TIPOS[a.tipos.includes('INÉDITO') ? 'INÉDITO' : a.tipos[0]].classe}`}>
                <div className="caso-topo">
                  <span className="badges">
                    {a.tipos.map((t) => (
                      <span key={t} className={`badge ${TIPOS[t].classe}`}>
                        {TIPOS[t].nome}
                      </span>
                    ))}
                  </span>
                  <span className="caso-dia">{dataBr(a.dia)}</span>
                </div>
                <div className="caso-meio">
                  <div className="caso-quem">
                    <span className="caso-conv">{a.convenio}</span>
                    <span className="caso-eq">{nomes[a.unidade] ?? a.unidade}</span>
                  </div>
                  <div className="caso-nums">
                    <span>
                      <b>{a.qtd}</b> {a.qtd === 1 ? 'proposta' : 'propostas'}
                    </span>
                    <b>{moeda(a.valor)}</b>
                  </div>
                </div>
                <div
                  className="hist"
                  role="img"
                  aria-label={`Histórico: a equipe já vendeu ${a.historicoConvenio} de ${a.historico} propostas neste convênio, ${pct(a.participacao)}%`}
                >
                  <span className="hist-trilho">
                    <span
                      className="hist-fill"
                      style={{ width: `${Math.max(a.participacao, a.historicoConvenio > 0 ? 1 : 0)}%` }}
                    />
                  </span>
                  <span className="hist-txt">
                    histórico: já vendeu <b>{a.historicoConvenio}</b> de <b>{a.historico}</b> ({pct(a.participacao)}%)
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
