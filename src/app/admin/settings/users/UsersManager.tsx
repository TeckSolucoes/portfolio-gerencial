'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { deleteUser } from './actions';
import { EMPRESAS } from '@/lib/empresas';
import type { Perfil } from '@/lib/permissoes';
import { ConfirmDialog } from './Modal';
import { PERFIS, ResetPasswordDialog, UserFormDrawer, rotuloPerfil } from './UserForms';
import type { GerenteComercialOption, UserDTO } from './UserForms';
import type { Funcionalidade } from '@/lib/funcionalidades';

type SortKey = 'nome' | 'perfil';
type FiltroEmpresa = 'todas' | 'AKRK' | 'DIG' | 'nenhuma';
type Toast = { id: number; texto: string };
type ConfirmState = {
  titulo: string;
  texto: React.ReactNode;
  confirmar: string;
  executar: () => Promise<string | void>;
};

const RANK: Record<Perfil, number> = { superadmin: 0, gerente: 1, visualizador: 2 };

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const empresasEfetivas = (u: UserDTO) => (u.role === 'superadmin' ? [...EMPRESAS] : u.empresas);

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

function RowMenu({
  user,
  motivoNaoExcluir,
  onEditar,
  onSenha,
  onExcluir,
}: {
  user: UserDTO;
  motivoNaoExcluir: string | null;
  onEditar: (gatilho: HTMLElement) => void;
  onSenha: (gatilho: HTMLElement) => void;
  onExcluir: (gatilho: HTMLElement) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const itens = () => Array.from(raiz.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!aberto) return;
    itens()[0]?.focus();
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  }

  function teclado(e: React.KeyboardEvent) {
    const lista = itens();
    const i = lista.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') lista[(i + 1) % lista.length]?.focus();
    else if (e.key === 'ArrowUp') lista[(i - 1 + lista.length) % lista.length]?.focus();
    else if (e.key === 'Home') lista[0]?.focus();
    else if (e.key === 'End') lista[lista.length - 1]?.focus();
    else if (e.key === 'Escape') fechar();
    else if (e.key === 'Tab') setAberto(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  }

  function acionar(fn: (g: HTMLElement) => void) {
    setAberto(false);
    if (botao.current) fn(botao.current);
  }

  return (
    <div className="adm-menu" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="adm-icon-btn"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Ações de ${user.displayName}`}
        onClick={() => setAberto((v) => !v)}
        onKeyDown={(e) => {
          if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !aberto) {
            e.preventDefault();
            setAberto(true);
          }
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </button>
      {aberto && (
        <div className="adm-menu-list" role="menu" aria-label={`Ações de ${user.displayName}`} onKeyDown={teclado}>
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => acionar(onEditar)}>
            Editar
          </button>
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => acionar(onSenha)}>
            Redefinir senha
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="is-danger"
            aria-disabled={motivoNaoExcluir ? true : undefined}
            title={motivoNaoExcluir ?? undefined}
            onClick={() => {
              if (!motivoNaoExcluir) acionar(onExcluir);
            }}
          >
            Excluir
            {motivoNaoExcluir && <small>{motivoNaoExcluir}</small>}
          </button>
        </div>
      )}
    </div>
  );
}

export function UsersManager({ users, currentUserId, permissoesPerfil, gerentesComerciais }: { users: UserDTO[]; currentUserId: string; permissoesPerfil: Record<Perfil, Record<Funcionalidade, boolean>>; gerentesComerciais: GerenteComercialOption[] }) {
  const [busca, setBusca] = useState('');
  const [fPerfil, setFPerfil] = useState<Perfil | 'todos'>('todos');
  const [fEmpresa, setFEmpresa] = useState<FiltroEmpresa>('todas');
  const [ordem, setOrdem] = useState<{ chave: SortKey; asc: boolean }>({ chave: 'nome', asc: true });
  const [drawer, setDrawer] = useState<{ user: UserDTO | null } | null>(null);
  const [senhaDe, setSenhaDe] = useState<UserDTO | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const retorno = useRef<HTMLElement | null>(null);
  const botaoNovo = useRef<HTMLButtonElement>(null);

  const totalSuper = users.filter((u) => u.role === 'superadmin').length;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  function devolverFoco() {
    setTimeout(() => {
      const alvo = retorno.current;
      (alvo && alvo.isConnected ? alvo : botaoNovo.current)?.focus();
    }, 0);
  }

  const avisar = (texto: string) => setToast({ id: Date.now(), texto });

  const contagem = useMemo(() => {
    const perfil: Record<Perfil, number> = { superadmin: 0, gerente: 0, visualizador: 0 };
    const empresa: Record<FiltroEmpresa, number> = { todas: users.length, AKRK: 0, DIG: 0, nenhuma: 0 };
    for (const u of users) {
      perfil[u.role] += 1;
      const ef = empresasEfetivas(u);
      if (ef.length === 0) empresa.nenhuma += 1;
      for (const e of ef) empresa[e] += 1;
    }
    return { perfil, empresa };
  }, [users]);

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    const lista = users.filter((u) => {
      if (q && !normalizar(`${u.displayName} ${u.email}`).includes(q)) return false;
      if (fPerfil !== 'todos' && u.role !== fPerfil) return false;
      if (fEmpresa === 'nenhuma') return empresasEfetivas(u).length === 0;
      if (fEmpresa !== 'todas') return empresasEfetivas(u).includes(fEmpresa);
      return true;
    });
    const dir = ordem.asc ? 1 : -1;
    return lista.sort((a, b) => {
      const porNome = a.displayName.localeCompare(b.displayName, 'pt-BR');
      const c = ordem.chave === 'perfil' ? RANK[a.role] - RANK[b.role] || porNome : porNome;
      return c * dir;
    });
  }, [users, busca, fPerfil, fEmpresa, ordem]);

  const filtrando = busca.trim() !== '' || fPerfil !== 'todos' || fEmpresa !== 'todas';
  const limpar = () => {
    setBusca('');
    setFPerfil('todos');
    setFEmpresa('todas');
  };

  const ordenarPor = (chave: SortKey) => setOrdem((o) => ({ chave, asc: o.chave === chave ? !o.asc : true }));
  const ariaSort = (chave: SortKey) => (ordem.chave === chave ? (ordem.asc ? 'ascending' : 'descending') : 'none');

  const ultimoSuper = (u: UserDTO) => u.role === 'superadmin' && totalSuper === 1;
  const motivoNaoExcluir = (u: UserDTO) =>
    u.id === currentUserId ? 'Você não pode excluir o próprio usuário.' : ultimoSuper(u) ? 'Único superadmin do sistema.' : null;

  function abrir(u: UserDTO | null, gatilho: HTMLElement | null) {
    retorno.current = gatilho;
    setDrawer({ user: u });
  }

  function pedirExclusao(u: UserDTO, gatilho: HTMLElement) {
    retorno.current = gatilho;
    setConfirmacao({
      titulo: `Excluir ${u.displayName}?`,
      texto: (
        <>
          O acesso de <strong>{u.email}</strong> será removido e o usuário não poderá mais entrar. Esta ação não pode ser
          desfeita.
        </>
      ),
      confirmar: 'Excluir usuário',
      executar: async () => {
        const resultado = await deleteUser(u.id);
        if (!resultado.ok) return resultado.error;
        setConfirmacao(null);
        avisar(`${u.displayName} foi excluído.`);
        devolverFoco();
      },
    });
  }

  function chipFiltro<T extends string>(rotulo: string, valor: T, atual: T, n: number, set: (v: T) => void) {
    const on = valor === atual;
    return (
      <button key={valor} type="button" className={`adm-fchip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => set(valor)}>
        {rotulo}
        <span className="adm-fchip-n">{n}</span>
      </button>
    );
  }

  return (
    <>
      <div className="adm-pagehead">
        <p className="adm-pagehead-sub">
          {users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
        </p>
        <button ref={botaoNovo} type="button" className="btn btn-primary" onClick={(e) => abrir(null, e.currentTarget)}>
          + Novo usuário
        </button>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search">
          <label className="adm-sr" htmlFor="adm-busca">Buscar por nome ou e-mail</label>
          <input
            id="adm-busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            autoComplete="off"
          />
        </div>
        <div className="adm-filters">
          <div className="adm-fgroup" role="group" aria-label="Filtrar por perfil">
            {chipFiltro('Todos', 'todos', fPerfil, users.length, setFPerfil)}
            {PERFIS.slice()
              .reverse()
              .map((p) => chipFiltro(p.label, p.value, fPerfil, contagem.perfil[p.value], setFPerfil))}
          </div>
          <div className="adm-fgroup" role="group" aria-label="Filtrar por empresa">
            {chipFiltro('Todas', 'todas' as FiltroEmpresa, fEmpresa, contagem.empresa.todas, setFEmpresa)}
            {EMPRESAS.map((e) => chipFiltro(e, e as FiltroEmpresa, fEmpresa, contagem.empresa[e], setFEmpresa))}
            {chipFiltro('Sem empresa', 'nenhuma', fEmpresa, contagem.empresa.nenhuma, setFEmpresa)}
          </div>
          {filtrando && (
            <button type="button" className="adm-link-btn" onClick={limpar}>
              Limpar filtros
            </button>
          )}
        </div>
        <p className="adm-count" role="status" aria-live="polite">
          {filtrando ? `${visiveis.length} de ${users.length} usuários` : `${users.length} usuários`}
        </p>
      </div>

      {visiveis.length === 0 ? (
        <div className="adm-empty-state">
          <strong>Nenhum usuário encontrado</strong>
          <span>Ajuste a busca ou os filtros para ver mais resultados.</span>
          <button type="button" className="btn btn-secondary" onClick={limpar}>
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-utable">
            <caption className="adm-sr">Usuários cadastrados</caption>
            <thead>
              <tr>
                <th scope="col" aria-sort={ariaSort('nome')}>
                  <button type="button" className="adm-sort" onClick={() => ordenarPor('nome')}>
                    Usuário <span aria-hidden="true">{ordem.chave === 'nome' ? (ordem.asc ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
                <th scope="col" aria-sort={ariaSort('perfil')}>
                  <button type="button" className="adm-sort" onClick={() => ordenarPor('perfil')}>
                    Perfil <span aria-hidden="true">{ordem.chave === 'perfil' ? (ordem.asc ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
                <th scope="col">Empresas</th>
                <th scope="col">Escopo</th>
                <th scope="col">Última localização</th>
                <th scope="col" className="adm-col-actions">
                  <span className="adm-sr">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((u) => (
                <tr key={u.id}>
                  <td data-label="Usuário">
                    <div className="adm-usercell">
                      <span className="adm-avatar" aria-hidden="true">
                        {iniciais(u.displayName)}
                      </span>
                      <div className="adm-usertext">
                        <button type="button" className="adm-user-link" onClick={(e) => abrir(u, e.currentTarget)}>
                          {u.displayName}
                        </button>
                        <span className="adm-user-email">
                          {u.email}
                          {u.id === currentUserId && <em className="adm-you">você</em>}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Perfil">
                    <span className={`adm-badge adm-badge-${u.role}`}>{rotuloPerfil(u.role)}</span>
                  </td>
                  <td data-label="Empresas">
                    <div className="adm-chips">
                      {u.role === 'superadmin' ? (
                        <span className="adm-chip">Todas</span>
                      ) : u.empresas.length ? (
                        u.empresas.map((e) => (
                          <span key={e} className="adm-chip">
                            {e}
                          </span>
                        ))
                      ) : (
                        <span className="adm-chip adm-chip-warn">Nenhuma</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Escopo" className="adm-scope">
                    {u.role !== 'superadmin' && u.gerenteComercialNome
                      ? `${u.gerenteComercialEmpresa} · ${u.gerenteComercialNome}`
                      : u.role !== 'superadmin' && u.escopoGerente ? `Legado · ${u.escopoGerente}` : '—'}
                  </td>
                  <td data-label="Última localização" className="adm-location">
                    {u.ultimaLatitude !== null && u.ultimaLongitude !== null ? (
                      <>
                        <span>{u.ultimaLatitude.toFixed(6)}, {u.ultimaLongitude.toFixed(6)}</span>
                        {u.ultimoAcessoEm && <small>{new Date(u.ultimoAcessoEm).toLocaleString('pt-BR')}</small>}
                      </>
                    ) : 'Não informada'}
                  </td>
                  <td className="adm-col-actions">
                    <Link
                      href={`/admin/settings/users/${u.id}/historico`}
                      className="adm-icon-btn"
                      aria-label={`Ver histórico de ${u.displayName}`}
                      title="Histórico completo"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" />
                      </svg>
                    </Link>
                    <RowMenu
                      user={u}
                      motivoNaoExcluir={motivoNaoExcluir(u)}
                      onEditar={(g) => abrir(u, g)}
                      onSenha={(g) => {
                        retorno.current = g;
                        setSenhaDe(u);
                      }}
                      onExcluir={(g) => pedirExclusao(u, g)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawer && (
        <UserFormDrawer
          key={drawer.user?.id ?? 'novo'}
          user={drawer.user}
          ultimoSuperadmin={drawer.user ? ultimoSuper(drawer.user) : false}
          onClose={() => {
            setDrawer(null);
            devolverFoco();
          }}
          onDone={(m) => {
            setDrawer(null);
            avisar(m);
            devolverFoco();
          }}
          pedirConfirmacao={(c) =>
            setConfirmacao({
              titulo: c.titulo,
              texto: c.texto,
              confirmar: c.confirmar,
              executar: async () => {
                await c.executar();
                setConfirmacao(null);
              },
            })
          }
          permissoesPerfil={permissoesPerfil}
          gerentesComerciais={gerentesComerciais}
        />
      )}

      {senhaDe && (
        <ResetPasswordDialog
          user={senhaDe}
          onClose={() => {
            setSenhaDe(null);
            devolverFoco();
          }}
          onDone={(m) => {
            setSenhaDe(null);
            avisar(m);
            devolverFoco();
          }}
        />
      )}

      {confirmacao && (
        <ConfirmDialog
          titulo={confirmacao.titulo}
          confirmar={confirmacao.confirmar}
          onConfirm={confirmacao.executar}
          onCancel={() => setConfirmacao(null)}
        >
          {confirmacao.texto}
        </ConfirmDialog>
      )}

      <div className="adm-toasts" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className="adm-toast">
            {toast.texto}
            <button type="button" className="adm-toast-x" onClick={() => setToast(null)} aria-label="Dispensar aviso">
              ×
            </button>
          </div>
        )}
      </div>
    </>
  );
}
