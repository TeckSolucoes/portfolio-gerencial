import Link from 'next/link';
import { redirect } from 'next/navigation';
import { carregarAcesso } from '@/lib/acesso';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { variaveisAusentes } from '@/lib/bases/politica';
import { ROTULO_EMPRESA, type Empresa } from '@/lib/empresas';
import { escolherEmpresa } from '@/lib/permissoes';
import { CAMPOS_RELATORIO, campoRelatorio, type IdCampoRelatorio, type TipoGrafico, VISOES_PADRAO } from '@/lib/relatorio/construtor/catalogo';
import { executarVisao, formatoMetrica, type PontoVisao, type ResultadoVisao } from '@/lib/relatorio/construtor/consulta';
import { Grafico } from './Grafico';
import './construtor.css';

const GRAFICOS: { id: TipoGrafico; nome: string }[] = [
  { id: 'indicador', nome: 'Indicador' }, { id: 'linha', nome: 'Linha' }, { id: 'barras', nome: 'Barras' }, { id: 'rosca', nome: 'Rosca' }, { id: 'tabela', nome: 'Tabela' },
];

const hojeSp = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const horarioSp = () => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
type Parametros = { empresa?: string; inicio?: string; fim?: string; dimensao?: string; metrica?: string; grafico?: string; modelo?: string };

export default async function ConstrutorRelatorioPage({ searchParams }: { searchParams: Promise<Parametros> }) {
  await requireFuncionalidadeForPage('relatorio');
  const acesso = await carregarAcesso();
  if (!acesso) redirect('/login');
  if (!acesso.empresas.length) return <div className="construtor"><div className="cv-alert">Nenhuma empresa está liberada para este usuário.</div></div>;

  const p = await searchParams;
  const empresa = escolherEmpresa(acesso, p.empresa) as Empresa;
  const modelo = VISOES_PADRAO.find((v) => v.id === p.modelo);
  const dimensao = (modelo?.dimensao ?? p.dimensao ?? 'hora_cadastro') as IdCampoRelatorio;
  const metrica = (modelo?.metrica ?? p.metrica ?? 'qtd_propostas') as IdCampoRelatorio;
  const grafico = (modelo?.grafico ?? p.grafico ?? 'linha') as TipoGrafico;
  const hoje = hojeSp();
  const inicio = p.inicio ?? hoje;
  const fim = p.fim ?? hoje;
  const camposDimensao = CAMPOS_RELATORIO.filter((c) => c.tipo !== 'metrica');
  const camposMetrica = CAMPOS_RELATORIO.filter((c) => c.tipo === 'metrica');

  let pontos: PontoVisao[] = [];
  let conciliacao: ResultadoVisao['conciliacao'] | null = null;
  let erro = '';
  const basesIncompletas = [
    variaveisAusentes('front-v2').length ? 'Front V2' : '',
    variaveisAusentes('funcao').length ? 'Função' : '',
  ].filter(Boolean);
  if (basesIncompletas.length) erro = `A conexão de ${basesIncompletas.join(' e ')} ainda não está completa neste ambiente.`;
  else {
    try {
      const resultado = await executarVisao({ empresa, inicio, fim, dimensao: grafico === 'indicador' ? null : dimensao, metrica, grafico });
      pontos = resultado.pontos;
      conciliacao = resultado.conciliacao;
    } catch (e) {
      erro = e instanceof Error && /Período|data final|92 dias|Campo|Escolha|gráfico/.test(e.message) ? e.message : 'A fonte ao vivo não respondeu. Nenhum dado antigo foi exibido.';
    }
  }

  let nomeMetrica = 'Métrica inválida';
  let nomeDimensao = '';
  try {
    nomeMetrica = campoRelatorio(metrica).nome;
    nomeDimensao = grafico === 'indicador' ? '' : campoRelatorio(dimensao).nome;
  } catch {
    erro ||= 'Escolha campos válidos para gerar a visão.';
  }

  return (
    <main className="construtor">
      <header className="cv-head">
        <div><p className="cv-kicker">Relatório Gerencial · dados reais</p><h1>Relatório diário — {ROTULO_EMPRESA[empresa]} · Geral</h1><p>Selecione campos aprovados e gere uma visão agregada do Front V2 com os estados devolvidos pela Função.</p></div>
        <div className="cv-live"><i />Atualizado às {horarioSp()}</div>
      </header>

      {acesso.empresas.length > 1 && <nav className="cv-company" aria-label="Empresa">{acesso.empresas.map((e) => <Link key={e} href={`/relatorio/construtor?empresa=${e}&inicio=${inicio}&fim=${fim}&dimensao=${dimensao}&metrica=${metrica}&grafico=${grafico}`} className={e === empresa ? 'active' : ''}>{ROTULO_EMPRESA[e]}</Link>)}</nav>}
      <section className="cv-presets" aria-label="Visões prontas">{VISOES_PADRAO.map((v) => <Link key={v.id} href={`/relatorio/construtor?empresa=${empresa}&inicio=${inicio}&fim=${fim}&modelo=${v.id}`} className={p.modelo === v.id ? 'active' : ''}>{v.nome}</Link>)}</section>

      <form className="cv-builder" method="get">
        <input type="hidden" name="empresa" value={empresa} />
        <label><span>De</span><input type="date" name="inicio" defaultValue={inicio} required /></label>
        <label><span>Até</span><input type="date" name="fim" defaultValue={fim} required /></label>
        <label><span>Dimensão</span><select name="dimensao" defaultValue={dimensao}>{camposDimensao.map((c) => <option value={c.id} key={c.id}>{c.nome}</option>)}</select></label>
        <label><span>Métrica</span><select name="metrica" defaultValue={metrica}>{camposMetrica.map((c) => <option value={c.id} key={c.id}>{c.nome}</option>)}</select></label>
        <label><span>Visualização</span><select name="grafico" defaultValue={grafico}>{GRAFICOS.map((g) => <option value={g.id} key={g.id}>{g.nome}</option>)}</select></label>
        <button type="submit">Gerar visão</button>
      </form>

      {conciliacao && <aside className={`cv-reconcile ${conciliacao.ausentesFuncao || conciliacao.divergenciasStatus ? 'warning' : ''}`} aria-label="Conciliação das bases">
        <strong>Front V2 × Função</strong>
        <span>{conciliacao.propostasFront.toLocaleString('pt-BR')} propostas no recorte</span>
        <span>{conciliacao.encontradasFuncao.toLocaleString('pt-BR')} de {conciliacao.enviadasFuncao.toLocaleString('pt-BR')} localizadas na Função</span>
        <span>{conciliacao.ausentesFuncao.toLocaleString('pt-BR')} ausentes</span>
        <span>{conciliacao.divergenciasStatus.toLocaleString('pt-BR')} status divergentes</span>
      </aside>}
      {erro ? <div className="cv-alert" role="status">{erro}</div> : <section className="cv-result"><div className="cv-result-head"><div><span>Visão atual</span><h2>{nomeMetrica}{nomeDimensao ? ` por ${nomeDimensao.toLowerCase()}` : ''}</h2></div><small>{ROTULO_EMPRESA[empresa]} · {inicio.split('-').reverse().join('/')} a {fim.split('-').reverse().join('/')}</small></div><Grafico tipo={grafico} pontos={pontos} formato={formatoMetrica(metrica)} /></section>}
      <p className="cv-source">Fonte ao vivo: o Front V2 define o período, empresa e responsáveis; status, esteira e valor liberado são confirmados diretamente na Função por número da proposta, em lotes de até 800. Nenhuma varredura integral, faixa simulada ou export antigo é usado.</p>
    </main>
  );
}
