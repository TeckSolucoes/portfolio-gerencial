'use client';

import { useMemo, useState } from 'react';
import type { Fim, LinhaLista } from '@/lib/relatorio/types';

type Campo = 'lote' | 'equipe' | 'tipo' | 'produto' | 'motivo';
type Estado = { fim: 'Todos' | Fim } & Record<Campo, string> & { busca: string };

const FINS: Fim[] = ['Reprovado Front', 'Reprovado CCNET', 'Cancelado'];
const INICIAL: Estado = { fim: 'Todos', lote: 'Todos', equipe: 'Todos', tipo: 'Todos', produto: 'Todos', motivo: 'Todos', busca: '' };
const ROTULOS: Record<Campo, string> = { lote: 'Safra', equipe: 'Equipe', tipo: 'Tipo', produto: 'Produto', motivo: 'Motivo' };

const classeFim = (fim: Fim) => (fim === 'Cancelado' ? 'fim-canc' : fim === 'Reprovado Front' ? 'fim-front' : 'fim-ccnet');

function casa(l: LinhaLista, e: Estado, ignora?: Campo | 'fim') {
  if (ignora !== 'fim' && e.fim !== 'Todos' && l.fim !== e.fim) return false;
  for (const c of Object.keys(ROTULOS) as Campo[]) {
    if (ignora !== c && e[c] !== 'Todos' && l[c] !== e[c]) return false;
  }
  const t = e.busca.trim().toLowerCase();
  if (!t) return true;
  return `${l.nome ?? ''} ${l.cpf ?? ''} ${l.numero} ${l.equipe} ${l.operador}`.toLowerCase().includes(t);
}

function exportar(linhas: LinhaLista[]) {
  const cab = ['Cliente', 'CPF', 'Proposta', 'Safra', 'Tipo', 'Produto', 'Fim', 'Motivo', 'Equipe', 'Operador'];
  const cel = (v: string | undefined) => `"${(v ?? '').replaceAll('"', '""')}"`;
  const csv = [cab, ...linhas.map((l) => [l.nome, l.cpf, l.numero, l.lote, l.tipo, l.produto, l.fim, l.motivo, l.equipe, l.operador])]
    .map((linha) => linha.map(cel).join(';'))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'nao-reinseriu.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function RelatorioLista({ linhas }: { linhas: LinhaLista[] }) {
  const [e, setE] = useState<Estado>(INICIAL);
  const visiveis = useMemo(() => linhas.filter((l) => casa(l, e)), [linhas, e]);
  const limpavel = JSON.stringify(e) !== JSON.stringify(INICIAL);

  // Cada seletor conta com todos os outros filtros aplicados, menos o dele.
  const opcoes = (c: Campo) => {
    const mapa = new Map<string, number>();
    for (const l of linhas) if (casa(l, e, c)) mapa.set(l[c], (mapa.get(l[c]) ?? 0) + 1);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  };

  return (
    <section className="sec" id="sec-lista">
      <div className="lista-head">
        <h3>Cancelou ou reprovou e não reinseriu</h3>
        <button type="button" className="btn-export no-print" disabled={!visiveis.length} onClick={() => exportar(visiveis)}>
          Exportar {visiveis.length}
        </button>
      </div>
      <p className="lista-sub" aria-live="polite">
        {visiveis.length} de {linhas.length} casos. Os filtros se cruzam: cada lista só mostra o que ainda existe nesse recorte.
      </p>
      {linhas.length === 0 ? (
        <p className="rel-aviso">Lista indisponível neste export: os casos que morreram sem reinserir ainda não foram gerados.</p>
      ) : (
        <>
          <div className="pills no-print" role="group" aria-label="Filtrar por fim">
            <button type="button" aria-pressed={e.fim === 'Todos'} className={`pill-f ${e.fim === 'Todos' ? 'active' : ''}`} onClick={() => setE({ ...e, fim: 'Todos' })}>
              Todos · {linhas.length}
            </button>
            {FINS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={e.fim === f}
                className={`pill-f ${e.fim === f ? 'active' : ''}`}
                onClick={() => setE({ ...e, fim: e.fim === f ? 'Todos' : f })}
              >
                {f} · {linhas.filter((l) => l.fim === f).length}
              </button>
            ))}
            {limpavel && (
              <button type="button" className="pill-clear" onClick={() => setE(INICIAL)}>
                Limpar
              </button>
            )}
          </div>
          <div className="filtros no-print">
            {(Object.keys(ROTULOS) as Campo[]).map((c) => (
              <select key={c} aria-label={ROTULOS[c]} value={e[c]} onChange={(ev) => setE({ ...e, [c]: ev.target.value })}>
                <option value="Todos">{ROTULOS[c]}</option>
                {opcoes(c).map(([nome, q]) => (
                  <option key={nome} value={nome}>
                    {nome} · {q}
                  </option>
                ))}
              </select>
            ))}
            <input type="search" aria-label="Buscar por nome, CPF ou proposta" placeholder="Nome, CPF ou proposta" value={e.busca} onChange={(ev) => setE({ ...e, busca: ev.target.value })} />
          </div>
          <div className="lista-wrap" tabIndex={0} role="region" aria-label="Casos que cancelaram ou reprovaram e não reinseriram">
            <table>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Safra</th>
                  <th scope="col">Caso</th>
                  <th scope="col">Fim</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Equipe · operador</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr key={l.numero}>
                    <td>
                      {l.nome ? (
                        <>
                          <span className="cli-nome">{l.nome}</span>
                          <span className="cli-sub">
                            {l.cpf ? `${l.cpf} · ` : ''}proposta {l.numero}
                          </span>
                        </>
                      ) : (
                        <span className="cli-nome">Proposta {l.numero}</span>
                      )}
                    </td>
                    <td className="lote-o">{l.lote}</td>
                    <td>
                      {l.tipo} · {l.produto}
                    </td>
                    <td className={`fim-o ${classeFim(l.fim)}`}>{l.fim}</td>
                    <td>
                      <button type="button" className="linkish" title="Filtrar por este motivo" onClick={() => setE({ ...e, motivo: l.motivo })}>
                        {l.motivo}
                      </button>
                    </td>
                    <td className="eq-op">
                      <button type="button" className="linkish" title="Filtrar por esta equipe" onClick={() => setE({ ...e, equipe: l.equipe })}>
                        {l.equipe}
                      </button>{' '}
                      · {l.operador}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visiveis.length && <div className="lista-empty">Nenhum caso nesse recorte</div>}
          </div>
        </>
      )}
    </section>
  );
}
