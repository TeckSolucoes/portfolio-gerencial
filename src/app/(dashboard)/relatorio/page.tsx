import Link from 'next/link';
import { redirect } from 'next/navigation';
import { carregarAcesso } from '@/lib/acesso';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { variaveisAusentes } from '@/lib/bases/politica';
import { ROTULO_EMPRESA, type Empresa } from '@/lib/empresas';
import { escolherEmpresa } from '@/lib/permissoes';
import { executarPainelFixo, type PainelFixo } from '@/lib/relatorio/construtor/consulta';
import { Grafico } from './construtor/Grafico';
import './construtor/construtor.css';

const hojeSp = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const horarioSp = () => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const percentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export default async function RelatorioPage({ searchParams }: { searchParams: Promise<{ empresa?: string; data?: string }> }) {
  await requireFuncionalidadeForPage('relatorio');
  const acesso = await carregarAcesso();
  if (!acesso) redirect('/login');
  if (!acesso.empresas.length) return <main className="construtor"><div className="cv-alert">Nenhuma empresa está liberada para este usuário.</div></main>;

  const p = await searchParams;
  const empresa = escolherEmpresa(acesso, p.empresa) as Empresa;
  const data = p.data ?? hojeSp();
  const basesIncompletas = [
    variaveisAusentes('front-v2').length ? 'Front V2' : '',
    variaveisAusentes('funcao').length ? 'Função' : '',
  ].filter(Boolean);
  let painel: PainelFixo | null = null;
  let erro = basesIncompletas.length ? `A conexão de ${basesIncompletas.join(' e ')} ainda não está completa neste ambiente.` : '';
  if (!erro) {
    try {
      painel = await executarPainelFixo({ empresa, inicio: data, fim: data });
    } catch (e) {
      erro = e instanceof Error && /Período|data final|92 dias|100 mil/.test(e.message)
        ? e.message
        : 'As fontes ao vivo não responderam. Nenhum dado antigo foi exibido.';
    }
  }

  return <main className="construtor relatorio-fixo">
    <nav className="cv-mode" aria-label="Tipo de relatório">
      <Link href={`/relatorio?empresa=${empresa}&data=${data}`} className="active">Relatório diário</Link>
      <Link href={`/relatorio/construtor?empresa=${empresa}&inicio=${data}&fim=${data}`}>Montar relatório</Link>
    </nav>
    <header className="cv-head">
      <div><p className="cv-kicker">Relatório Gerencial · visão fixa</p><h1>Relatório diário — {ROTULO_EMPRESA[empresa]} · Geral</h1><p>Resumo executivo diário com dados conciliados entre Front V2 e Função.</p></div>
      <div className="cv-live"><i />Atualizado às {horarioSp()}</div>
    </header>

    <div className="cv-fixed-filters">
      {acesso.empresas.length > 1 && <nav className="cv-company" aria-label="Empresa">{acesso.empresas.map((e) => <Link key={e} href={`/relatorio?empresa=${e}&data=${data}`} className={e === empresa ? 'active' : ''}>{ROTULO_EMPRESA[e]}</Link>)}</nav>}
      <form method="get"><input type="hidden" name="empresa" value={empresa} /><label><span>Data do relatório</span><input type="date" name="data" defaultValue={data} required /></label><button type="submit">Atualizar</button></form>
    </div>

    {painel && <aside className={`cv-reconcile ${painel.conciliacao.ausentesFuncao || painel.conciliacao.divergenciasStatus ? 'warning' : ''}`} aria-label="Conciliação das bases">
      <strong>Front V2 × Função</strong><span>{painel.conciliacao.encontradasFuncao.toLocaleString('pt-BR')} de {painel.conciliacao.enviadasFuncao.toLocaleString('pt-BR')} propostas localizadas</span><span>{painel.conciliacao.ausentesFuncao.toLocaleString('pt-BR')} ausentes</span><span>{painel.conciliacao.divergenciasStatus.toLocaleString('pt-BR')} divergências</span>
    </aside>}
    {erro && <div className="cv-alert" role="status">{erro}</div>}
    {painel && <>
      <section className="cv-kpis" aria-label="Indicadores do dia">
        <article><span>Propostas</span><strong>{numero.format(painel.propostas)}</strong><small>Front V2</small></article>
        <article><span>Valor contratado</span><strong>{moeda.format(painel.valorContratado)}</strong><small>Front V2</small></article>
        <article><span>Valor liberado</span><strong>{moeda.format(painel.valorLiberado)}</strong><small>Função</small></article>
        <article><span>Taxa de integração</span><strong>{percentual.format(painel.taxaIntegracao)}%</strong><small>Função</small></article>
      </section>
      <section className="cv-fixed-grid">
        <article className="cv-result"><div className="cv-result-head"><div><span>Ritmo do dia</span><h2>Propostas por hora</h2></div></div><Grafico tipo="linha" pontos={painel.propostasPorHora} formato="numero" /></article>
        <article className="cv-result"><div className="cv-result-head"><div><span>Situação atual</span><h2>Funil da Função</h2></div></div><Grafico tipo="barras" pontos={painel.funilFuncao} formato="numero" /></article>
        <article className="cv-result cv-wide"><div className="cv-result-head"><div><span>Produção</span><h2>Ranking de equipes por valor contratado</h2></div></div><Grafico tipo="barras" pontos={painel.rankingEquipes} formato="moeda" /></article>
      </section>
    </>}
    <p className="cv-source">O Front V2 define o recorte comercial; a Função confirma status, esteira e valor liberado somente para as propostas desse dia.</p>
  </main>;
}
