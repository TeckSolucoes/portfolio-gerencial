import type { Contagem } from '@/lib/transparencia/federal-agregar';

const n = (v: number) => v.toLocaleString('pt-BR');
const pct = (v: number, total: number) => (total > 0 ? ((100 * v) / total).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0');

// Tabela com barra horizontal: uma série só (pessoas), então uma cor e nenhuma legenda.
// A barra é proporcional ao maior item da lista, e o número vem escrito ao lado.
export function Barras({ itens, total, rotuloItem, limite }: { itens: Contagem[]; total: number; rotuloItem: string; limite?: number }) {
  const lista = limite ? itens.slice(0, limite) : itens;
  const maior = Math.max(1, ...lista.map((i) => i.pessoas));
  return (
    <table className="barras">
      <thead>
        <tr>
          <th scope="col">{rotuloItem}</th>
          <th scope="col" className="num">
            Pessoas
          </th>
          <th scope="col" className="num col-pct">
            % do total
          </th>
        </tr>
      </thead>
      <tbody>
        {lista.map((i) => (
          <tr key={i.chave} title={`${i.chave}: ${n(i.pessoas)} pessoas (${pct(i.pessoas, total)}%), ${n(i.vinculos)} vínculos`}>
            <th scope="row">
              <span className="barra-nome">{i.chave}</span>
              <span className="barra-trilho" aria-hidden="true">
                <span className="barra" style={{ width: `${Math.max(0.5, (100 * i.pessoas) / maior)}%` }} />
              </span>
            </th>
            <td className="num">{n(i.pessoas)}</td>
            <td className="num col-pct">{pct(i.pessoas, total)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
