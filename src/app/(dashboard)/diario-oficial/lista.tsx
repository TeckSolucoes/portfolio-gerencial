'use client';

import { useMemo, useState } from 'react';
import type { AtoOficial, Assunto } from '@/lib/diarioOficial';

const dataBr = (ymd: string) => ymd.split('-').reverse().join('/');

function resumir(texto: string, max = 220) {
  if (texto.length <= max) return texto;
  const corte = texto.slice(0, max);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), max - 30)).trimEnd()}…`;
}

export function Lista({ atos }: { atos: AtoOficial[] }) {
  const [convenio, setConvenio] = useState<string | null>(null);
  const [assunto, setAssunto] = useState<Assunto | null>(null);
  const [soReguladores, setSoReguladores] = useState(false);

  const convenios = useMemo(() => [...new Set(atos.flatMap((a) => a.convenios))].sort(), [atos]);
  const assuntos = useMemo(() => [...new Set(atos.flatMap((a) => a.assuntos))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [atos]);
  const visiveis = atos.filter(
    (a) => (!convenio || a.convenios.includes(convenio)) && (!assunto || a.assuntos.includes(assunto)) && (!soReguladores || a.prioritario),
  );
  const filtrando = convenio !== null || assunto !== null || soReguladores;

  return (
    <>
      <div className="filtros">
        <div className="filtro" role="group" aria-label="Filtrar por convênio">
          <span className="filtro-rot">Convênio</span>
          <button type="button" className="pill" aria-pressed={convenio === null} onClick={() => setConvenio(null)}>
            Todos <b>{atos.length}</b>
          </button>
          {convenios.map((c) => (
            <button key={c} type="button" className="pill" aria-pressed={convenio === c} onClick={() => setConvenio(convenio === c ? null : c)}>
              {c} <b>{atos.filter((a) => a.convenios.includes(c)).length}</b>
            </button>
          ))}
        </div>
        <div className="filtro" role="group" aria-label="Filtrar por assunto">
          <span className="filtro-rot">Assunto</span>
          <button type="button" className="pill" aria-pressed={assunto === null} onClick={() => setAssunto(null)}>
            Todos
          </button>
          {assuntos.map((s) => (
            <button key={s} type="button" className="pill" aria-pressed={assunto === s} onClick={() => setAssunto(assunto === s ? null : s)}>
              {s} <b>{atos.filter((a) => a.assuntos.includes(s)).length}</b>
            </button>
          ))}
        </div>
        <div className="filtro" role="group" aria-label="Órgãos">
          <button type="button" className="pill pill-reg" aria-pressed={soReguladores} onClick={() => setSoReguladores(!soReguladores)}>
            Só órgãos reguladores
          </button>
          {filtrando && (
            <button
              type="button"
              className="limpar"
              onClick={() => {
                setConvenio(null);
                setAssunto(null);
                setSoReguladores(false);
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <p className="contagem" role="status">
        {visiveis.length} {visiveis.length === 1 ? 'ato' : 'atos'}
        {filtrando && ` de ${atos.length}`}
      </p>

      {visiveis.length === 0 ? (
        <p className="vazio-caixa">Nenhum ato com esses filtros.</p>
      ) : (
        <ul className="atos">
          {visiveis.map((a) => (
            <li key={a.id} className={`ato ${a.prioritario ? 't-laranja' : 't-azul'}`}>
              <div className="ato-topo">
                {a.prioritario && <span className="badge">Órgão regulador</span>}
                <time className="ato-data" dateTime={a.data}>
                  {dataBr(a.data)}
                </time>
              </div>
              <div className="ato-orgao">{a.orgao}</div>
              <h3 className="ato-titulo">{a.titulo}</h3>
              {a.trecho && <p className="ato-trecho">{resumir(a.trecho)}</p>}
              {(a.assuntos.length > 0 || a.convenios.length > 0) && (
                <ul className="chips" aria-label="Assuntos e convênios">
                  {a.convenios.map((c) => (
                    <li key={c} className="chip chip-conv">
                      {c}
                    </li>
                  ))}
                  {a.assuntos.map((s) => (
                    <li key={s} className="chip">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              <a className="ato-link" href={a.link} target="_blank" rel="noopener noreferrer">
                Abrir no Diário Oficial <span aria-hidden="true">↗</span>
                <span className="sr"> (abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
