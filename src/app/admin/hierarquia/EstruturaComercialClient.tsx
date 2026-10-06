'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import {
  alternarEntidadeAction,
  criarVinculo,
  encerrarVinculoAction,
  ignorarSemVinculoAction,
  resolverSemVinculoAction,
  salvarEntidade,
} from './actions';
import { vinculoVigente } from '@/lib/hierarquia/dominio';

type Alias = { id: string; origem: string; valor: string };
type PessoaRef = { id: string; nome: string; ativo: boolean };
type VinculoEquipeGerente = { id: string; inicio: Date | string; fim: Date | string | null; equipe: PessoaRef; gerente?: PessoaRef };
type VinculoVendedorEquipe = { id: string; inicio: Date | string; fim: Date | string | null; vendedor: PessoaRef; equipe?: PessoaRef };
type Gerente = PessoaRef & { empresa: string; codigoExterno: string | null; aliases: Alias[]; vinculosEquipe: VinculoEquipeGerente[] };
type Equipe = PessoaRef & { empresa: string; codigoExterno: string | null; aliases: Alias[]; vinculosGerente: VinculoEquipeGerente[]; vinculosVendedor: VinculoVendedorEquipe[] };
type Vendedor = PessoaRef & { empresa: string; codigoExterno: string | null; aliases: Alias[]; vinculosEquipe: VinculoVendedorEquipe[] };
type SemVinculo = { id: string; empresa: string; tipo: string; origem: string; valorOriginal: string; ocorrencias: number; status: string; primeiroEm: Date | string; ultimoEm: Date | string };
export type DadosEstrutura = {
  gerentes: Gerente[];
  equipes: Equipe[];
  vendedores: Vendedor[];
  semVinculo: SemVinculo[];
  resumo: { gerentesAtivos: number; equipesAtivas: number; vendedoresAtivos: number; vinculosAtivos: number; pendencias: number };
};

type Aba = 'estrutura' | 'sem-vinculo' | 'qualidade' | 'historico';
type Retorno = { ok: true } | { ok: false; erro: string };

const abas: { id: Aba; nome: string }[] = [
  { id: 'estrutura', nome: 'Estrutura atual' },
  { id: 'sem-vinculo', nome: 'Sem vínculo' },
  { id: 'qualidade', nome: 'Qualidade dos dados' },
  { id: 'historico', nome: 'Histórico' },
];

function dataBR(valor: Date | string | null) {
  if (!valor) return 'Atual';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(valor));
}

const hojeSaoPaulo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

function ativoEm(vinculo: { inicio: Date | string; fim: Date | string | null }) {
  return vinculoVigente(vinculo);
}

function tipoLabel(tipo: string) {
  return tipo === 'gerente' ? 'Gerente' : tipo === 'equipe' ? 'Equipe' : 'Vendedor';
}

function Feedback({ mensagem, pendente }: { mensagem: { tipo: 'ok' | 'erro'; texto: string } | null; pendente: boolean }) {
  return <>
    {mensagem && <div className={`hier-message ${mensagem.tipo}`} role="status">{mensagem.texto}</div>}
    {pendente && <div className="hier-progress" role="status"><span />Salvando alteração…</div>}
  </>;
}

