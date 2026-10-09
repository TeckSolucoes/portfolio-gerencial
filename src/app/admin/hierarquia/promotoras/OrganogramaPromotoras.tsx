'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import './organograma.css';

type Promotora = { id: string; empresa: string; nome: string; codigo?: string | null; ativo: boolean; gerenteId: string | null; gerenteNome: string | null; foto: boolean };
type Gerente = { id: string; nome: string; empresa: string; ativo: boolean; foto: boolean };
type Dados = { promotoras: Promotora[]; gerentes: Gerente[]; fotoCeo: boolean };
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

function Foto({ alvo, nome, foto }: { alvo: string; nome: string; foto: boolean }) {
  const router = useRouter();
  const [versao, setVersao] = useState(0);
  const [falhou, setFalhou] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState(false);
  const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase('pt-BR');

  async function enviar(arquivo: File) {
    setMensagem(''); setErro(false);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
      setErro(true); setMensagem('Escolha PNG, JPEG ou WebP de até 2 MB.'); return;
    }
    setPendente(true);
    try {
      const resposta = await fetch(`/api/promotoras/fotos/${encodeURIComponent(alvo)}`, {
        method: 'PUT', headers: { 'Content-Type': arquivo.type }, body: arquivo,
      });
      if (!resposta.ok) {
        const retorno = await resposta.json().catch(() => null);
        throw new Error(typeof retorno?.erro === 'string' ? retorno.erro : 'Não foi possível salvar a foto.');
      }
      setVersao(Date.now()); setFalhou(false); setMensagem('Foto atualizada.'); router.refresh();
    } catch (falha) {
      setErro(true); setMensagem(falha instanceof Error ? falha.message : 'Não foi possível enviar a foto. Tente novamente.');
    } finally { setPendente(false); }
  }

  return <div className="org-photo-control">
    <label className={`org-photo ${pendente ? 'org-photo-busy' : ''}`} title={`Alterar foto de ${nome}`}>
      {(foto || versao > 0) && !falhou
        ? <Image unoptimized src={`/api/promotoras/fotos/${encodeURIComponent(alvo)}?v=${versao}`} alt="" width={48} height={48} onError={() => setFalhou(true)} />
        : <span aria-hidden="true">{iniciais}</span>}
      <span className="org-photo-edit" aria-hidden="true">{pendente ? '…' : '+'}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Alterar foto de ${nome}, PNG, JPEG ou WebP até 2 MB`} disabled={pendente} onChange={e => {
        const arquivo = e.currentTarget.files?.[0]; e.currentTarget.value = '';
        if (arquivo) void enviar(arquivo);
      }} />
    </label>
    {mensagem && <span className={`org-photo-feedback ${erro ? 'org-photo-error' : ''}`} role="status">{mensagem}</span>}
  </div>;
}

export function OrganogramaPromotoras({ dados, onAbrirPromotora }: { dados: Dados; onAbrirPromotora: (id: string) => void }) {
  const [busca, setBusca] = useState('');
  const [unidade, setUnidade] = useState('');
  const [recolhidos, setRecolhidos] = useState<Set<string>>(() => new Set(dados.gerentes.map(item => item.id)));
  const termo = normalizar(busca.trim());
  const corresponde = (nome: string, codigo = '') => !termo || normalizar(`${nome} ${codigo}`).includes(termo);

  function alternar(id: string) {
    setRecolhidos(anteriores => {
      const proximos = new Set(anteriores);
      if (proximos.has(id)) proximos.delete(id); else proximos.add(id);
      return proximos;
    });
  }

  function cardPromotora(item: Promotora) {
    return <li key={item.id} className="org-promotora">
      <div className="org-card">
        <Foto alvo={`promotora-${item.id}`} nome={item.nome} foto={item.foto} />
        <div className="org-card-text"><span className="org-role">Promotora</span><button className="org-open" onClick={() => onAbrirPromotora(item.id)}>{item.nome}</button>
          {item.codigo && <small>Código {item.codigo}</small>}
          {!item.ativo && <span className="org-inactive">Inativa</span>}
        </div>
        <span className="org-open-icon" aria-hidden="true">↗</span>
      </div>
    </li>;
  }

  return <section className="org" aria-label="Organograma comercial das promotoras">
    <div className="org-toolbar">
      <div><span className="org-eyebrow">Visão da estrutura</span><p>CEO → Unidade → Gerente → Promotora</p></div>
      <label>Buscar na estrutura<input type="search" placeholder="Nome ou código" value={busca} onChange={e => setBusca(e.target.value)} /></label>
      <label>Unidade<select value={unidade} onChange={e => setUnidade(e.target.value)}><option value="">Todas</option><option>AKRK</option><option>DIG</option></select></label>
    </div>
    <div className="org-controls"><button disabled={Boolean(termo)} onClick={() => setRecolhidos(new Set())}>Expandir tudo</button><button disabled={Boolean(termo)} onClick={() => setRecolhidos(new Set(dados.gerentes.map(item => item.id)))}>Recolher tudo</button></div>
    <div className="org-canvas">
      <div className="org-ceo"><div className="org-card">
        <Foto alvo="ceo-roberto" nome="Roberto" foto={dados.fotoCeo} />
        <div className="org-card-text"><span className="org-role">CEO</span><strong>Roberto</strong><small>Estrutura comercial</small></div>
      </div></div>
      <div className={`org-units ${unidade ? 'org-single-unit' : ''}`}>
        {['AKRK', 'DIG'].filter(empresa => !unidade || empresa === unidade).map(empresa => {
          const gerentes = dados.gerentes.filter(item => item.empresa === empresa);
          const promotoras = dados.promotoras.filter(item => item.empresa === empresa);
          const semVinculo = promotoras.filter(item => !gerentes.some(gerente => gerente.id === item.gerenteId)).filter(item => corresponde(item.nome, item.codigo ?? ''));
          const grupos = gerentes.map(gerente => ({ gerente, itens: promotoras.filter(item => item.gerenteId === gerente.id).filter(item => corresponde(gerente.nome) || corresponde(item.nome, item.codigo ?? '')) }))
            .filter(grupo => corresponde(grupo.gerente.nome) || grupo.itens.length > 0);
          return <section className={`org-unit org-unit-${empresa.toLowerCase()}`} key={empresa} aria-label={`Unidade ${empresa}`}>
            <header className="org-unit-head"><div><span className="org-role">Unidade comercial</span><h2>{empresa}</h2></div><span>{grupos.reduce((total, grupo) => total + grupo.itens.length, semVinculo.length)} promotoras</span></header>
            <ul className="org-branches">
              {grupos.map(({ gerente, itens }) => {
                const expandido = Boolean(termo) || !recolhidos.has(gerente.id);
                const listaId = `org-promotoras-${gerente.id}`;
                return <li className="org-branch" key={gerente.id}>
                  <div className="org-card org-manager">
                    <Foto alvo={`gerente-${gerente.id}`} nome={gerente.nome} foto={gerente.foto} />
                    <div className="org-card-text"><span className="org-role">Gerente</span><strong>{gerente.nome}</strong><small>{itens.length} promotoras</small>{!gerente.ativo && <span className="org-inactive">Inativo</span>}</div>
                    <button className="org-toggle" aria-label={`${expandido ? 'Recolher' : 'Expandir'} promotoras de ${gerente.nome}`} aria-expanded={expandido} aria-controls={listaId} disabled={Boolean(termo)} onClick={() => alternar(gerente.id)}>{expandido ? '−' : '+'}</button>
                  </div>
                  <ul id={listaId} className="org-children" hidden={!expandido}>
                    {expandido && itens.map(cardPromotora)}
                    {expandido && !itens.length && <li className="org-empty">Nenhuma promotora nesta seleção.</li>}
                  </ul>
                </li>;
              })}
              {semVinculo.length > 0 && <li className="org-unlinked"><header><strong>Sem vínculo</strong><span>{semVinculo.length} promotoras sem gerente nesta estrutura</span></header><ul>{semVinculo.map(cardPromotora)}</ul></li>}
              {!grupos.length && !semVinculo.length && <li className="org-empty">Nenhum resultado nesta unidade. Ajuste os filtros ou a busca.</li>}
            </ul>
          </section>;
        })}
      </div>
    </div>
    <p className="org-help">Selecione uma promotora para ver ou editar o cadastro. Use o + na foto para atualizá-la.</p>
  </section>;
}
