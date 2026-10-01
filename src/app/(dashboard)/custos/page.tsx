import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { arquivarCusto, alternarPagamento, gerarCompetencia } from './actions';
import { CadastroCustoModal } from './CadastroCustoModal';
import '../institucional.css';

const moeda = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const competenciaAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
const rotuloPeriodicidade = { unico: 'Único', mensal: 'Mensal', anual: 'Anual' } as const;

export default async function CustosPage() {
  await requireFuncionalidadeForPage('custos');
  const session = await auth();
  const podeGerenciar = session?.user.role === 'superadmin';
  const custos = await prisma.custo.findMany({ include: { lancamentos: { orderBy: { competencia: 'desc' } } }, orderBy: [{ ativo: 'desc' }, { nome: 'asc' }] });
  const lancamentos = custos.flatMap((c) => c.lancamentos);
  const total = lancamentos.reduce((s, l) => s + l.valorCentavos, 0);
  const pago = lancamentos.filter((l) => l.status === 'pago').reduce((s, l) => s + l.valorCentavos, 0);
  const pendente = total - pago;
  const competencia = competenciaAtual();
  return <div className="institucional custos-page">
    <section className="intro">
      <div className="kicker">Portal Teck · Custos</div>
      <h1>Custos das ferramentas</h1>
      <p className="lede">Cadastro de custos únicos, mensais e anuais, com lançamentos por competência e controle de pagamento.</p>
    </section>

    <section className="custos-resumo" aria-label="Resumo de custos">
      <div><span>Total lançado</span><strong>{moeda(total)}</strong></div>
      <div><span>Já pago</span><strong>{moeda(pago)}</strong></div>
      <div><span>Pendente</span><strong>{moeda(pendente)}</strong></div>
    </section>
    {podeGerenciar && <CadastroCustoModal competencia={competencia} />}

    <section className="custos-cadastros" aria-label="Custos cadastrados">
      {custos.map((custo) => <article className={`custo-registro${custo.ativo ? '' : ' is-arquivado'}`} key={custo.id}>
        <div className="custo-registro-head"><div><span>{rotuloPeriodicidade[custo.periodicidade]}</span><h2>{custo.nome}</h2><p>{custo.descricao}</p></div><strong>{moeda(custo.valorPadraoCentavos)}</strong></div>
        {podeGerenciar && custo.ativo && <div className="custo-acoes">
          {custo.periodicidade !== 'unico' && <form action={gerarCompetencia.bind(null, custo.id)}><input name="competencia" type="month" defaultValue={competencia} aria-label={`Competência de ${custo.nome}`} /><button className="btn btn-secondary">Gerar competência</button></form>}
          <form action={arquivarCusto.bind(null, custo.id)}><button className="btn btn-ghost">Arquivar</button></form>
        </div>}
        <div className="custo-historico">
          {custo.lancamentos.map((l) => <div className="custo-lancamento" key={l.id}><span>{l.competencia}</span><strong>{moeda(l.valorCentavos)}</strong><em className={`custo-status ${l.status}`}>{l.status === 'pago' ? 'Pago' : 'Pendente'}</em>{podeGerenciar && <form action={alternarPagamento.bind(null, l.id, l.status === 'pago' ? 'pendente' : 'pago')}><button className="custo-link">Marcar {l.status === 'pago' ? 'pendente' : 'pago'}</button></form>}</div>)}
        </div>
      </article>)}
    </section>
  </div>;
}
