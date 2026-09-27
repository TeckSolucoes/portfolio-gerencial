'use client';

import { useId, useState, useTransition } from 'react';
import { createUser, updateUser } from './actions';
import { PasswordField } from '@/components/PasswordField';
import { EMPRESAS } from '@/lib/empresas';
import type { Empresa } from '@/lib/empresas';
import type { Perfil } from '@/lib/permissoes';
import { Modal } from './Modal';
import { FUNCIONALIDADES, type Funcionalidade } from '@/lib/funcionalidades';

export type UserDTO = {
  id: string;
  email: string;
  displayName: string;
  displayTitle: string | null;
  role: Perfil;
  empresas: Empresa[];
  escopoGerente: string | null;
  ultimaLatitude: number | null;
  ultimaLongitude: number | null;
  ultimoAcessoEm: string | null;
  permissoes: Partial<Record<Funcionalidade, boolean>>;
};

export const PERFIS: { value: Perfil; label: string; descricao: string }[] = [
  {
    value: 'visualizador',
    label: 'Visualizador',
    descricao: 'Somente leitura: vê relatório e monitoramento das empresas marcadas e o Diário Oficial. Não entra na Administração.',
  },
  {
    value: 'gerente',
    label: 'Gerente',
    descricao:
      'Vê o mesmo que o visualizador e entra na área Administração, mas só o superadmin gerencia usuários e metas.',
  },
  {
    value: 'superadmin',
    label: 'Superadmin',
    descricao: 'Vê todas as empresas e gerencia usuários, metas e workers.',
  },
];

const RANK: Record<Perfil, number> = { visualizador: 0, gerente: 1, superadmin: 2 };
export const rotuloPerfil = (p: Perfil) => PERFIS.find((x) => x.value === p)?.label ?? p;

type Campo = 'name' | 'title' | 'email' | 'password' | 'role' | 'empresas' | 'escopo';
type Erros = Partial<Record<Campo | 'form', string>>;

