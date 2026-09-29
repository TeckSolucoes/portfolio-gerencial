import type { TipoGrafico } from '@/lib/relatorio/construtor/catalogo';
import type { PontoVisao } from '@/lib/relatorio/construtor/consulta';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function formatar(valor: number, formato: 'numero' | 'moeda' | 'percentual') {
  if (formato === 'moeda') return moeda.format(valor);
  if (formato === 'percentual') return `${numero.format(valor)}%`;
  return numero.format(valor);
}

function Linha({ pontos, formato }: { pontos: PontoVisao[]; formato: 'numero' | 'moeda' | 'percentual' }) {
  const largura = 900;
  const altura = 260;
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  const coordenadas = pontos.map((p, i) => ({
    ...p,
    x: pontos.length === 1 ? largura / 2 : 24 + (i * (largura - 48)) / (pontos.length - 1),
    y: altura - 28 - (p.valor / max) * (altura - 60),
  }));
  return (
    <div className="cv-line-wrap">
      <svg className="cv-line" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Gráfico de linha">
        <line x1="24" y1={altura - 28} x2={largura - 24} y2={altura - 28} className="cv-axis" />
        <polyline points={coordenadas.map((p) => `${p.x},${p.y}`).join(' ')} className="cv-polyline" />
        {coordenadas.map((p) => <circle key={`${p.rotulo}-${p.x}`} cx={p.x} cy={p.y} r="5" className="cv-dot"><title>{p.rotulo}: {formatar(p.valor, formato)}</title></circle>)}
      </svg>
      <div className="cv-line-labels"><span>{pontos[0]?.rotulo}</span><span>{pontos.at(-1)?.rotulo}</span></div>
    </div>
  );
}

function Barras({ pontos, formato }: { pontos: PontoVisao[]; formato: 'numero' | 'moeda' | 'percentual' }) {
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  return <div className="cv-bars">{pontos.map((p) => <div className="cv-bar-row" key={p.rotulo}><div className="cv-bar-label"><span>{p.rotulo}</span><strong>{formatar(p.valor, formato)}</strong></div><div className="cv-bar-track"><i style={{ width: `${Math.max(1, 100 * p.valor / max)}%` }} /></div></div>)}</div>;
}

function Rosca({ pontos, formato }: { pontos: PontoVisao[]; formato: 'numero' | 'moeda' | 'percentual' }) {
  const cores = ['#8b5cf6', '#38bdf8', '#22c55e', '#f59e0b', '#f43f5e', '#64748b'];
  const principais = pontos.slice(0, 6);
  const total = principais.reduce((s, p) => s + p.valor, 0) || 1;
  const limites = principais.map((_, i) => 100 * principais.slice(0, i + 1).reduce((s, p) => s + p.valor, 0) / total);
  const partes = principais.map((_, i) => `${cores[i]} ${i === 0 ? 0 : limites[i - 1]}% ${limites[i]}%`);
  return <div className="cv-donut-layout"><div className="cv-donut" style={{ background: `conic-gradient(${partes.join(',')})` }}><span>{formatar(total, formato)}</span></div><div className="cv-legend">{principais.map((p, i) => <div key={p.rotulo}><i style={{ background: cores[i] }} /><span>{p.rotulo}</span><strong>{formatar(p.valor, formato)}</strong></div>)}</div></div>;
}

export function Grafico({ tipo, pontos, formato }: { tipo: TipoGrafico; pontos: PontoVisao[]; formato: 'numero' | 'moeda' | 'percentual' }) {
  if (!pontos.length) return <div className="cv-empty">Nenhum dado real encontrado para este período e empresa.</div>;
  if (tipo === 'indicador') return <div className="cv-indicator"><strong>{formatar(pontos[0].valor, formato)}</strong><span>Fonte ao vivo</span></div>;
  if (tipo === 'linha') return <Linha pontos={pontos} formato={formato} />;
  if (tipo === 'rosca') return <Rosca pontos={pontos} formato={formato} />;
  if (tipo === 'tabela') return <div className="cv-table-wrap"><table><thead><tr><th>Dimensão</th><th>Valor</th></tr></thead><tbody>{pontos.map((p) => <tr key={p.rotulo}><td>{p.rotulo}</td><td>{formatar(p.valor, formato)}</td></tr>)}</tbody></table></div>;
  return <Barras pontos={pontos} formato={formato} />;
}
