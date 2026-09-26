'use client';

import { useMemo, useState } from 'react';
import type { AgregadoFederal } from '@/lib/transparencia/federal-agregar';
import { Barras } from './barras';

const PAGINA = 30;
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Orgaos({ orgaos, superiores }: { orgaos: AgregadoFederal['porOrgao']; superiores: string[] }) {
  const [busca, setBusca] = useState('');
  const [superior, setSuperior] = useState('');
  const [mostrar, setMostrar] = useState(PAGINA);

  const filtrados = useMemo(() => {
    const q = semAcento(busca.trim());
    return orgaos.filter((o) => (!superior || o.superior === superior) && (!q || semAcento(`${o.chave} ${o.cod}`).includes(q)));
  }, [orgaos, busca, superior]);
  const total = filtrados.reduce((t, o) => t + o.pessoas, 0);

  return (
    <section className="quadro" aria-labelledby="h-orgaos">
      <h2 id="h-orgaos">Órgãos</h2>
      <div className="filtros">
        <label>
          <span>Buscar órgão</span>
          <input
            type="search"
            value={busca}
            placeholder="Nome ou código SIAPE"
            onChange={(e) => {
              setBusca(e.target.value);
              setMostrar(PAGINA);
            }}
          />
        </label>
        <label>
          <span>Órgão superior</span>
          <select
            value={superior}
            onChange={(e) => {
              setSuperior(e.target.value);
              setMostrar(PAGINA);
            }}
          >
            <option value="">Todos</option>
            {superiores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="contagem" role="status">
        {filtrados.length.toLocaleString('pt-BR')} {filtrados.length === 1 ? 'órgão' : 'órgãos'} · {total.toLocaleString('pt-BR')} pessoas
      </p>
      {filtrados.length === 0 ? (
        <p className="vazio">Nenhum órgão encontrado com esses filtros.</p>
      ) : (
        <Barras itens={filtrados} total={total} rotuloItem="Órgão" limite={mostrar} />
      )}
      {filtrados.length > mostrar && (
        <button type="button" className="mais" onClick={() => setMostrar(mostrar + PAGINA)}>
          Mostrar mais {Math.min(PAGINA, filtrados.length - mostrar)} de {(filtrados.length - mostrar).toLocaleString('pt-BR')} restantes
        </button>
      )}
    </section>
  );
}
