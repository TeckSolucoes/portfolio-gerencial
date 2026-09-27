import '../institucional.css';

const custos = [
  { nome: 'Claude', valor: 130, descricao: 'Assistente de IA usado no apoio ao desenvolvimento.' },
  { nome: 'Codex', valor: 130, descricao: 'Assistente de IA usado no desenvolvimento e na manutenção.' },
  { nome: 'W-API', valor: 60, descricao: 'Serviço usado na operação de comunicação por WhatsApp.' },
];

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CustosPage() {
  const total = custos.reduce((soma, item) => soma + item.valor, 0);
  return <div className="institucional">
    <section className="intro">
      <div className="kicker">Portal Teck · Custos</div>
      <h1>Custos iniciais das ferramentas</h1>
      <p className="lede">Valores de referência informados para as ferramentas de inteligência artificial e comunicação usadas no projeto.</p>
    </section>
    <section className="custos-grade" aria-label="Custos informados">
      {custos.map((custo, indice) => <article className={`custo ${indice === 1 ? 'roxo' : indice === 2 ? 'laranja' : ''}`} key={custo.nome}>
        <span className="custo-nome">{custo.nome}</span>
        <strong className="custo-valor">{moeda(custo.valor)}</strong>
        <p>{custo.descricao}</p>
      </article>)}
    </section>
    <section className="total" aria-label="Total dos custos iniciais">
      <div><h2>Total inicial</h2><span>Soma dos três valores informados.</span></div>
      <strong>{moeda(total)}</strong>
    </section>
    <p className="nota" role="note">A periodicidade não foi definida. Por isso, estes números aparecem como custos iniciais, sem indicação de valor mensal ou anual. Os workers do portal são rotinas determinísticas e não geram cobrança de IA por execução.</p>
  </div>;
}
