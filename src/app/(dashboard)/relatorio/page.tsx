import { requireFuncionalidadeForPage } from '@/lib/authz';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { carregarAcesso } from '@/lib/acesso';
import { ROTULO_EMPRESA } from '@/lib/empresas';
import type { Empresa } from '@/lib/empresas';
import { metaDoMes } from '@/lib/metas';
import { escolherEmpresa, podeAcessar, podeVerAba } from '@/lib/permissoes';
import type { Relatorio, Tipo } from '@/lib/relatorio/types';
import { carregarRelatorioAoVivo } from '@/lib/relatorio/aoVivo';
import { listarAbasRelatorio } from '@/lib/relatorio/abas';
import { RelatorioLista } from './RelatorioLista';
import { RelatorioLote } from './RelatorioLote';
import { RelatorioNav } from './RelatorioNav';
import { EnviarWhatsapp } from './EnviarWhatsapp';
import { lerConfigWhatsapp } from '@/lib/whatsapp/envio';
import './relatorio.css';
import { ComparativoEmpresas } from '@/components/ComparativoEmpresas';
import { carregarComparativoEmpresas } from '@/lib/relatorio/comparativo-empresas';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const NAO = '—';
const hojeSp = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const ultimoDiaFechado = () => {
  const data = new Date(`${hojeSp()}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 1);
  return data.toISOString().slice(0, 10);
};

const brl = (n: number | null | undefined) => (n == null ? NAO : 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const num = (n: number | null | undefined) => (n == null ? NAO : n.toLocaleString('pt-BR'));
const pct = (f: number | null | undefined, casas = 1) => (f == null ? NAO : `${(f * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`);
const dm = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/');
const razao = (parte: number | undefined, todo: number | undefined) => (parte == null || !todo ? null : parte / todo);
const larg = (parte: number, todo: number) => (todo > 0 ? Math.max(0, Math.min(100, (100 * parte) / todo)) : 0);

function Kpi({ cls, tom, rotulo, valor, meta, tag, detalhe, children }: { cls: string; tom: string; rotulo: string; valor: string; meta?: string; tag?: string; detalhe?: string; children?: React.ReactNode }) {
  return (
    <div className={`kpi ${cls}`}>
      <div className={`lab t-${tom}`}>
        {rotulo}
        {tag && <span className="tag">{tag}</span>}
      </div>
      <div className={`val t-${tom}`}>{valor}</div>
      {meta !== undefined && <div className="meta">{meta}</div>}
      {detalhe && <div className="kpi-confianca">{detalhe}</div>}
      {children}
    </div>
  );
}

function Aviso({ titulo, texto, seletor }: { titulo: string; texto: string; seletor?: React.ReactNode }) {
  return (
    <div className="relatorio">
      {seletor}
      <p className="rel-aviso" role="status">
        <b>{titulo}</b> {texto}
      </p>
    </div>
  );
}

function SeletorEmpresa({ empresas, atual, data, escopo, gerenteComercialId }: { empresas: Empresa[]; atual: Empresa; data?: string; escopo?: string; gerenteComercialId?: string | null }) {
  if (empresas.length < 2) return null;
  return (
    <div className="rel-filtro no-print">
      <span className="rel-filtro-label">Empresa</span>
      <nav className="tabs" aria-label="Empresa do relatório">
        {empresas.map((e) => (
          <Link key={e} href={`/relatorio?empresa=${e}${escopo ? `&escopo=${encodeURIComponent(escopo)}` : ''}${gerenteComercialId ? `&gerente=${encodeURIComponent(gerenteComercialId)}` : ''}${data ? `&data=${data}` : ''}`} className={`tab ${e === atual ? 'active' : ''}`} aria-current={e === atual ? 'page' : undefined}>
            {ROTULO_EMPRESA[e]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default async function RelatorioPage({ searchParams }: { searchParams: Promise<{ escopo?: string; gerente?: string; empresa?: string; data?: string }> }) {
  await requireFuncionalidadeForPage('relatorio');
  const acesso = await carregarAcesso();
  if (!acesso) redirect('/login');
  if (acesso.empresas.length === 0) {
    return <Aviso titulo="Você ainda não tem empresa liberada." texto="Peça ao administrador." />;
  }

  const { escopo: pedido, gerente: gerentePedido, empresa: empresaPedida, data } = await searchParams;
  const empresa = escolherEmpresa(acesso, empresaPedida)!;
  // O relatório diário abre em D-1: o dia corrente ainda está em formação e
  // costumava aparecer como uma tela inteira de zeros antes do fechamento.
  const ref = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : ultimoDiaFechado();

  // Só as abas permitidas existem daqui em diante: o gerente nunca recebe Geral nem a turma de outro.
  const abasRelatorio = await listarAbasRelatorio(empresa);
  const abasVisiveis = abasRelatorio.filter((a) => podeVerAba(acesso, a.escopo, a.gerenteComercialId ?? undefined));
  const aba = abasVisiveis.find((a) => gerentePedido ? a.gerenteComercialId === gerentePedido : a.escopo === pedido) ?? abasVisiveis[0];
  if (!aba) {
    return <Aviso titulo="Nenhuma visão do relatório está liberada para você." texto="Peça ao administrador." seletor={<SeletorEmpresa empresas={acesso.empresas} atual={empresa} data={ref} escopo={pedido} gerenteComercialId={gerentePedido} />} />;
  }
  const escopo = aba.escopo;
  const vendasEmpresas = escopo === 'Geral' ? await carregarComparativoEmpresas(acesso, ref, 1) : null;
  const seletor = <SeletorEmpresa empresas={acesso.empresas} atual={empresa} data={ref} escopo={escopo} gerenteComercialId={aba.gerenteComercialId} />;

  let r: Partial<Relatorio> & Pick<Relatorio, 'kpis'>;
  try {
    r = await carregarRelatorioAoVivo(empresa, ref, escopo, aba.gerenteComercialId);
  } catch {
    return <Aviso titulo="As bases ao vivo não responderam." texto="Tente novamente em instantes; nenhum dado antigo foi exibido." seletor={seletor} />;
  }
  const k = r.kpis;

  const [ano, mesRef, diaRef] = ref.split('-').map(Number);
  const dRef = dm(ref);
  const ontem = new Date(Date.UTC(ano, mesRef - 1, diaRef - 1));
  const dOntem = `${String(ontem.getUTCDate()).padStart(2, '0')}/${String(ontem.getUTCMonth() + 1).padStart(2, '0')}`;
  const mesNome = MESES[mesRef - 1];
  const atualizadoAs = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const [oficial, whats] = await Promise.all([metaDoMes([empresa], ref.slice(0, 7)), podeAcessar(acesso, 'whatsapp') ? lerConfigWhatsapp() : null]);
  const pagosValor = k.integradoContratadoMes.valor;
  const metaOficial = oficial && {
    valor: oficial.valor,
    falta: Math.max(0, Math.round((oficial.valor - pagosValor) * 100) / 100),
    faltaPct: oficial.valor > 0 ? Math.max(0, (oficial.valor - pagosValor) / oficial.valor) : null,
    parcial: oficial.faltando.length > 0,
  };
  const meta = metaOficial ?? r.meta;
  const doGerente = escopo !== 'Geral';
  const clientes = r.clientes;
  const rp = r.rankingPagos;
  const nr = r.novaReinserida;
  const diaNr = nr?.dia ?? { novas: k.novas, reinseridas: k.reinseridas };
  const mesNr = nr?.mes ?? null;
  const equipesExc = r.excecaoEquipes ?? [];
  const churn = r.churn;
  const lista = r.lista ?? [];
  const loteDia = r.loteDia ?? [];
  const canal = r.canalMes;
  const qualidade = r.qualidade;
  const dataCompleta = (ymd: string) => ymd.split('-').reverse().join('/');
  const detalheDia = `Contratado · Front V2 · ${dRef}/${ano}`;
  const detalheMes = `Contratado · Front V2 · 01/${String(mesRef).padStart(2, '0')} a ${dRef}/${ano}`;

  const faltando = [
    !clientes && 'Clientes',
    !meta && 'Meta',
    !rp && 'Ranking dos pagos',
    !nr && 'Nova ou reinserida (mês)',
    !r.excecaoEquipes && 'Exceção por equipe',
    !churn && 'Churn',
    !r.lista && 'Lista de não reinseridos',
    k.canceladosOntem == null && 'Cancelados ontem (depende do CCNET ao vivo)',
    k.valorLiberadoMes == null && 'Valor liberado (nenhuma release localizada na Função)',
  ].filter(Boolean) as string[];

  const excDiaPct = razao(k.excecaoDia.valor, k.total.valor);
  const pagosExcPct = r.meta?.pagosExcecaoPct ?? razao(k.pagosExcecaoMes.qtd, k.pagosMes.qtd);
  const totalCanal = (t: Tipo) => canal?.[t];
  const maxExc = Math.max(1, ...equipesExc.map((e) => e.vendeu.valor));
  const totalNrDia = diaNr.novas.qtd + diaNr.reinseridas.qtd;
  const totalNrMes = mesNr ? mesNr.novas.qtd + mesNr.reinseridas.qtd : 0;

  return (
    <div className="relatorio">
      <div className="rel-head">
        <div>
          <h1>
            Relatório diário — {ROTULO_EMPRESA[empresa]} · {aba.rotulo}
          </h1>
          <div className="sub">
            War room · {dRef}/{ano} · {escopo === 'Geral' ? 'Front V2 × Função' : `equipe de ${aba.rotulo}`}
          </div>
        </div>
        <div className="rel-atualizado" role="status"><span className="live-dot" />Atualizado às {atualizadoAs}</div>
      </div>

      <div className="rel-filtros">
        {seletor}
        {abasVisiveis.length > 1 && (
          <div className="rel-filtro no-print">
            <span className="rel-filtro-label">Visão</span>
            <nav className="tabs" aria-label="Escopo do relatório">
              {abasVisiveis.map((a) => (
                <Link key={a.gerenteComercialId ?? a.escopo} href={`/relatorio?empresa=${empresa}&escopo=${encodeURIComponent(a.escopo)}${a.gerenteComercialId ? `&gerente=${encodeURIComponent(a.gerenteComercialId)}` : ''}&data=${ref}`} className={`tab ${(a.gerenteComercialId ? a.gerenteComercialId === aba.gerenteComercialId : a.escopo === escopo) ? 'active' : ''}`} aria-current={(a.gerenteComercialId ? a.gerenteComercialId === aba.gerenteComercialId : a.escopo === escopo) ? 'page' : undefined}>
                  {a.rotulo}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="rel-acoes no-print">
        <form className="rel-date" method="get">
          <input type="hidden" name="empresa" value={empresa} />
          <input type="hidden" name="escopo" value={escopo} />
          <label>Data do relatório <input type="date" name="data" defaultValue={ref} /></label>
          <button type="submit">Atualizar</button>
        </form>
        {whats && <EnviarWhatsapp empresa={empresa} escopo={escopo} gerenteComercialId={aba.gerenteComercialId} rotulo={aba.rotulo} data={ref} destinatarios={whats.destinatarios.length} />}
      </div>

      {vendasEmpresas && <ComparativoEmpresas dados={vendasEmpresas} />}
      <RelatorioNav />

      {faltando.length > 0 && (
        <p className="rel-aviso no-print" role="status">
          <b>Informação indisponível:</b> {faltando.join(' · ')}. Mostrada como {NAO}; nenhum número é estimado.
        </p>
      )}

      {qualidade && (
        <section className="rel-qualidade no-print" aria-label="Cobertura dos dados">
          <div><b>{num(qualidade.conciliadasFuncao)}</b><span>conciliadas na Função</span></div>
          <div><b>{num(qualidade.semCodigoFuncao)}</b><span>ainda sem código da Função</span></div>
          <div><b>{num(qualidade.codigosNaoEncontrados)}</b><span>códigos não encontrados na Função</span></div>
          <div><b>{num(qualidade.hierarquiaNaoInformada)}</b><span>sem hierarquia informada</span></div>
          <div><b>{num(qualidade.integradasSemData)}</b><span>integradas sem data comprovada; fora do ranking mensal</span></div>
          <p>{qualidade.fonte} · {dataCompleta(qualidade.periodoInicio)} a {dataCompleta(qualidade.periodoFim)} · {num(qualidade.totalPropostas)} propostas analisadas</p>
        </section>
      )}

      <section className="sec" id="sec-clientes">
        <div className="sec-h">Clientes</div>
        <div className="sec-s">Grão CPF · da casa = já teve qualquer contrato no grupo · novo = 1ª proposta do CPF · independente de nova/reinserida</div>
        <div className="grid-cli">
          <Kpi cls="bg-casa" tom="green" rotulo="Cliente da casa · dia" valor={brl(clientes?.casaDia.valor)} meta={clientes ? `${num(clientes.casaDia.qtd)} propostas · ${num(clientes.casaDia.cpfs)} CPF` : NAO} detalhe={`Histórico no recorte do Front V2 · ${dRef}/${ano}`} />
          <Kpi cls="bg-novo" tom="blue" rotulo="Cliente novo · dia" valor={brl(clientes?.novoDia.valor)} meta={clientes ? `${num(clientes.novoDia.qtd)} propostas` : NAO} detalhe={`Sem proposta anterior no recorte · Front V2 · ${dRef}/${ano}`} />
          <Kpi cls="bg-casames" tom="purple" rotulo="Cliente da casa · mês" valor={brl(clientes?.casaMes.valor)} meta={clientes ? `${num(clientes.casaMes.qtd)} propostas · ${num(clientes.casaMes.cpfs)} CPF` : NAO} detalhe={detalheMes} />
        </div>
      </section>

      <section className="sec" id="sec-vendas">
        <div className="sec-h">Vendas</div>
        <div className="sec-s">Nove cartões · propostas do dia {dRef} (exceto cancelados ontem/mês)</div>
        <div className="grid9">
          <Kpi cls="bg-total" tom="blue" rotulo="Total do dia" valor={brl(k.total.valor)} meta={`${num(k.total.qtd)} operações`} detalhe={detalheDia} />
          <Kpi cls="bg-novas" tom="green" rotulo="Vendas novas" valor={brl(k.novas.valor)} meta={`${num(k.novas.qtd)} · 1ª proposta do caso`} detalhe={detalheDia} />
          <Kpi cls="bg-reins" tom="purple" rotulo="Reinseridas" valor={brl(k.reinseridas.valor)} meta={`${num(k.reinseridas.qtd)} · mesmo caso, proposta nova`} detalhe={detalheDia} />
          <Kpi cls="bg-exc" tom="orange" rotulo="Exceção do dia" valor={brl(k.excecaoDia.valor)} meta={`${num(k.excecaoDia.qtd)} propostas · ${pct(excDiaPct)} do dia`} detalhe={detalheDia} />
          <Kpi cls="bg-front" tom="red" rotulo="Front" valor={brl(k.front.valor)} meta={`${num(k.front.qtd)} propostas`} detalhe={`Sem código Função · ${dRef}/${ano}`} />
          <Kpi cls="bg-ccnet" tom="blue" rotulo="CCNET" valor={brl(k.ccnet.valor)} meta={`${num(k.ccnet.qtd)} propostas`} detalhe={`Com código Função · ${dRef}/${ano}`} />
          <Kpi cls="bg-canc" tom="red" rotulo="Cancelados ontem" valor={brl(k.canceladosOntem?.valor)} meta={k.canceladosOntem ? `${num(k.canceladosOntem.qtd)} · ${dOntem}` : 'indisponível · depende do CCNET ao vivo'} detalhe="Status Front/Função · data do cancelamento" />
          <Kpi cls="bg-cancm" tom="white" rotulo="Cancelados do mês" valor={brl(k.canceladosMes.valor)} meta={`${num(k.canceladosMes.qtd)} propostas`} detalhe={detalheMes} />
          <Kpi cls="bg-front" tom="white" rotulo="Cancelados %" valor={pct(k.canceladosMesPct)} meta={`${num(k.canceladosMes.qtd)} de ${num(k.vendasMes.qtd)} no mês`} detalhe="Quantidade cancelada ÷ propostas do mês" />
        </div>
      </section>

      <section className="sec" id="sec-mes">
        <div className="sec-h">MÊS</div>
        <div className="sec-s">
          Propostas cadastradas em {mesNome}/{ano} até {dRef} · cancelamento = Status Front “Cancelada”
        </div>
        <div className="grid4">
          <Kpi cls="bg-total" tom="blue" rotulo="Vendas do mês" valor={brl(k.vendasMes.valor)} meta={`${num(k.vendasMes.qtd)} propostas · ${mesNome}`} detalhe={detalheMes} />
          <Kpi cls="bg-cancm" tom="white" rotulo="Cancelados do mês" valor={brl(k.canceladosMes.valor)} meta={`${num(k.canceladosMes.qtd)} propostas canceladas`} detalhe={detalheMes} />
          <Kpi cls="bg-ccnet" tom="blue" rotulo="Histórico contratado" valor={brl(k.vendasGeral.valor)} meta={`${num(k.vendasGeral.qtd)} propostas · sem corte de data`} detalhe="Valor contratado · Front V2 · histórico disponível" />
          <Kpi cls="bg-front" tom="white" rotulo="Histórico cancelado" valor={brl(k.canceladosGeral.valor)} meta={`${num(k.canceladosGeral.qtd)} propostas · sem corte de data`} detalhe="Status Front · Front V2 · histórico disponível" />
        </div>
      </section>

      <section className="sec" id="sec-meta">
        <div className="sec-h">
          Meta <span className="tag">{metaOficial ? 'OFICIAL' : 'MODELO'}</span>
        </div>
        <div className="sec-s">
          {metaOficial ? `Meta oficial de ${ROTULO_EMPRESA[empresa]} em ${mesNome}` : 'Meta é número de modelo'} · pagos vêm das bases ao vivo
          {doGerente && ` · a meta é a da empresa inteira (ainda não há meta por gerente); os pagos são só da equipe de ${aba.rotulo}`}
          {metaOficial?.parcial && ` · parcial: sem meta cadastrada para: ${oficial!.faltando.join(', ')}`}
        </div>
        <div className="grid4">
          <Kpi
            cls="bg-total"
            tom="blue"
            rotulo="Meta"
            tag={metaOficial ? (metaOficial.parcial ? 'OFICIAL · PARCIAL' : 'OFICIAL') : 'MODELO'}
            valor={brl(meta?.valor)}
            meta={metaOficial ? (metaOficial.parcial ? `sem meta cadastrada para: ${oficial!.faltando.join(', ')}` : `meta de ${ROTULO_EMPRESA[empresa]}`) : meta ? 'trocar quando a meta oficial chegar' : 'meta ainda não informada'}
            detalhe={`${metaOficial ? 'Cadastro oficial' : 'Modelo'} · ${mesNome}/${ano}`}
          />
          <Kpi cls="bg-novas" tom="green" rotulo="Integrado contratado" valor={brl(k.integradoContratadoMes.valor)} meta={`${num(k.integradoContratadoMes.qtd)} propostas · ${mesNome}`} detalhe="Valor contratado · data de integração · Front V2 × Função" />
          <Kpi cls="bg-ccnet" tom="blue" rotulo="Valor liberado" valor={brl(k.valorLiberadoMes?.valor)} meta={k.valorLiberadoMes ? `${num(k.valorLiberadoMes.qtd)} de ${num(k.valorLiberadoMes.totalIntegradas)} integradas${k.valorLiberadoMes.completo ? '' : ' · parcial'}` : 'indisponível · nenhuma release localizada'} detalhe="Soma das releases · Função · mês da integração" />
          <Kpi cls="bg-exc" tom="orange" rotulo="Integrado exceção" valor={brl(k.pagosExcecaoMes.valor)} meta={`${num(k.pagosExcecaoMes.qtd)} propostas · ${pct(pagosExcPct)} dos integrados`} detalhe="Contratado · exceção · mês da integração" />
          {doGerente ? (
            <Kpi cls="bg-canc" tom="red" rotulo="Falta" valor="—" meta="a meta é da empresa; o que falta só faz sentido no Geral" detalhe="Meta da empresa − integrado contratado" />
          ) : (
            <Kpi cls="bg-canc" tom="red" rotulo="Falta" valor={brl(meta?.falta)} meta={meta ? `${pct(meta.faltaPct)} para a meta` : NAO} detalhe="Meta da empresa − integrado contratado" />
          )}
        </div>
      </section>

      <section className="sec" id="sec-ranking">
        <div className="sec-h">Ranking dos pagos</div>
        <div className="sec-s">Integrações ocorridas no mês · percentual = participação no valor total integrado · 4º cartão = gerente</div>
        <div className="grid4">
          {(
            [
              ['bg-ccnet', 'blue', 'Ranking Convênio', rp?.convenio],
              ['bg-reins', 'purple', 'Ranking Produto', rp?.produto],
              ['bg-exc', 'orange', 'Ranking Equipe', rp?.equipe],
              ['bg-novas', 'green', 'Ranking Gerente', rp?.gerente],
            ] as const
          ).map(([cls, tom, rotulo, item]) => (
            <div key={rotulo} className={`kpi ${cls} rank`}>
              <div className={`lab t-${tom}`}>{rotulo}</div>
              <div className={`nome t-${tom}`}>{item?.nome ?? NAO}</div>
              <div className="subv">{item ? `${brl(item.valor)} · ${pct(item.pct)} dos pagos` : NAO}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec-h">Nova ou reinserida</div>
        <div className="sec-s">Verde = 1ª proposta do caso · Roxo = mesmo CPF+tipo+produto com proposta nova</div>
        <div className="card bars">
          {(
            [
              [`Dia ${dRef}`, diaNr, totalNrDia],
              [mesNome.charAt(0).toUpperCase() + mesNome.slice(1), mesNr, totalNrMes],
            ] as const
          ).map(([titulo, par, total]) => (
            <div key={titulo} className="bar-block">
              <div className="lbl">
                <b>{titulo}</b>
                <span className="muted">{par ? `${num(total)} propostas` : NAO}</span>
              </div>
              <div className="bar-track" role="img" aria-label={par ? `${titulo}: ${par.novas.qtd} novas e ${par.reinseridas.qtd} reinseridas` : `${titulo}: indisponível`}>
                {par && (
                  <>
                    <i className="nova" style={{ width: `${larg(par.novas.qtd, total)}%` }} />
                    <i className="reins" style={{ width: `${larg(par.reinseridas.qtd, total)}%` }} />
                  </>
                )}
              </div>
              <div className="bar-leg">
                <span>
                  <b className="t-green">{par ? `${num(par.novas.qtd)} novas` : NAO}</b> · {brl(par?.novas.valor)}
                </span>
                <span>
                  <b className="t-purple">{par ? `${num(par.reinseridas.qtd)} reinseridas` : NAO}</b> · {brl(par?.reinseridas.valor)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" id="sec-excecao">
        <div className="sec-h">Exceção vendida</div>
        <div className="sec-s">Política FRONT EXCEÇÃO · laranja = vendido · verde = já pagou</div>
        <div className="card">
          <div className="exc-sum">
            <div className="box">
              <div className="lab muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em' }}>
                DIA {dRef}
              </div>
              <div className="v t-orange">{brl(k.excecaoDia.valor)}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                {num(k.excecaoDia.qtd)} propostas · {pct(excDiaPct)} do dia
              </div>
            </div>
            <div className="box">
              <div className="lab muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em' }}>
                VENDIDO NO MÊS
              </div>
              <div className="v t-orange">{brl(k.excecaoMes.valor)}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                {num(k.excecaoMes.qtd)} propostas
              </div>
            </div>
            <div className="box">
              <div className="lab muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em' }}>
                PAGOS DO MÊS
              </div>
              <div className="v t-green">{brl(k.pagosExcecaoMes.valor)}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                {num(k.pagosExcecaoMes.qtd)} de {num(k.pagosMes.qtd)} · {pct(pagosExcPct)}
              </div>
            </div>
          </div>
          {!r.excecaoEquipes && <div className="missing muted" style={{ fontSize: 12 }}>Detalhe por equipe indisponível nas bases atuais.</div>}
          {equipesExc.map((e) => (
            <div key={e.equipe} className="eq-row">
              <div className="top">
                <span>
                  <b>{e.equipe}</b>
                </span>
                <span className="muted">
                  {num(e.vendeu.qtd)} vendeu · {num(e.pagou.qtd)} pagou
                </span>
              </div>
              <div className="eq-bars" role="img" aria-label={`${e.equipe}: vendeu ${brl(e.vendeu.valor)}, pagou ${brl(e.pagou.valor)}`}>
                <div className="h">
                  <i style={{ width: `${larg(e.vendeu.valor, maxExc)}%`, background: 'var(--orange)' }} />
                </div>
                <div className="h">
                  <i style={{ width: `${larg(e.pagou.valor, maxExc)}%`, background: 'var(--green)' }} />
                </div>
                <div className="vals">
                  <span className="t-orange">{brl(e.vendeu.valor)}</span>
                  <span className="t-green">{e.pagou.valor > 0 ? brl(e.pagou.valor) : NAO}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" id="sec-canal">
        <div className="sec-h">Por canal · {mesNome}</div>
        <div className="sec-s">A taxa é só de quem já fechou. Jornada ainda não entra.</div>
        <div className="grid3 canal">
          {(
            [
              ['Novo', 'canal-novo'],
              ['Compra', 'canal-compra'],
              ['Adiantamento', 'canal-adiant'],
            ] as const
          ).map(([t, cls]) => {
            const c = totalCanal(t);
            return (
              <div key={t} className={`box ${cls}`}>
                <div className="hd">
                  <span className="name">{t}</span>
                  <span className="rate">{pct(c?.taxaMorte)}</span>
                </div>
                <div className="hint">{num(c?.casos)} casos · % que morreu entre os que fecharam</div>
                <div className="trio">
                  <div>
                    <div className="n t-green">{num(c?.pagou)}</div>
                    <div className="l">Pagou</div>
                  </div>
                  <div>
                    <div className="n t-red">{num(c?.morreu)}</div>
                    <div className="l">Morreu</div>
                  </div>
                  <div>
                    <div className="n t-blue">{num(c?.jornada)}</div>
                    <div className="l">Jornada</div>
                  </div>
                </div>
                <div className="ft">
                  <span className="t-orange">Front {num(c?.mortesFront)}</span> · <span className="t-blue">CCNET {num(c?.mortesCcnet)}</span> <span className="muted">(morreu)</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sec" id="sec-churn">
        <div className="sec-h">Churn</div>
        <div className="sec-s">Caso que morreu · CPF+tipo+produto · não é a pessoa</div>
        <div className="churn-wrap">
          <div className="churn-kpis">
            <div className="box ch-nao">
              <div className="lab">Não voltou</div>
              <div className="v t-red">{num(churn?.naoVoltou)}</div>
              <div className="s">{churn ? `${pct(churn.naoVoltouPct, 0)} dos casos do mês` : NAO}</div>
            </div>
            <div className="box ch-voltou">
              <div className="lab">Voltou e morreu</div>
              <div className="v t-orange">{num(churn?.voltouMorreu)}</div>
              <div className="s">Reinseriu e a nova também morreu</div>
            </div>
            <div className="box ch-fechou">
              <div className="lab">Dos que fecharam</div>
              <div className="v t-red">{pct(churn?.taxa, 0)}</div>
              <div className="s">{churn ? `${num(churn.morreram)} morreu de ${num(churn.fecharam)}` : NAO}</div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
            Equipes com maior morreu / (pagou+morreu)
          </div>
          {(churn?.equipes ?? []).map((e) => (
            <div key={e.equipe} className="churn-bar">
              <span className="nm">{e.equipe}</span>
              <div className="tr" role="img" aria-label={`${e.equipe}: ${pct(e.taxa, 0)}`}>
                <i style={{ width: `${larg(e.taxa, 1)}%` }} />
              </div>
              <span className="pc">{pct(e.taxa, 0)}</span>
            </div>
          ))}
        </div>
      </section>

      <RelatorioLista linhas={lista} />

      <RelatorioLote dias={loteDia} resumo={r.resumoMes ?? null} />

      <section className="sec">
        <div className="sec-h">Onde está a venda do dia</div>
        <div className="sec-s">FRONT por Status Front (sem código) · CCNET por Esteira Função (com código)</div>
        <div className="grid2">
          <div className="board front">
            <div className="bh">
              <span>FRONT</span>
              <span>{brl(k.front.valor)}</span>
            </div>
            <div className="bs">Ainda no Front · {num(k.front.qtd)} propostas</div>
            {(r.etapasFront ?? []).map((e) => (
              <div key={e.chave} className="row">
                <span className="st">{e.chave}</span>
                <span className="nv">
                  {num(e.qtd)} · {brl(e.valor)}
                </span>
              </div>
            ))}
          </div>
          <div className="board ccnet">
            <div className="bh">
              <span>CCNET</span>
              <span>{brl(k.ccnet.valor)}</span>
            </div>
            <div className="bs">Auditoria aprovou · {num(k.ccnet.qtd)} propostas</div>
            {(r.etapasCcnet ?? []).map((e) => (
              <div key={e.chave} className="row">
                <span className="st">{e.chave}</span>
                <span className="nv">
                  {num(e.qtd)} · {brl(e.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="footnote">Fonte: Front V2 × Função · histórico contratado sem corte de data; demais análises exibem o período em cada KPI · integrado usa valor contratado e data de integração · liberado soma releases disponíveis · {metaOficial ? 'Meta oficial' : 'Meta MODELO (não é meta oficial)'} · hierarquia preservada por empresa e gerente</p>
    </div>
  );
}
