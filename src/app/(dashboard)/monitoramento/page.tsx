import evidencia from '@/lib/monitoramento/evidencia.json';
import type { Alerta } from '@/lib/monitoramento/detectar';
import { nomeEquipe } from '@/lib/relatorio/relatorio';
import { Painel } from './painel';
import { ORDEM, TIPOS } from './tipos';
import './monitoramento.css';

export default function MonitoramentoPage() {
  const alertas = evidencia.alertas as Alerta[];
  const nomes = Object.fromEntries([...new Set(alertas.map((a) => a.unidade))].map((u) => [u, nomeEquipe(u)]));
  const total = (t: (typeof ORDEM)[number]) => alertas.filter((a) => a.tipos.includes(t)).length;

  return (
    <div className="monit">
      <header className="cab">
        <div>
          <div className="kicker">Monitoramento</div>
          <h1>Convênio fora do padrão</h1>
          <p className="sub">Avisa quando uma equipe insere proposta num convênio que ela não costuma vender.</p>
        </div>
        <div className="fonte">
          <b>Dados reais do export do Front</b>
          <span>
            {evidencia.fonte.replace(/^Export do Front, /, '')} · {evidencia.propostas.toLocaleString('pt-BR')} propostas ·{' '}
            {evidencia.unidades} equipes
          </span>
          <small>Unidade = equipe. No Função será a promotora.</small>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi t-total">
          <span className="kpi-rot">Total de alertas</span>
          <span className="kpi-val">{alertas.length.toLocaleString('pt-BR')}</span>
          <span className="kpi-meta">Um por equipe, convênio e dia.</span>
        </div>
        {ORDEM.map((t) => (
          <div key={t} className={`kpi ${TIPOS[t].classe}`}>
            <span className="kpi-rot">{TIPOS[t].nome}</span>
            <span className="kpi-val">{total(t).toLocaleString('pt-BR')}</span>
            <span className="kpi-meta">{TIPOS[t].explica}</span>
          </div>
        ))}
      </div>

      <Painel alertas={alertas} nomes={nomes} />

      <section className="regras" aria-labelledby="h-regras">
        <h2 id="h-regras">Como ler</h2>
        <ul>
          <li>Comparação com os 90 dias anteriores a cada proposta.</li>
          <li>Equipe com menos de 30 propostas de histórico não gera alerta.</li>
          <li>Um alerta por equipe, convênio e dia. Sem CPF nem nome de cliente.</li>
          <li>O caso Quero Mais / Gov. PI não existe nesta base: essa promotora só existe no Função.</li>
        </ul>
      </section>
    </div>
  );
}
