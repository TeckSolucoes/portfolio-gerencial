import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { carregarAcesso } from '@/lib/acesso';
import { escolherEmpresa, podeVerAba } from '@/lib/permissoes';
import { carregarWeeky } from '@/lib/relatorio/weeky';
import './weeky.css';

export const dynamic = 'force-dynamic';

const dinheiro = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dinheiroCurto = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const numero = (valor: number) => valor.toLocaleString('pt-BR');
const dataCurta = (data: string) => data.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const percentual = (valor: number, total: number) => total > 0 ? `${(valor / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—';

export default async function WeekyPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  await requireFuncionalidadeForPage('relatorio');
  const acesso = await carregarAcesso();
  if (!acesso) redirect('/login');
  const { empresa: pedida } = await searchParams;
  const empresa = escolherEmpresa(acesso, pedida);
  if (!empresa || !podeVerAba(acesso, 'Geral')) {
    return <section className="weeky"><h1>Weeky</h1><p className="wk-aviso" role="status">Esta visão executiva exige acesso ao relatório geral da empresa. Solicite a liberação ao administrador.</p></section>;
  }
  const cabecalho = <header className="wk-header"><div><span className="wk-eyebrow">Visão executiva · {empresa}</span><h1>Weeky</h1><p>Os últimos 7 dias, em perspectiva.</p></div><nav className="wk-empresas" aria-label="Empresa do Weeky">{acesso.empresas.map(item => <Link key={item} href={`/weeky?empresa=${item}`} aria-current={item === empresa ? 'page' : undefined}>{item}</Link>)}</nav></header>;
  let resultado;
  try {
    resultado = await carregarWeeky(empresa);
  } catch {
    return <section className="weeky">{cabecalho}<p className="wk-aviso" role="alert">Não foi possível ler a atualização do relatório. Tente novamente em instantes.</p></section>;
  }
  if (!resultado) return <section className="weeky">{cabecalho}<p className="wk-aviso" role="status">Ainda não há uma atualização disponível para esta empresa. Os indicadores aparecerão após a sincronização dos dados.</p></section>;
  const { dados: d, geradoEm } = resultado;
  const desatualizado = resultado.desatualizado;
  const atualizado = new Date(geradoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  const variacao = d.anteriores.valor > 0 ? ((d.vendas.valor - d.anteriores.valor) / d.anteriores.valor * 100) : null;
  const maiorDia = Math.max(1, ...d.dias.map(dia => dia.valor));
  const maiorEquipe = Math.max(1, ...d.equipes.map(equipe => equipe.valor));
  const totalProdutos = d.produtos.reduce((total, item) => total + item.valor, 0);
  const comparativo = variacao === null ? 'Sem base de comparação anterior' : `${variacao > 0 ? '+' : ''}${variacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% sobre os 7 dias anteriores`;
  return <section className="weeky">
    {cabecalho}
    <div className="wk-contexto"><span><strong>{dataCurta(d.inicio)} — {dataCurta(d.fim)}</strong> · hoje parcial</span><span className={desatualizado ? 'wk-antigo' : 'wk-atualizado'}><i aria-hidden="true" />Atualizado em {atualizado}</span></div>
    {desatualizado && <p className="wk-aviso" role="status">A base tem mais de 24 horas ou sua referência ainda não inclui hoje. Os valores abaixo podem não refletir os movimentos mais recentes.</p>}
    <div className="wk-kpis">
      <article className="wk-kpi wk-destaque"><h2>Vendas contratadas</h2><strong>{dinheiro(d.vendas.valor)}</strong><span>{numero(d.vendas.qtd)} propostas criadas</span><small>{comparativo}</small></article>
      <article className="wk-kpi"><h2>Integrado na base disponível</h2><strong>{dinheiro(d.integrados.valor)}</strong><span>{numero(d.integrados.qtd)} integrações no período</span><small>Valor contratado · pela data de integração</small></article>
      <article className="wk-kpi"><h2>Cancelamentos</h2><strong>{dinheiro(d.cancelados.valor)}</strong><span>{numero(d.cancelados.qtd)} propostas · {percentual(d.cancelados.qtd, d.vendas.qtd)} das vendas</span><small>Entre as propostas criadas nesses 7 dias</small></article>
      <article className="wk-kpi"><h2>Ticket médio</h2><strong>{d.vendas.qtd ? dinheiro(d.vendas.valor / d.vendas.qtd) : '—'}</strong><span>Valor por proposta criada</span><small>{numero(d.equipes.length)} equipes com vendas no período</small></article>
    </div>
    <div className="wk-grid">
      <article className="wk-panel wk-evolucao"><div className="wk-panel-head"><div><h2>Ritmo de vendas</h2><p>Valor contratado por dia de criação</p></div><span>7 dias</span></div>
        {d.vendas.qtd === 0 ? <p className="wk-vazio">Nenhuma proposta criada neste período na atualização disponível.</p> : <div className="wk-chart" role="img" aria-label={`Vendas diárias: ${d.dias.map(dia => `${dataCurta(dia.data)}, ${dinheiro(dia.valor)}, ${dia.qtd} propostas`).join('; ')}`}>
          {d.dias.map(dia => <div className="wk-coluna" key={dia.data} title={`${dataCurta(dia.data)}: ${dinheiro(dia.valor)} · ${numero(dia.qtd)} propostas`}><span className="wk-bar-label">{dinheiroCurto(dia.valor)}</span><div className="wk-bar-track"><div className="wk-bar" style={{ height: `${Math.max(dia.valor > 0 ? 2 : 0, dia.valor / maiorDia * 100)}%` }} /></div><strong>{dataCurta(dia.data)}</strong><small>{numero(dia.qtd)} propostas</small></div>)}
        </div>}
        <p className="wk-legenda">Comparação: {dataCurta(d.anteriorInicio)} — {dataCurta(d.anteriorFim)} · {dinheiro(d.anteriores.valor)}. O dia atual ainda está em andamento.</p>
      </article>
      <article className="wk-panel"><div className="wk-panel-head"><div><h2>Mix de produtos</h2><p>Participação no valor das vendas</p></div></div><ul className="wk-lista">{d.produtos.map((item, indice) => <li key={item.nome}><div><span><i className={`wk-dot wk-cor-${indice % 4}`} />{item.nome}</span><strong>{percentual(item.valor, totalProdutos)}</strong></div><progress max={Math.max(1, totalProdutos)} value={item.valor} aria-label={`Participação de ${item.nome}`} /><small>{dinheiro(item.valor)} · {numero(item.qtd)} propostas</small></li>)}</ul>{d.produtos.length === 0 && <p className="wk-vazio">Sem vendas para distribuir por produto.</p>}</article>
      <article className="wk-panel"><div className="wk-panel-head"><div><h2>Equipes em destaque</h2><p>As 5 maiores por valor contratado</p></div></div><ol className="wk-lista wk-ranking">{d.equipes.slice(0, 5).map((item, indice) => <li key={item.nome}><div><span><b>{indice + 1}</b>{item.nome}</span><strong>{dinheiro(item.valor)}</strong></div><progress max={maiorEquipe} value={item.valor} aria-label={`Vendas da equipe ${item.nome}`} /><small>{numero(item.qtd)} propostas · {percentual(item.valor, d.vendas.valor)} das vendas</small></li>)}</ol>{d.equipes.length === 0 && <p className="wk-vazio">Sem equipes com vendas neste período.</p>}</article>
      <article className="wk-panel wk-atencao"><div className="wk-panel-head"><div><h2>Pontos para atuação</h2><p>Leitura objetiva da operação e dos dados</p></div></div><ul>
        <li><span className="wk-sinal" /><div><strong>{numero(d.pendentes.qtd)} propostas em andamento</strong><p>{dinheiro(d.pendentes.valor)} entre as vendas da semana ainda sem integração, cancelamento ou reprovação.</p></div></li>
        <li><span className="wk-sinal" /><div><strong>Exceções: {percentual(d.excecao.valor, d.vendas.valor)} do valor vendido</strong><p>{numero(d.excecao.qtd)} propostas · {dinheiro(d.excecao.valor)}. Classificação informada pelo Front.</p></div></li>
        <li><span className={`wk-sinal ${d.semHierarquia ? '' : 'wk-ok'}`} /><div><strong>{numero(d.semHierarquia)} propostas com identificação incompleta</strong><p>Gerente, equipe ou operador não informado na origem. Este indicador não valida os vínculos do cadastro comercial.</p></div></li>
        {d.semDataIntegracao > 0 && <li><span className="wk-sinal" /><div><strong>{numero(d.semDataIntegracao)} integradas sem data na base</strong><p>Contagem de toda a base disponível. Não entram no total do período, pois a data de integração não foi identificada.</p></div></li>}
      </ul></article>
    </div>
    <p className="wk-rodape">Integrações seguem a data de integração; vendas seguem a criação. Os grupos podem conter propostas diferentes. A cobertura é limitada às propostas da última extração disponível, com referência em {dataCurta(resultado.referencia)}.</p>
  </section>;
}
