'use client';

import { useEffect, useState } from 'react';

const SECOES = [
  ['cli', 'clientes', 'Clientes'],
  ['ven', 'vendas', 'Vendas'],
  ['mes', 'mes', 'Mês'],
  ['meta', 'meta', 'Meta'],
  ['rank', 'ranking', 'Ranking'],
  ['exc', 'excecao', 'Exceção'],
  ['canal', 'canal', 'Canal'],
  ['churn', 'churn', 'Churn'],
  ['lote', 'lote', 'Lote'],
  ['lista', 'lista', 'Lista'],
] as const;

export function RelatorioNav() {
  const [ativa, setAtiva] = useState<string | null>(null);

  useEffect(() => {
    const els = SECOES.map(([, id]) => document.getElementById(`sec-${id}`)).filter((el): el is HTMLElement => !!el);
    const obs = new IntersectionObserver(
      (entradas) => {
        const vis = entradas.filter((en) => en.isIntersecting).sort((x, y) => y.intersectionRatio - x.intersectionRatio)[0];
        if (vis) setAtiva(vis.target.id);
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0.08, 0.3, 0.55] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="sec-jump no-print" aria-label="Seções do relatório">
      {SECOES.map(([cls, id, rotulo]) => (
        <a
          key={id}
          href={`#sec-${id}`}
          className={`j-${cls} ${ativa === `sec-${id}` ? 'active' : ''}`}
          aria-current={ativa === `sec-${id}` ? 'true' : undefined}
          onClick={(ev) => {
            const el = document.getElementById(`sec-${id}`);
            if (!el) return;
            ev.preventDefault();
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setAtiva(`sec-${id}`);
          }}
        >
          {rotulo}
        </a>
      ))}
    </nav>
  );
}
