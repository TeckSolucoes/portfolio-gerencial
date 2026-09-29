'use client';

import { useState } from 'react';

interface Props {
  dias: { data: string; casos: number }[]; // YYYY-MM-DD, ordem crescente
  resumo: { inseriu: number; pagou: number; morreu: number; jornada: number } | null;
}

const OPCOES = [
  [15, '15 dias'],
  [30, '30 dias'],
  [60, '60 dias'],
  [0, 'Tudo'],
] as const;

const dm = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/');
const DIA = 864e5;

export function RelatorioLote({ dias, resumo }: Props) {
  const [periodo, setPeriodo] = useState(30);
  const fim = dias.length ? Date.parse(dias[dias.length - 1].data) : 0;
  const linhas = periodo ? dias.filter((d) => fim - Date.parse(d.data) <= (periodo - 1) * DIA) : dias;
  const casos = linhas.reduce((s, d) => s + d.casos, 0);
  const n = (v: number | undefined) => (v === undefined ? '—' : v.toLocaleString('pt-BR'));
  // O resumo do mês só vale quando o período cobre todos os dias exibidos.
  const completo = linhas.length === dias.length && resumo ? resumo : null;

  return (
    <section className="sec" id="sec-lote">
      <div className="sec-h">Lote por dia inserido</div>
      <div className="sec-s">Cada linha = turma que nasceu naquele dia · lote = data da 1ª proposta do caso · use o filtro de período</div>
      <div className="lote-filtros" role="group" aria-label="Período do lote">
        {OPCOES.map(([v, rot]) => (
          <button key={v} type="button" aria-pressed={periodo === v} className={`pill-f ${periodo === v ? 'active' : ''}`} onClick={() => setPeriodo(v)}>
            {rot}
          </button>
        ))}
        <span className="lote-count">
          {linhas.length} de {dias.length} dias
        </span>
      </div>
      <div className="strip">
        <span>
          <b>Casos</b> {n(casos)}
        </span>
        <span className="g">
          <b>Pagou</b> {n(completo?.pagou)}
        </span>
        <span className="r">
          <b>Morreu</b> {n(completo?.morreu)}
        </span>
        <span className="j">
          <b>Jornada</b> {n(completo?.jornada)}
        </span>
      </div>
      <div className="lote-wrap" tabIndex={0} role="region" aria-label="Lotes por dia inserido">
        {linhas.length === 0 ? (
          <div className="lote-empty">Nenhum lote neste período.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">LOTE</th>
                <th scope="col">CASOS</th>
                <th scope="col">NA JORNADA</th>
                <th scope="col">FECHOU</th>
                <th scope="col">PAGOU</th>
                <th scope="col">MORREU</th>
                <th scope="col">% PAGOU</th>
              </tr>
            </thead>
            <tbody>
              {[...linhas].reverse().map((d) => (
                <tr key={d.data}>
                  <td>
                    <b>{dm(d.data)}</b>
                  </td>
                  <td>{d.casos}</td>
                  <td className="c-j">—</td>
                  <td>—</td>
                  <td className="c-g">—</td>
                  <td className="c-r">—</td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
