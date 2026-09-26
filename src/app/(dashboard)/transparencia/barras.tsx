const n = (v: number) => v.toLocaleString('pt-BR');
const pct = (v: number, total: number) => (total > 0 ? ((100 * v) / total).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0');

// Tabela com barra horizontal: uma série só, então uma cor e nenhuma legenda. A barra é proporcional
// ao maior item e o número vem escrito ao lado (a tabela é a própria versão acessível do gráfico).
export function Barras({ itens, total, rotuloItem, rotuloValor }: { itens: { chave: string; qtd: number }[]; total: number; rotuloItem: string; rotuloValor: string }) {
  const maior = Math.max(1, ...itens.map((i) => i.qtd));
  return (
    <table className="barras">
      <thead>
        <tr>
          <th scope="col">{rotuloItem}</th>
          <th scope="col" className="num">
            {rotuloValor}
          </th>
          <th scope="col" className="num col-pct">
            % do total
          </th>
        </tr>
      </thead>
      <tbody>
        {itens.map((i) => (
          <tr key={i.chave} title={`${i.chave}: ${n(i.qtd)} (${pct(i.qtd, total)}%)`}>
            <th scope="row">
              <span className="barra-nome">{i.chave}</span>
              <span className="barra-trilho" aria-hidden="true">
                <span className="barra" style={{ width: `${Math.max(0.5, (100 * i.qtd) / maior)}%` }} />
              </span>
            </th>
            <td className="num">{n(i.qtd)}</td>
            <td className="num col-pct">{pct(i.qtd, total)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
