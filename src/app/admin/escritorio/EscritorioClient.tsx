'use client';
import { useEffect, useRef, useState } from 'react';
import { atualizarEscritorio, enviarMensagem } from './actions';
import type { Sala, EstadoEscritorio } from '@/lib/escritorio/dominio';
const iniciais = (nome: string) => nome.split(' ').slice(0, 2).map(n => n[0]).join('');
export function EscritorioClient({ salas }: { salas: Sala[] }) {
  const [salaId, setSalaId] = useState('recepcao');
  const [estado, setEstado] = useState<EstadoEscritorio>({ presencas: [], mensagens: [] });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const sessao = useRef('');
  const atual = salas.find(s => s.id === salaId)!;
  useEffect(() => {
    if (!sessao.current) sessao.current = crypto.randomUUID();
    let ativo = true;
    let emCurso = false;
    async function atualizar() {
      if (emCurso) return;
      emCurso = true;
      try {
        const dados = await atualizarEscritorio(salaId, sessao.current);
        if (ativo) { setEstado(dados); setErro(''); setCarregando(false); }
      } catch { if (ativo) { setErro('Não foi possível atualizar o escritório. Tentaremos novamente.'); setEstado({ presencas: [], mensagens: [] }); setCarregando(false); } }
      finally { emCurso = false; }
    }
    void atualizar();
    const timer = setInterval(atualizar, 15000);
    return () => { ativo = false; clearInterval(timer); };
  }, [salaId]);
  async function enviar(event: React.FormEvent) {
    event.preventDefault(); if (enviando) return; setEnviando(true);
    try {
      await enviarMensagem(salaId, texto); setTexto('');
      setEstado(await atualizarEscritorio(salaId, sessao.current)); setErro('');
    } catch { setErro('Não foi possível enviar. Confira sua conexão e tente novamente.'); }
    finally { setEnviando(false); }
  }
  return <section className="ev-page">
    <header className="ev-header"><div><span className="ev-eyebrow">PESSOAS & CONEXÕES</span><h1>Escritório Virtual</h1><p>Encontre os times, entre em uma sala e converse.</p></div><span className="ev-online">● {new Set(estado.presencas.map(p => p.userId)).size} online agora</span></header>
    <p className="ev-disclaimer">Presença de usuários conectados a esta página, atualizada a cada 15 segundos e expirada após 90 segundos sem conexão. Os integrantes cadastrados não representam presença online.</p>
    {erro && <p role="alert" className="ev-error">{erro}</p>}
    <div className="ev-layout"><section className="ev-map" aria-label="Salas do escritório"><div className="ev-map-title"><h2>Nosso escritório</h2><span>{salas.length - 1} equipes</span></div>
      <div className="ev-rooms">{salas.map((sala, i) => {
        const presentes = estado.presencas.filter(p => p.sala === sala.id);
        return <button key={sala.id} className={`ev-room ${sala.id === salaId ? 'ev-selected' : ''}`} aria-pressed={sala.id === salaId} disabled={enviando} onClick={() => { if (sala.id === salaId) return; setSalaId(sala.id); setCarregando(true); setEstado(e => ({ ...e, mensagens: [] })); }}>
          <span className="ev-room-label">{sala.empresa}</span><strong>{sala.nome}</strong>
          <span className="ev-floor" aria-hidden="true"><span className="ev-plant">✿</span><span className="ev-table">{i === 0 ? '☕' : '▱'}</span><span className="ev-chair ev-chair-one" /><span className="ev-chair ev-chair-two" />{presentes.slice(0, 4).map(p => <span key={p.userId} className="ev-avatar">{iniciais(p.nome)}</span>)}</span>
          <span className="ev-room-footer">{sala.pessoas.length} integrantes <span>{presentes.length} online</span></span>
        </button>;
      })}</div>{salas.length === 1 && <p>Cadastre equipes na Estrutura Comercial para criar suas salas.</p>}</section>
      <aside className="ev-sidebar"><section><span className="ev-eyebrow">VOCÊ ESTÁ EM</span><h2>{atual.nome}</h2><p className="ev-subtle">{atual.empresa}</p><h3>Conectados à sala</h3><div className="ev-connected">{estado.presencas.filter(p => p.sala === salaId).map(p => <span key={p.userId}><b className="ev-dot">●</b> {p.nome}</span>)}{carregando && <span role="status">Conectando…</span>}</div>
      <details><summary>Integrantes cadastrados ({atual.pessoas.length})</summary><ul>{atual.pessoas.map(p => <li key={p}>{p}</li>)}</ul>{!atual.pessoas.length && <p>Sala de encontro de todos os times.</p>}</details></section>
      <section className="ev-chat"><h3>Conversa da sala</h3><p className="ev-subtle">Mensagens visíveis aos administradores com acesso ao escritório.</p><ol className="ev-messages" aria-label="Últimas mensagens">{estado.mensagens.map(m => <li key={m.id}><div><strong>{m.nome}</strong><time dateTime={m.criadoEm}>{new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</time></div><p>{m.texto}</p></li>)}</ol>{!carregando && !estado.mensagens.length && <p className="ev-subtle">Comece uma conversa nesta sala.</p>}
      <form onSubmit={enviar}><label htmlFor="ev-mensagem">Sua mensagem</label><textarea disabled={enviando} id="ev-mensagem" maxLength={1000} required value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escreva para o time…" /><button disabled={enviando || !texto.trim() || carregando} type="submit">{enviando ? 'Enviando…' : 'Enviar mensagem'}</button></form></section></aside>
    </div></section>;
}