function Modal({ aberto, tituloId, aoFechar, bloqueado, children }: { aberto: boolean; tituloId: string; aoFechar: () => void; bloqueado: boolean; children: ReactNode }) {
  const dialogoRef = useRef<HTMLElement>(null);
  const aoFecharRef = useRef(aoFechar);
  const bloqueadoRef = useRef(bloqueado);

  useEffect(() => {
    aoFecharRef.current = aoFechar;
    bloqueadoRef.current = bloqueado;
  }, [aoFechar, bloqueado]);

  useEffect(() => {
    if (!aberto) return;
    const focoAnterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialogo = dialogoRef.current;
    const focaveis = () => Array.from(dialogo?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    requestAnimationFrame(() => focaveis()[0]?.focus());
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !bloqueadoRef.current) {
        evento.preventDefault();
        aoFecharRef.current();
      }
      if (evento.key !== 'Tab') return;
      const itens = focaveis();
      if (!itens.length) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;
  return <div className="hier-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (!bloqueado && evento.target === evento.currentTarget) aoFechar(); }}>
    <section ref={dialogoRef} className="hier-modal" role="dialog" aria-modal="true" aria-labelledby={tituloId}>{children}</section>
  </div>;
}

function FormEntidade({ aoFechar, executar, pendente }: { aoFechar: () => void; executar: (acao: () => Promise<Retorno>, aoConcluir?: () => void) => void; pendente: boolean }) {
  return <form className="hier-form" onSubmit={(evento) => {
    evento.preventDefault();
    if (pendente) return;
    const dados = new FormData(evento.currentTarget);
    executar(() => salvarEntidade(dados), aoFechar);
  }}>
    <fieldset className="hier-fieldset" disabled={pendente}>
    <label>Tipo<select name="tipo" required defaultValue="equipe"><option value="gerente">Gerente</option><option value="equipe">Equipe</option><option value="vendedor">Vendedor</option></select></label>
    <label>Empresa<select name="empresa" required defaultValue="AKRK"><option>AKRK</option><option>DIG</option></select></label>
    <label>Nome<input name="nome" required maxLength={120} autoFocus placeholder="Nome oficial" /></label>
    <label>Código externo <span>opcional</span><input name="codigoExterno" maxLength={120} placeholder="Identificador da base de origem" /></label>
    <footer><button type="button" className="hier-secondary" onClick={aoFechar}>Cancelar</button><button type="submit" className="hier-primary">Cadastrar</button></footer>
    </fieldset>
  </form>;
}

function Empty({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="hier-empty"><span aria-hidden="true">◇</span><strong>{titulo}</strong><p>{texto}</p></div>;
}

export function EstruturaComercialClient({ dados }: { dados: DadosEstrutura }) {
  const [aba, setAba] = useState<Aba>('estrutura');
  const [empresa, setEmpresa] = useState('TODAS');
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [vinculoAberto, setVinculoAberto] = useState(false);
  const [tipoVinculo, setTipoVinculo] = useState<'equipe-gerente' | 'vendedor-equipe'>('equipe-gerente');
  const [origemVinculoId, setOrigemVinculoId] = useState('');
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const filtrado = <T extends { empresa: string }>(itens: T[]) => empresa === 'TODAS' ? itens : itens.filter((item) => item.empresa === empresa);
  const gerentes = filtrado(dados.gerentes);
  const equipes = filtrado(dados.equipes);
  const vendedores = filtrado(dados.vendedores);
  const semVinculo = filtrado(dados.semVinculo.filter((item) => item.status === 'pendente'));

  const executar = (acao: () => Promise<Retorno>, aoConcluir?: () => void) => iniciar(async () => {
    setMensagem(null);
    try {
      const resultado = await acao();
      setMensagem(resultado.ok ? { tipo: 'ok', texto: 'Alteração salva.' } : { tipo: 'erro', texto: resultado.erro });
      if (resultado.ok) aoConcluir?.();
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível concluir a alteração.' });
    }
  });

  const historico = useMemo(() => [
    ...dados.equipes.flatMap((item) => item.vinculosGerente.map((v) => ({ id: `eg-${v.id}`, tipo: 'Equipe → gerente', origem: item.nome, destino: v.gerente?.nome ?? 'Gerente não informado', inicio: v.inicio, fim: v.fim, empresa: item.empresa, vinculoTipo: 'equipe-gerente' as const, vinculoId: v.id }))),
    ...dados.vendedores.flatMap((item) => item.vinculosEquipe.map((v) => ({ id: `ve-${v.id}`, tipo: 'Vendedor → equipe', origem: item.nome, destino: v.equipe?.nome ?? 'Equipe não informada', inicio: v.inicio, fim: v.fim, empresa: item.empresa, vinculoTipo: 'vendedor-equipe' as const, vinculoId: v.id }))),
  ].sort((a, b) => +new Date(b.inicio) - +new Date(a.inicio)), [dados]);
  const historicoFiltrado = filtrado(historico);

  const equipesAtivas = equipes.filter((item) => item.ativo);
  const vendedoresAtivos = vendedores.filter((item) => item.ativo);
  const equipesOrfas = equipesAtivas.filter((item) => !item.vinculosGerente.some(ativoEm));
  const vendedoresOrfaos = vendedoresAtivos.filter((item) => !item.vinculosEquipe.some(ativoEm));
  const equipesCobertas = equipesAtivas.filter((item) => item.vinculosGerente.some(ativoEm)).length;
  const vendedoresCobertos = vendedoresAtivos.filter((item) => item.vinculosEquipe.some(ativoEm)).length;
  const percentualEquipe = equipesAtivas.length ? Math.round(equipesCobertas / equipesAtivas.length * 100) : null;
  const percentualVendedor = vendedoresAtivos.length ? Math.round(vendedoresCobertos / vendedoresAtivos.length * 100) : null;
  const origensVinculo = tipoVinculo === 'equipe-gerente'
    ? equipesAtivas.filter((item) => !item.vinculosGerente.some(ativoEm))
    : vendedoresAtivos.filter((item) => !item.vinculosEquipe.some(ativoEm));
  const origemVinculo = origensVinculo.find((item) => item.id === origemVinculoId);
  const destinosVinculo = (tipoVinculo === 'equipe-gerente' ? gerentes : equipesAtivas)
    .filter((item) => item.ativo && (!origemVinculo || item.empresa === origemVinculo.empresa));

  const resumoFiltrado = {
    gerentesAtivos: gerentes.filter((item) => item.ativo).length,
    equipesAtivas: equipesAtivas.length,
    vendedoresAtivos: vendedoresAtivos.length,
    pendencias: semVinculo.length,
    vinculosAtivos:
      equipesAtivas.reduce((total, item) => total + item.vinculosGerente.filter(ativoEm).length, 0)
      + vendedoresAtivos.reduce((total, item) => total + item.vinculosEquipe.filter(ativoEm).length, 0),
  };
  const pendenciasEstrutura = resumoFiltrado.pendencias + equipesOrfas.length + vendedoresOrfaos.length;
  const cadastros = [
    ...gerentes.map((item) => ({ ...item, tipo: 'gerente' as const, tipoLabel: 'Gerente' })),
    ...equipes.map((item) => ({ ...item, tipo: 'equipe' as const, tipoLabel: 'Equipe' })),
    ...vendedores.map((item) => ({ ...item, tipo: 'vendedor' as const, tipoLabel: 'Vendedor' })),
  ].sort((a, b) => a.tipoLabel.localeCompare(b.tipoLabel) || a.nome.localeCompare(b.nome));

  const navegarAbas = (evento: ReactKeyboardEvent<HTMLButtonElement>, indice: number) => {
    let destino = indice;
    if (evento.key === 'ArrowRight') destino = (indice + 1) % abas.length;
    else if (evento.key === 'ArrowLeft') destino = (indice - 1 + abas.length) % abas.length;
    else if (evento.key === 'Home') destino = 0;
    else if (evento.key === 'End') destino = abas.length - 1;
    else return;
    evento.preventDefault();
    const proxima = abas[destino];
    setAba(proxima.id);
    document.getElementById(`aba-${proxima.id}`)?.focus();
  };

  return <div className="hierarquia" aria-busy={pendente}>
    <header className="hier-head">
      <div><p className="hier-kicker">Administração · Consignado</p><h1>Estrutura Comercial</h1><p>Organize a responsabilidade comercial sem perder o histórico de cada proposta.</p></div>
      <div className="hier-head-actions">
        <label className="hier-company"><span>Empresa</span><select value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="TODAS">Todas</option><option value="AKRK">AKRK</option><option value="DIG">DIG</option></select></label>
        <button type="button" className="hier-primary" onClick={() => { setMensagem(null); setCadastroAberto(true); }}>+ Cadastrar</button>
      </div>
    </header>

    <section className="hier-summary" aria-label="Resumo da estrutura">
      <article><span>Gerentes</span><strong>{resumoFiltrado.gerentesAtivos}</strong><small>ativos</small></article>
      <article><span>Equipes</span><strong>{resumoFiltrado.equipesAtivas}</strong><small>ativas</small></article>
      <article><span>Vendedores</span><strong>{resumoFiltrado.vendedoresAtivos}</strong><small>ativos</small></article>
      <article className={pendenciasEstrutura ? 'attention' : 'success'}><span>Pendências</span><strong>{pendenciasEstrutura}</strong><small>{pendenciasEstrutura ? 'nomes ou cadastros para tratar' : 'estrutura organizada'}</small></article>
    </section>

    <nav className="hier-tabs" aria-label="Áreas da Estrutura Comercial" role="tablist">
      {abas.map((item, indice) => <button id={`aba-${item.id}`} key={item.id} type="button" role="tab" tabIndex={aba === item.id ? 0 : -1} aria-selected={aba === item.id} aria-controls={aba === item.id ? `painel-${item.id}` : undefined} onKeyDown={(evento) => navegarAbas(evento, indice)} onClick={() => setAba(item.id)}>{item.nome}{item.id === 'sem-vinculo' && resumoFiltrado.pendencias > 0 && <span>{resumoFiltrado.pendencias}</span>}</button>)}
    </nav>

    {!cadastroAberto && !vinculoAberto && <Feedback mensagem={mensagem} pendente={pendente} />}

    {aba === 'estrutura' && <section id="painel-estrutura" role="tabpanel" aria-labelledby="aba-estrutura" className="hier-panel">
      <div className="hier-panel-head"><div><h2>Hierarquia vigente</h2><p>Empresa, gerente, equipes e vendedores com vínculo ativo.</p></div><button type="button" className="hier-secondary" onClick={() => { setMensagem(null); setVinculoAberto(true); }}>Criar vínculo</button></div>
      <div className="hier-tree">
        {gerentes.filter((gerente) => gerente.ativo).map((gerente) => {
          const vinculos = gerente.vinculosEquipe.filter(ativoEm);
          return <article className="hier-manager" key={gerente.id}>
            <header><div className="hier-avatar">{gerente.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</div><div><span>{gerente.empresa} · Gerente</span><h3>{gerente.nome}</h3><small>{vinculos.length} equipe{vinculos.length === 1 ? '' : 's'}</small></div><button type="button" className="hier-text-action" onClick={() => executar(() => alternarEntidadeAction('gerente', gerente.id, false))}>Inativar</button></header>
            <div className="hier-team-list">
              {vinculos.map((vinculo) => {
                const equipe = equipes.find((item) => item.id === vinculo.equipe.id);
                const vendedoresAtivos = equipe?.vinculosVendedor.filter(ativoEm) ?? [];
                return <div className="hier-team" key={vinculo.id}><div><strong>{vinculo.equipe.nome}</strong><span>{vendedoresAtivos.length} vendedor{vendedoresAtivos.length === 1 ? '' : 'es'}</span></div><div className="hier-people" aria-label={`Vendedores da equipe ${vinculo.equipe.nome}`}>{vendedoresAtivos.slice(0, 4).map((v) => <span key={v.id} title={v.vendedor.nome}>{v.vendedor.nome.charAt(0).toUpperCase()}</span>)}{vendedoresAtivos.length > 4 && <span>+{vendedoresAtivos.length - 4}</span>}</div></div>;
              })}
              {vinculos.length === 0 && <p className="hier-inline-empty">Nenhuma equipe vinculada a este gerente.</p>}
            </div>
          </article>;
        })}
        {gerentes.filter((item) => item.ativo).length === 0 && <Empty titulo="Nenhuma hierarquia cadastrada" texto="Cadastre os responsáveis e crie os primeiros vínculos comerciais." />}
      </div>
      {(equipesOrfas.length > 0 || vendedoresOrfaos.length > 0) && <aside className="hier-orphans"><strong>Cadastros aguardando vínculo</strong><span>{equipesOrfas.length} equipes</span><span>{vendedoresOrfaos.length} vendedores</span><div className="hier-orphans-list">{equipesOrfas.length > 0 && <small><b>Equipes:</b> {equipesOrfas.map((item) => item.nome).join(', ')}</small>}{vendedoresOrfaos.length > 0 && <small><b>Vendedores:</b> {vendedoresOrfaos.map((item) => item.nome).join(', ')}</small>}</div></aside>}
    </section>}

    {aba === 'sem-vinculo' && <section id="painel-sem-vinculo" role="tabpanel" aria-labelledby="aba-sem-vinculo" className="hier-panel">
      <div className="hier-panel-head"><div><h2>Nomes sem vínculo</h2><p>Associe os valores recebidos das bases ao cadastro oficial.</p></div></div>
      {semVinculo.length > 0 ? <div className="hier-unlinked-list">{semVinculo.map((item) => {
        const opcoes = item.tipo === 'gerente' ? gerentes : item.tipo === 'equipe' ? equipes : vendedores;
        return <form className="hier-unlinked" key={item.id} onSubmit={(evento: FormEvent<HTMLFormElement>) => { evento.preventDefault(); executar(() => resolverSemVinculoAction(new FormData(evento.currentTarget))); }}>
          <input type="hidden" name="itemId" value={item.id} />
          <div className="hier-unlinked-main"><span>{item.empresa} · {tipoLabel(item.tipo)} · {item.origem}</span><strong>{item.valorOriginal}</strong><small>{item.ocorrencias} ocorrência{item.ocorrencias === 1 ? '' : 's'} · visto em {dataBR(item.ultimoEm)}</small></div>
          <label><span>Vincular a</span><select name="entidadeId" required defaultValue=""><option value="" disabled>Selecione o cadastro</option>{opcoes.filter((opcao) => opcao.ativo && opcao.empresa === item.empresa).map((opcao) => <option value={opcao.id} key={opcao.id}>{opcao.nome}</option>)}</select></label>
          <div className="hier-unlinked-actions"><button className="hier-primary" type="submit">Vincular</button><button className="hier-secondary" type="button" onClick={() => executar(() => ignorarSemVinculoAction(item.id))}>Ignorar</button></div>
        </form>;
      })}</div> : <Empty titulo="Nenhum nome pendente" texto="Todos os nomes recebidos das bases estão vinculados ou foram revisados." />}
    </section>}

    {aba === 'qualidade' && <section id="painel-qualidade" role="tabpanel" aria-labelledby="aba-qualidade" className="hier-panel">
      <div className="hier-panel-head"><div><h2>Qualidade dos vínculos</h2><p>Cobertura da hierarquia cadastrada. Consulte a cobertura das propostas no relatório.</p></div></div>
      <div className="hier-quality-grid">
        <article><div><span>Equipes com gerente</span><strong>{percentualEquipe === null ? '—' : `${percentualEquipe}%`}</strong></div>{percentualEquipe === null ? <small>Sem equipes ativas para medir</small> : <><progress max="100" value={percentualEquipe} aria-label={`${percentualEquipe}% das equipes têm gerente`} /><small>{equipesCobertas} de {equipesAtivas.length} equipes ativas</small></>}</article>
        <article><div><span>Vendedores com equipe</span><strong>{percentualVendedor === null ? '—' : `${percentualVendedor}%`}</strong></div>{percentualVendedor === null ? <small>Sem vendedores ativos para medir</small> : <><progress max="100" value={percentualVendedor} aria-label={`${percentualVendedor}% dos vendedores têm equipe`} /><small>{vendedoresCobertos} de {vendedoresAtivos.length} vendedores ativos</small></>}</article>
        <article className={semVinculo.length ? 'warning' : ''}><div><span>Nomes sem vínculo</span><strong>{semVinculo.length}</strong></div><small>{semVinculo.length ? 'Exigem revisão antes da consolidação' : 'Nenhuma pendência nas bases'}</small></article>
        <article><div><span>Vínculos vigentes</span><strong>{resumoFiltrado.vinculosAtivos}</strong></div><small>Relações ativas na data atual</small></article>
      </div>
      <div className="hier-quality-note"><span aria-hidden="true">i</span><p><strong>Leitura dos indicadores</strong>A cobertura mede o cadastro comercial. O relatório informa correspondência na Função, datas ausentes e valores liberados disponíveis.</p></div>
      <details className="hier-registry">
        <summary>Gerenciar cadastros <span>{cadastros.length}</span></summary>
        <div>{cadastros.map((item) => <article key={`${item.tipo}-${item.id}`}><div><span>{item.empresa} · {item.tipoLabel}</span><strong>{item.nome}</strong>{item.codigoExterno && <small>Código {item.codigoExterno}</small>}</div><button type="button" className="hier-text-action" onClick={() => executar(() => alternarEntidadeAction(item.tipo, item.id, !item.ativo))}>{item.ativo ? 'Inativar' : 'Reativar'}</button></article>)}</div>
      </details>
    </section>}

    {aba === 'historico' && <section id="painel-historico" role="tabpanel" aria-labelledby="aba-historico" className="hier-panel">
      <div className="hier-panel-head"><div><h2>Histórico de vínculos</h2><p>Vigências preservam o responsável comercial de cada período.</p></div></div>
      {historicoFiltrado.length > 0 ? <div className="hier-history"><div className="hier-history-head"><span>Relação</span><span>Vigência</span><span>Situação</span><span>Ação</span></div>{historicoFiltrado.map((item) => <article key={item.id}><div><span>{item.empresa} · {item.tipo}</span><strong>{item.origem} <b aria-hidden="true">→</b> {item.destino}</strong></div><div><span>Início</span><strong>{dataBR(item.inicio)}{item.fim ? ` até ${dataBR(item.fim)}` : ''}</strong></div><span className={`hier-status ${ativoEm(item) ? 'active' : ''}`}>{ativoEm(item) ? 'Vigente' : 'Encerrado'}</span><div>{ativoEm(item) && <button type="button" className="hier-text-action" onClick={() => { const fd = new FormData(); fd.set('tipo', item.vinculoTipo); fd.set('id', item.vinculoId); fd.set('fim', hojeSaoPaulo()); executar(() => encerrarVinculoAction(fd)); }}>Encerrar hoje</button>}</div></article>)}</div> : <Empty titulo="Nenhum vínculo registrado" texto="O histórico aparecerá após a criação do primeiro vínculo." />}
    </section>}

    <Modal aberto={cadastroAberto} tituloId="novo-cadastro" aoFechar={() => setCadastroAberto(false)} bloqueado={pendente}><header><div><span>Novo registro</span><h2 id="novo-cadastro">Cadastrar na estrutura</h2></div><button type="button" disabled={pendente} onClick={() => setCadastroAberto(false)} aria-label="Fechar">×</button></header><div className="hier-modal-feedback"><Feedback mensagem={mensagem} pendente={pendente} /></div><FormEntidade aoFechar={() => setCadastroAberto(false)} executar={executar} pendente={pendente} /></Modal>

    <Modal aberto={vinculoAberto} tituloId="novo-vinculo" aoFechar={() => setVinculoAberto(false)} bloqueado={pendente}><header><div><span>Vigência comercial</span><h2 id="novo-vinculo">Criar vínculo</h2></div><button type="button" disabled={pendente} onClick={() => setVinculoAberto(false)} aria-label="Fechar">×</button></header><div className="hier-modal-feedback"><Feedback mensagem={mensagem} pendente={pendente} /></div><form className="hier-form" onSubmit={(evento) => { evento.preventDefault(); if (pendente) return; executar(() => criarVinculo(new FormData(evento.currentTarget)), () => setVinculoAberto(false)); }}><fieldset className="hier-fieldset" disabled={pendente}><label>Relação<select name="tipo" value={tipoVinculo} onChange={(e) => { setTipoVinculo(e.target.value as 'equipe-gerente' | 'vendedor-equipe'); setOrigemVinculoId(''); }} required><option value="equipe-gerente">Equipe → gerente</option><option value="vendedor-equipe">Vendedor → equipe</option></select></label><p className="hier-form-note">{tipoVinculo === 'equipe-gerente' ? 'Selecione a equipe e o gerente responsável.' : 'Selecione o vendedor e a equipe responsável.'}</p><label>{tipoVinculo === 'equipe-gerente' ? 'Equipe' : 'Vendedor'}<select name="origemId" required value={origemVinculoId} onChange={(e) => setOrigemVinculoId(e.target.value)}><option value="" disabled>Selecione a origem</option>{origensVinculo.map((item) => <option key={item.id} value={item.id}>{item.empresa} · {item.nome}</option>)}</select>{origensVinculo.length === 0 && <small>Todos os cadastros ativos desta relação já têm vínculo vigente.</small>}</label><label>{tipoVinculo === 'equipe-gerente' ? 'Gerente' : 'Equipe'}<select name="destinoId" required defaultValue="" key={`${tipoVinculo}-${origemVinculoId}`}><option value="" disabled>Selecione o responsável</option>{destinosVinculo.map((item) => <option key={item.id} value={item.id}>{item.empresa} · {item.nome}</option>)}</select></label><label>Início<input name="inicio" type="date" required defaultValue={hojeSaoPaulo()} /></label><footer><button type="button" className="hier-secondary" onClick={() => setVinculoAberto(false)}>Cancelar</button><button type="submit" className="hier-primary" disabled={origensVinculo.length === 0}>Criar vínculo</button></footer></fieldset></form></Modal>
  </div>;
}