// As actions devolvem uma única mensagem; aqui ela vira erro no campo certo.
function erroDoServidor(msg: string): Erros {
  if (/^Preencha e-mail/i.test(msg)) return { form: msg };
  if (/e-mail/i.test(msg)) return { email: msg };
  if (/senha/i.test(msg)) return { password: msg };
  if (/nome do gerente/i.test(msg)) return { escopo: msg };
  if (/superadmin/i.test(msg)) return { role: msg };
  if (/empresa/i.test(msg)) return { empresas: msg };
  if (/nome de exibi/i.test(msg)) return { name: msg };
  return { form: msg };
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Help({ id, hint, error }: { id: string; hint?: React.ReactNode; error?: string }) {
  return (
    <p id={`${id}-help`} className={error ? 'adm-help is-error' : 'adm-help'} role={error ? 'alert' : undefined}>
      {error ?? hint}
    </p>
  );
}

const ctl = (id: string, error?: string) => ({
  id,
  'aria-describedby': `${id}-help`,
  'aria-invalid': error ? (true as const) : undefined,
});

export function UserFormDrawer({
  user,
  ultimoSuperadmin,
  onClose,
  onDone,
  pedirConfirmacao,
  permissoesPerfil,
}: {
  user: UserDTO | null;
  ultimoSuperadmin: boolean;
  onClose: () => void;
  onDone: (mensagem: string) => void;
  pedirConfirmacao: (c: { titulo: string; texto: string; confirmar: string; executar: () => Promise<void> }) => void;
  permissoesPerfil: Record<Perfil, Record<Funcionalidade, boolean>>;
}) {
  const base = useId();
  const criando = user === null;
  const [role, setRole] = useState<Perfil>(user?.role ?? 'visualizador');
  const [empresas, setEmpresas] = useState<Empresa[]>(user?.empresas ?? []);
  const [erros, setErros] = useState<Erros>({});
  const [pending, startTransition] = useTransition();
  const ehSuper = role === 'superadmin';
  const semEmpresa = !ehSuper && empresas.length === 0;
  const idDe = (c: Campo) => `${base}-${c}`;

  function validar(fd: FormData): Erros {
    const e: Erros = {};
    if (!String(fd.get('displayName') ?? '').trim()) e.name = 'Informe o nome de exibição.';
    if (criando) {
      const mail = String(fd.get('email') ?? '').trim();
      if (!mail) e.email = 'Informe o e-mail.';
      else if (!EMAIL_OK.test(mail)) e.email = 'E-mail inválido.';
      const senha = String(fd.get('password') ?? '');
      if (!senha) e.password = 'Defina a senha inicial.';
      else if (senha.length < 8) e.password = 'A senha precisa ter pelo menos 8 caracteres.';
    }
    if (String(fd.get('escopoGerente') ?? '').trim().length > 60) e.escopo = 'Nome do gerente muito longo (máx. 60).';
    return e;
  }

  async function executar(fd: FormData) {
    const r = criando ? await createUser(undefined, fd) : await updateUser(user.id, undefined, fd);
    if (r?.error) {
      const e = erroDoServidor(r.error);
      setErros(e);
      return;
    }
    onDone(criando ? 'Usuário criado.' : 'Alterações salvas.');
  }

  function enviar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const e = validar(fd);
    setErros(e);
    const primeiro = (['name', 'email', 'password', 'escopo'] as Campo[]).find((c) => e[c]);
    if (primeiro) {
      document.getElementById(idDe(primeiro))?.focus();
      return;
    }
    if (user && RANK[role] < RANK[user.role]) {
      pedirConfirmacao({
        titulo: `Rebaixar ${user.displayName}?`,
        texto: `O perfil passa de ${rotuloPerfil(user.role)} para ${rotuloPerfil(role)}. O acesso muda assim que você confirmar.`,
        confirmar: 'Rebaixar e salvar',
        executar: () => new Promise<void>((res) => startTransition(async () => { await executar(fd); res(); })),
      });
      return;
    }
    startTransition(() => executar(fd));
  }

  function alternar(e: Empresa) {
    setEmpresas((atual) => (atual.includes(e) ? atual.filter((x) => x !== e) : [...atual, e]));
  }

  const titleId = `${base}-titulo`;
  return (
    <Modal variant="drawer" onClose={onClose} labelledBy={titleId}>
      <form className="adm-drawer-form" onSubmit={enviar} noValidate>
        <header className="adm-drawer-head">
          <div>
            <h2 id={titleId} className="adm-drawer-title">
              {criando ? 'Novo usuário' : 'Editar usuário'}
            </h2>
            {!criando && <p className="adm-drawer-sub">{user.email}</p>}
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Fechar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="adm-drawer-body">
          <div className="adm-grid">
            <div className="adm-field adm-span-2">
              <label className="adm-label" htmlFor={idDe('name')}>Nome de exibição</label>
              <input
                {...ctl(idDe('name'), erros.name)}
                name="displayName"
                type="text"
                defaultValue={user?.displayName ?? ''}
                placeholder="Nome completo"
                autoComplete="off"
                autoFocus
              />
              <Help id={idDe('name')} error={erros.name} />
            </div>
            <div className="adm-field adm-span-2">
              <label className="adm-label" htmlFor={idDe('title')}>Cargo/título (opcional)</label>
              <input
                id={idDe('title')}
                name="displayTitle"
                type="text"
                defaultValue={user?.displayTitle ?? ''}
                placeholder="Ex.: Dono do Grupo"
                autoComplete="off"
              />
            </div>
            <div className={criando ? 'adm-field' : 'adm-field adm-span-2'}>
              <label className="adm-label" htmlFor={idDe('email')}>E-mail</label>
              {criando ? (
                <input
                  {...ctl(idDe('email'), erros.email)}
                  name="email"
                  type="email"
                  placeholder="pessoa@tecksolucoes.com.br"
                  autoComplete="off"
                />
              ) : (
                <input id={idDe('email')} type="email" value={user.email} readOnly aria-describedby={`${idDe('email')}-help`} />
              )}
              <Help id={idDe('email')} error={erros.email} hint={criando ? undefined : 'O e-mail não pode ser alterado.'} />
            </div>
            {criando && (
              <div className="adm-field">
                <label className="adm-label" htmlFor={idDe('password')}>Senha inicial</label>
                <PasswordField
                  id={idDe('password')}
                  name="password"
                  autoComplete="new-password"
                  describedBy={`${idDe('password')}-help`}
                  invalid={!!erros.password}
                />
                <Help id={idDe('password')} error={erros.password} hint="Mínimo de 8 caracteres." />
              </div>
            )}
          </div>

          <fieldset className="adm-fieldset" aria-describedby={`${idDe('role')}-help`}>
            <legend className="adm-label">Perfil</legend>
            <div className="adm-radio-stack">
              {PERFIS.map((p) => {
                const bloqueado = ultimoSuperadmin && p.value !== 'superadmin';
                return (
                  <label key={p.value} className={`adm-radio-card${role === p.value ? ' is-on' : ''}${bloqueado ? ' is-disabled' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value={p.value}
                      checked={role === p.value}
                      disabled={bloqueado}
                      onChange={() => setRole(p.value)}
                    />
                    <span className="adm-radio-text">
                      <strong>{p.label}</strong>
                      <span>{p.descricao}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Help
              id={idDe('role')}
              error={erros.role}
              hint={ultimoSuperadmin ? 'Único superadmin: promova outro usuário antes de rebaixar este.' : undefined}
            />
          </fieldset>

          <fieldset className="adm-fieldset">
            <legend className="adm-label">Funcionalidades</legend>
            <p className="adm-help">Herdar segue o check do perfil. Use liberar ou bloquear somente para exceções deste usuário.</p>
            <div className="adm-permission-list">
              {FUNCIONALIDADES.map((f) => {
                const atual = user?.permissoes[f.chave];
                return <label key={f.chave} className="adm-permission-row">
                  <span><strong>{f.nome}</strong><small>Perfil {permissoesPerfil[role][f.chave] ? 'libera' : 'bloqueia'}</small></span>
                  <select name={`permissao_${f.chave}`} defaultValue={atual === undefined ? 'herdar' : atual ? 'liberar' : 'bloquear'}>
                    <option value="herdar">Herdar do perfil</option>
                    <option value="liberar">Liberar</option>
                    <option value="bloquear">Bloquear</option>
                  </select>
                </label>;
              })}
            </div>
          </fieldset>

          <fieldset className="adm-fieldset" aria-describedby={`${idDe('empresas')}-help`}>
            <legend className="adm-label">Empresas que pode ver</legend>
            <div className="adm-check-grid">
              {EMPRESAS.map((e) => (
                <label key={e} className="adm-check-card">
                  <input
                    type="checkbox"
                    name="empresas"
                    value={e}
                    checked={ehSuper || empresas.includes(e)}
                    disabled={ehSuper}
                    onChange={() => alternar(e)}
                  />
                  <span>{e}</span>
                </label>
              ))}
            </div>
            <Help
              id={idDe('empresas')}
              error={erros.empresas}
              hint={ehSuper ? 'Superadmin vê todas as empresas sempre.' : undefined}
            />
            {semEmpresa && (
              <p className="adm-warn" role="note">
                Sem empresa marcada, este usuário não vê relatórios nem monitoramento.
              </p>
            )}
          </fieldset>

          <div className="adm-field">
            <label className="adm-label" htmlFor={idDe('escopo')}>Restringir à turma do gerente (opcional)</label>
            <input
              {...ctl(idDe('escopo'), erros.escopo)}
              name="escopoGerente"
              type="text"
              defaultValue={user?.escopoGerente ?? ''}
              placeholder="Primeiro nome, ex.: Luana"
              disabled={ehSuper}
              autoComplete="off"
            />
            <Help
              id={idDe('escopo')}
              error={erros.escopo}
              hint={
                ehSuper
                  ? 'Não se aplica a superadmin.'
                  : 'Em branco, vê a empresa inteira; preenchido, só a turma desse gerente (sem a visão Geral e sem Monitoramento).'
              }
            />
          </div>
        </div>

        <footer className="adm-drawer-foot">
          <p className="adm-msg adm-msg-error" role="alert">
            {erros.form}
          </p>
          <div className="adm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Salvando…' : criando ? 'Criar usuário' : 'Salvar alterações'}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}

export function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: UserDTO;
  onClose: () => void;
  onDone: (mensagem: string) => void;
}) {
  const id = useId();
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function enviar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const senha = String(new FormData(ev.currentTarget).get('newPassword') ?? '');
    if (senha.length < 8) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.');
      document.getElementById(`${id}-pw`)?.focus();
      return;
    }
    setErro(undefined);
    // Reaproveita updateUser (mesma validação e checagem de superadmin) reenviando os dados atuais.
    const fd = new FormData();
    fd.set('displayName', user.displayName);
    fd.set('displayTitle', user.displayTitle ?? '');
    fd.set('role', user.role);
    user.empresas.forEach((e) => fd.append('empresas', e));
    fd.set('escopoGerente', user.escopoGerente ?? '');
    for (const [chave, permitido] of Object.entries(user.permissoes)) fd.set(`permissao_${chave}`, permitido ? 'liberar' : 'bloquear');
    fd.set('newPassword', senha);
    startTransition(async () => {
      const r = await updateUser(user.id, undefined, fd);
      if (r?.error) setErro(r.error);
      else onDone(`Senha de ${user.displayName} redefinida.`);
    });
  }

  return (
    <Modal onClose={onClose} labelledBy={`${id}-t`}>
      <form className="adm-confirm" onSubmit={enviar} noValidate>
        <h2 id={`${id}-t`} className="adm-confirm-title">
          Redefinir senha
        </h2>
        <p className="adm-confirm-body">
          Define uma nova senha para <strong>{user.displayName}</strong> ({user.email}). A senha atual deixa de valer.
        </p>
        <div className="adm-field">
          <label className="adm-label" htmlFor={`${id}-pw`}>Nova senha</label>
          <PasswordField
            id={`${id}-pw`}
            name="newPassword"
            autoComplete="new-password"
            describedBy={`${id}-pw-help`}
            invalid={!!erro}
          />
          <Help id={`${id}-pw`} error={erro} hint="Mínimo de 8 caracteres." />
        </div>
        <div className="adm-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Redefinir senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
