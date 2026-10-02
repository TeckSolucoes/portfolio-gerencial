'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { CLASSIFICACOES, SITUACOES } from '@/lib/sistemas';
import { removerSistema, salvarSistema } from './actions';

export interface SistemaTela {
  id: string;
  nome: string;
  url: string | null;
  classificacao: string;
  categoria: string;
  empresa: string | null;
  responsavel: string | null;
  situacao: string;
  descricao: string | null;
  atualizadoPor: string | null;
  atualizadoEm: string;
}

type Filtro = 'todos' | keyof typeof CLASSIFICACOES;
const rotulo = (mapa: Record<string, string>, chave: string) => mapa[chave] ?? chave;
const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export function Inventario({ sistemas, podeEditar }: { sistemas: SistemaTela[]; podeEditar: boolean }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [categoria, setCategoria] = useState('');
  const [editando, setEditando] = useState<SistemaTela | 'novo' | null>(null);
  const [erro, setErro] = useState('');
  const [pendente, start] = useTransition();
  const dialogo = useRef<HTMLDialogElement>(null);

  const categorias = useMemo(() => [...new Set(sistemas.map((s) => s.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [sistemas]);
  const empresas = useMemo(() => [...new Set(sistemas.map((s) => s.empresa).filter((e): e is string => Boolean(e)))].sort(), [sistemas]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return sistemas.filter(
      (s) =>
        (filtro === 'todos' || s.classificacao === filtro) &&
        (!categoria || s.categoria === categoria) &&
        (!termo || [s.nome, s.categoria, s.empresa, s.responsavel, s.descricao, s.url].join(' ').toLocaleLowerCase('pt-BR').includes(termo)),
    );
  }, [busca, categoria, filtro, sistemas]);

  const grupos = useMemo(() => {
    const m = new Map<string, SistemaTela[]>();
    for (const s of visiveis) m.set(s.categoria, [...(m.get(s.categoria) ?? []), s]);
    return [...m].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [visiveis]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (editando && !d.open) d.showModal();
    if (!editando && d.open) d.close();
  }, [editando]);

  const abrir = (s: SistemaTela | 'novo') => {
    setErro('');
    setEditando(s);
  };

  // onSubmit em vez de <form action>: no React 19 o action limpa o formulário a cada envio, e um
  // erro de validação apagaria tudo o que a pessoa digitou.
  const salvar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    start(async () => {
      setErro('');
      const r = await salvarSistema(formData);
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  };

  const remover = (s: SistemaTela) => {
    if (!window.confirm(`Remover "${s.nome}" do inventário? Isso não pode ser desfeito.`)) return;
    start(async () => {
      const r = await removerSistema(s.id);
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  };

  const atual = editando === 'novo' ? null : editando;

  return (
    <>
      <div className="sis-barra">
        <div className="sis-filtros" role="group" aria-label="Filtrar por classificação">
          {(['todos', 'interno', 'externo'] as Filtro[]).map((f) => (
            <button key={f} type="button" className="sis-pill" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : CLASSIFICACOES[f]} <b>{f === 'todos' ? sistemas.length : sistemas.filter((s) => s.classificacao === f).length}</b>
            </button>
          ))}
        </div>
        <label className="sis-select">
          <span className="sr-only">Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="sis-busca">
          <span className="sr-only">Buscar sistema</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, empresa, responsável ou link" />
        </label>
        {podeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => abrir('novo')}>
            + Novo sistema
          </button>
        )}
      </div>

      <p className="sis-resultado" role="status">
        {visiveis.length} de {sistemas.length} sistemas
      </p>

      {grupos.length === 0 ? (
        <p className="sis-vazio">Nenhum sistema corresponde aos filtros.</p>
      ) : (
        grupos.map(([cat, lista]) => (
          <section key={cat} className="sis-grupo">
            <h2>
              {cat} <span>{lista.length}</span>
            </h2>
            <ul className="sis-lista">
              {lista.map((s) => (
                <li key={s.id} className={`sis-item c-${s.classificacao} s-${s.situacao}`}>
                  <div className="sis-id">
                    <h3>{s.nome}</h3>
                    <p>{[s.empresa, s.responsavel && `Resp.: ${s.responsavel}`].filter(Boolean).join(' · ') || '—'}</p>
                    {s.descricao && <p className="sis-desc">{s.descricao}</p>}
                  </div>
                  <div className="sis-tags">
                    <span className="sis-tag t-class">{rotulo(CLASSIFICACOES, s.classificacao)}</span>
                    {s.situacao !== 'ativo' && <span className="sis-tag t-sit">{rotulo(SITUACOES, s.situacao)}</span>}
                  </div>
                  <div className="sis-acoes">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="sis-link" title={s.url}>
                        Acessar <small>{host(s.url)}</small> ↗
                      </a>
                    ) : (
                      <span className="sis-semlink">Sem link</span>
                    )}
                    {podeEditar && (
                      <button type="button" className="sis-editar" onClick={() => abrir(s)} aria-label={`Editar ${s.nome}`}>
                        Editar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {podeEditar && (
        <dialog ref={dialogo} className="sis-modal" aria-labelledby="sis-modal-titulo" onClose={() => setEditando(null)}>
          <form key={atual?.id ?? 'novo'} onSubmit={salvar} className="sis-form">
            <header className="span-2">
              <h2 id="sis-modal-titulo">{atual ? 'Editar sistema' : 'Novo sistema'}</h2>
              <button type="button" className="sis-fechar" aria-label="Fechar" onClick={() => setEditando(null)}>
                ×
              </button>
            </header>
            {atual && <input type="hidden" name="id" value={atual.id} />}
            <label className="span-2">
              Nome
              <input name="nome" required maxLength={120} defaultValue={atual?.nome} autoFocus />
            </label>
            <label className="span-2">
              Link de acesso
              <input name="url" maxLength={600} defaultValue={atual?.url ?? ''} placeholder="https://" inputMode="url" />
            </label>
            <label>
              Classificação
              <select name="classificacao" defaultValue={atual?.classificacao ?? 'interno'}>
                {Object.entries(CLASSIFICACOES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Situação
              <select name="situacao" defaultValue={atual?.situacao ?? 'ativo'}>
                {Object.entries(SITUACOES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <input name="categoria" required maxLength={60} list="sis-categorias" defaultValue={atual?.categoria} />
            </label>
            <label>
              Empresa
              <input name="empresa" maxLength={80} list="sis-empresas" defaultValue={atual?.empresa ?? ''} />
            </label>
            <label className="span-2">
              Responsável
              <input name="responsavel" maxLength={80} defaultValue={atual?.responsavel ?? ''} />
            </label>
            <label className="span-2">
              Descrição
              <textarea name="descricao" maxLength={400} rows={3} defaultValue={atual?.descricao ?? ''} />
            </label>
            <datalist id="sis-categorias">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="sis-empresas">
              {empresas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {atual && (
              <p className="span-2 sis-meta">
                Atualizado em {new Date(atual.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}
                {atual.atualizadoPor ? ` por ${atual.atualizadoPor}` : ''}
              </p>
            )}
            {erro && (
              <p className="span-2 sis-erro" role="alert">
                {erro}
              </p>
            )}
            <footer className="span-2">
              {atual && (
                <button type="button" className="btn btn-ghost sis-remover" onClick={() => remover(atual)} disabled={pendente}>
                  Remover
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={pendente}>
                {pendente ? 'Salvando…' : 'Salvar'}
              </button>
            </footer>
          </form>
        </dialog>
      )}
    </>
  );
}
