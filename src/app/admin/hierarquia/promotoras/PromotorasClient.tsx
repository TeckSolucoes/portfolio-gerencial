'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { salvarPromotora } from './actions';

type Promotora = {
  id: string; empresa: string; nome: string; cnpj: string | null; codigo: string | null;
  origem: string; ativo: boolean; gerenteId: string | null; gerenteNome: string | null;
  atualizadoEm: string; historico: { id: string; data: string; resumo: string }[];
};
type Dados = { promotoras: Promotora[]; gerentes: { id: string; nome: string; empresa: string; ativo: boolean }[] };
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const dataBR = (valor: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(valor));

export function PromotorasClient({ dados }: { dados: Dados }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [situacao, setSituacao] = useState('');
  const [vinculo, setVinculo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [selecao, setSelecao] = useState<Promotora | 'nova' | null>(null);
  const [editando, setEditando] = useState(false);
  const [empresaForm, setEmpresaForm] = useState('AKRK');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [pendente, iniciar] = useTransition();
  const dialogo = useRef<HTMLDialogElement>(null);
  const selecionada = selecao && selecao !== 'nova' ? selecao : null;

  useEffect(() => {
    if (selecao) dialogo.current?.showModal();
    else dialogo.current?.close();
  }, [selecao]);

  const filtradas = useMemo(() => dados.promotoras.filter(item => {
    const termo = normalizar(busca.trim());
    const documento = termo.replace(/\D/g, '');
    return (!empresa || item.empresa === empresa)
      && (!situacao || item.ativo === (situacao === 'ativa'))
      && (!vinculo || Boolean(item.gerenteId) === (vinculo === 'com'))
      && (!termo || normalizar(`${item.nome} ${item.codigo ?? ''} ${item.cnpj ?? ''}`).includes(termo)
        || (/^[\d.\s/-]+$/.test(termo) && documento.length > 0 && (item.cnpj ?? '').replace(/\D/g, '').includes(documento)));
  }), [dados.promotoras, busca, empresa, situacao, vinculo]);
  const paginas = Math.max(1, Math.ceil(filtradas.length / 20));
  const paginaAtual = Math.min(pagina, paginas);
  const itens = filtradas.slice((paginaAtual - 1) * 20, paginaAtual * 20);

  function abrir(item: Promotora | 'nova') {
    setErro(''); setSelecao(item); setEditando(item === 'nova');
    setEmpresaForm(item === 'nova' ? 'AKRK' : item.empresa);
  }

  return <section className="promotoras">
    <header className="promo-head"><div><span className="promo-kicker">Estrutura comercial</span><h1>Organograma Promotoras</h1><p>Cadastros, responsáveis e histórico das promotoras.</p></div><button className="promo-primary" onClick={() => abrir('nova')}>+ Cadastrar promotora</button></header>
    {mensagem && <p className="promo-message" role="status">{mensagem}</p>}
    <div className="promo-counts" aria-label="Resumo dos cadastros"><span><strong>{dados.promotoras.length}</strong> cadastradas</span><span><strong>{dados.promotoras.filter(item => item.ativo).length}</strong> ativas</span><span><strong>{dados.promotoras.filter(item => !item.gerenteId).length}</strong> sem gerente</span></div>
    <div className="promo-filters">
      <label className="promo-search">Buscar<input type="search" placeholder="Nome, CNPJ ou código" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} /></label>
      <label>Empresa<select value={empresa} onChange={e => { setEmpresa(e.target.value); setPagina(1); }}><option value="">Todas</option><option>AKRK</option><option>DIG</option></select></label>
      <label>Situação<select value={situacao} onChange={e => { setSituacao(e.target.value); setPagina(1); }}><option value="">Todas</option><option value="ativa">Ativas</option><option value="inativa">Inativas</option></select></label>
      <label>Vínculo<select value={vinculo} onChange={e => { setVinculo(e.target.value); setPagina(1); }}><option value="">Todos</option><option value="com">Com gerente</option><option value="sem">Sem gerente</option></select></label>
    </div>
    <div className="promo-table-wrap" role="region" aria-label="Lista de promotoras" tabIndex={0}><table><caption className="promo-sr">Promotoras cadastradas e seus responsáveis</caption><thead><tr><th>Promotora</th><th>Empresa</th><th>CNPJ / código</th><th>Gerente</th><th>Situação</th><th>Atualização</th></tr></thead><tbody>
      {itens.map(item => <tr key={item.id}><td><button className="promo-name" onClick={() => abrir(item)}>{item.nome}</button><small>{item.origem}</small></td><td>{item.empresa}</td><td>{item.cnpj || 'Sem CNPJ'}<small>{item.codigo || 'Sem código'}</small></td><td>{item.gerenteNome || 'Sem gerente'}</td><td><span className={`promo-badge ${item.ativo ? 'ativa' : ''}`}>{item.ativo ? 'Ativa' : 'Inativa'}</span></td><td>{dataBR(item.atualizadoEm)}</td></tr>)}
      {!itens.length && <tr><td colSpan={6} className="promo-empty"><strong>{dados.promotoras.length ? 'Nenhuma promotora encontrada' : 'Nenhuma promotora cadastrada'}</strong><p>{dados.promotoras.length ? 'Ajuste os filtros ou o termo de busca.' : 'Cadastre a primeira promotora para começar.'}</p></td></tr>}
    </tbody></table></div>
    <footer className="promo-pagination"><span role="status">{filtradas.length} resultado(s) · Página {paginaAtual} de {paginas}</span><div><button disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button><button disabled={paginaAtual === paginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button></div></footer>
    <dialog ref={dialogo} className="promo-dialog" aria-labelledby="promo-dialog-title" onCancel={e => { if (pendente) e.preventDefault(); else setSelecao(null); }} onClose={() => setSelecao(null)}>
      {selecao && <><header><h2 id="promo-dialog-title">{selecao === 'nova' ? 'Cadastrar promotora' : editando ? 'Editar promotora' : selecionada?.nome}</h2><button aria-label="Fechar detalhes" disabled={pendente} onClick={() => setSelecao(null)}>×</button></header>
        {erro && <p className="promo-error" role="alert">{erro}</p>}
        {editando ? <form onSubmit={e => {
          e.preventDefault(); if (pendente) return;
          const form = new FormData(e.currentTarget); setErro('');
          iniciar(async () => {
            try {
              const retorno = await salvarPromotora(form);
              if (!retorno.ok) { setErro(retorno.erro); return; }
              setMensagem(selecao === 'nova' ? 'Promotora cadastrada com sucesso.' : 'Promotora atualizada com sucesso.');
              setSelecao(null); router.refresh();
            } catch { setErro('Não foi possível salvar. Tente novamente.'); }
          });
        }}><fieldset disabled={pendente}>
          {selecionada && <input type="hidden" name="id" value={selecionada.id} />}
          <label>Empresa<select name="empresa" value={empresaForm} onChange={e => setEmpresaForm(e.target.value)} required><option>AKRK</option><option>DIG</option></select></label>
          <label>Nome<input name="nome" required maxLength={160} defaultValue={selecionada?.nome ?? ''} /></label>
          <label>CNPJ (opcional)<input name="cnpj" maxLength={18} defaultValue={selecionada?.cnpj ?? ''} /></label>
          <label>Código (opcional)<input name="codigo" maxLength={100} defaultValue={selecionada?.codigo ?? ''} /></label>
          <label>Origem<select name="origem" defaultValue={selecionada?.origem ?? 'manual'}><option value="manual">Manual</option><option value="front_v2">Front V2</option><option value="funcao">Função</option></select></label>
          <label>Gerente (opcional)<select name="gerenteId" key={empresaForm} defaultValue={empresaForm === selecionada?.empresa ? selecionada.gerenteId ?? '' : ''}><option value="">Sem gerente</option>{dados.gerentes.filter(item => item.empresa === empresaForm && (item.ativo || item.id === selecionada?.gerenteId)).map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
          <label>Situação<select name="ativo" defaultValue={selecionada?.ativo === false ? 'false' : 'true'}><option value="true">Ativa</option><option value="false">Inativa</option></select></label>
          <footer><button type="button" onClick={() => selecionada ? setEditando(false) : setSelecao(null)}>Cancelar</button><button className="promo-primary" type="submit">{pendente ? 'Salvando…' : 'Salvar promotora'}</button></footer>
        </fieldset></form> : selecionada && <div className="promo-details"><dl>{[['Empresa', selecionada.empresa], ['CNPJ', selecionada.cnpj || 'Não informado'], ['Código', selecionada.codigo || 'Não informado'], ['Origem', selecionada.origem], ['Gerente', selecionada.gerenteNome || 'Sem gerente'], ['Situação', selecionada.ativo ? 'Ativa' : 'Inativa']].map(([nome, valor]) => <div key={nome}><dt>{nome}</dt><dd>{valor}</dd></div>)}</dl><button className="promo-primary" onClick={() => setEditando(true)}>Editar cadastro</button><h3>Histórico</h3>{selecionada.historico.length ? <ol>{selecionada.historico.map(evento => <li key={evento.id}><time dateTime={evento.data}>{dataBR(evento.data)}</time><p>{evento.resumo}</p></li>)}</ol> : <p className="promo-muted">Nenhuma alteração registrada.</p>}</div>}
      </>}
    </dialog>
  </section>;
}


