import './monitoramento.css';

// Mesmo desenho da tela (cabeçalho, KPIs, gerentes, fila) enquanto o Front V2 responde.
export default function MonitoramentoCarregando() {
  return (
    <div className="monit" aria-busy="true">
      <header className="cab">
        <div><div className="kicker">Monitoramento operacional</div><h1>Quem precisa de atenção</h1><p className="sub" role="status">Consultando o Front V2…</p></div>
      </header>
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => <div key={i} className="kpi"><span className="sk" style={{ width: '60%', height: 10 }} /><span className="sk" style={{ width: '40%', height: 26 }} /></div>)}
      </div>
      <section className="gerentes"><span className="sk" style={{ width: 170, height: 15 }} />
        <div className="ger-lista">{[0, 1, 2, 3].map((i) => <span key={i} className="sk" style={{ height: 40 }} />)}</div>
      </section>
      <section className="fila"><span className="sk" style={{ width: 190, height: 15 }} />
        <div className="ger-lista">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="sk" style={{ height: 58 }} />)}</div>
      </section>
    </div>
  );
}
